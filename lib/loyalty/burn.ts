import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  MIN_REDEMPTION_POINTS,
  pointsToOre,
} from "./constants";

/**
 * Redemption helpers — the spend side of the ledger.
 *
 * `validateRedemption` is a pure function used both server-side (in
 * `placeOrder`) and indirectly by the checkout UI: the UI computes
 * its preview locally; the server is the trust boundary and the only
 * place a BURN_REDEMPTION row is ever posted.
 *
 * `redeemPointsForOrder` is invoked once per order, inside the
 * placeOrder transaction. It's idempotent per `(orderId, kind)` —
 * trying to burn twice for the same order is a no-op.
 */

export type RedemptionValidation =
  | { ok: true; points: number; oreDiscount: number }
  | { ok: false; reason: RedemptionError };

export type RedemptionError =
  | "below-min"
  | "exceeds-balance"
  | "exceeds-subtotal"
  | "not-multiple"
  | "no-account";

/**
 * Pure validation — does NOT touch DB. Caller supplies the balance and
 * subtotal (in öre) so the same helper works in preview-only contexts
 * (e.g. cart drawer) as well as inside the server action.
 */
export function validateRedemption(input: {
  pointsRequested: number;
  balance: number;
  subtotalOre: number;
}): RedemptionValidation {
  const pts = Math.floor(input.pointsRequested);
  if (pts <= 0) return { ok: true, points: 0, oreDiscount: 0 }; // opt-out is fine
  if (pts < MIN_REDEMPTION_POINTS) return { ok: false, reason: "below-min" };
  if (pts % MIN_REDEMPTION_POINTS !== 0) {
    return { ok: false, reason: "not-multiple" };
  }
  if (pts > input.balance) return { ok: false, reason: "exceeds-balance" };

  const oreDiscount = pointsToOre(pts);
  // Don't let the redemption exceed the subtotal — we keep shipping
  // and tax in the customer's payable column so the order can never
  // total below zero. The cap is calculated in öre to avoid Decimal
  // float drift.
  if (oreDiscount > input.subtotalOre) {
    return { ok: false, reason: "exceeds-subtotal" };
  }
  return { ok: true, points: pts, oreDiscount };
}

/**
 * Human-readable Swedish copy for each validation reason. Keeps the
 * server action thin — `placeOrder` translates the reason code and
 * returns it back to the client untouched.
 */
export function redemptionErrorMessage(reason: RedemptionError): string {
  switch (reason) {
    case "below-min":
      return `Du behöver minst ${MIN_REDEMPTION_POINTS} poäng för att lösa in.`;
    case "not-multiple":
      return `Lös in i steg om ${MIN_REDEMPTION_POINTS} poäng.`;
    case "exceeds-balance":
      return "Du har inte så många poäng på kontot.";
    case "exceeds-subtotal":
      return "Poängen täcker mer än delsumman — sänk antalet.";
    case "no-account":
      return "Du behöver vara inloggad för att använda poäng.";
  }
}

/**
 * Post a BURN_REDEMPTION row for a freshly-created order. Idempotent:
 * if a BURN row already exists for the orderId, this returns the
 * existing snapshot without writing again.
 *
 * Returns the points actually burned. The caller is responsible for
 * setting `Order.loyaltyPointsRedeemed` and `Order.discountAmount` —
 * we keep this helper focused on the ledger.
 */
export async function redeemPointsForOrder(input: {
  orderId: string;
  userId: string;
  points: number;
  tx?: Prisma.TransactionClient;
}): Promise<number> {
  if (input.points <= 0) return 0;

  // The idempotency check, the balance guard and the ledger row must
  // all see (and commit) the same atomic snapshot. When a caller
  // already supplies a transaction we join it; otherwise we open our
  // own so the guarded decrement + ledger row can't tear apart.
  const run = async (c: Prisma.TransactionClient): Promise<number> => {
    const existing = await c.loyaltyTransaction.findFirst({
      where: { orderId: input.orderId, kind: "BURN_REDEMPTION" },
      select: { id: true, points: true },
    });
    if (existing) return Math.abs(existing.points);

    const account = await c.loyaltyAccount.findUnique({
      where: { userId: input.userId },
      select: { id: true, balance: true },
    });
    if (!account) return 0;

    // Atomic, balance-guarded debit. A stale points snapshot can ride
    // in Kustom `merchant_data` from a second checkout session opened
    // on the same balance; both sessions can later be paid. Without
    // this guard the second confirmation would burn the same points
    // again — driving the account negative and granting a discount the
    // customer didn't have the points for. The conditional updateMany
    // only decrements when the LIVE balance still covers the burn, so
    // concurrent confirmations serialize at the DB and the balance can
    // never go below zero.
    const guarded = await c.loyaltyAccount.updateMany({
      where: { id: account.id, balance: { gte: input.points } },
      data: {
        balance: { decrement: input.points },
        lastActivityAt: new Date(),
      },
    });
    if (guarded.count === 0) {
      // Live balance no longer covers this redemption — almost
      // certainly a double-spend from two checkout sessions sharing one
      // snapshot. Never burn into the negative; flag for manual
      // reconciliation (the customer already paid the discounted total
      // at Kustom).
      console.error(
        `[loyalty] CRITICAL: order ${input.orderId} (user ${input.userId}) ` +
          `claims a ${input.points}p redemption but live balance is only ` +
          `${account.balance}p — burn refused to keep the balance ` +
          `non-negative. Manual reconciliation required: the customer paid ` +
          `the discounted total at Kustom but the points were not deducted.`
      );
      return 0;
    }

    // Ledger row mirrors the guarded decrement we just applied so the
    // SUM(transactions.points) === account.balance invariant holds. We
    // intentionally bypass postTransaction here because it does an
    // *unconditional* increment — the conditional guard above is the
    // whole point, and it has already mutated the account.
    await c.loyaltyTransaction.create({
      data: {
        accountId: account.id,
        userId: input.userId,
        kind: "BURN_REDEMPTION",
        points: -input.points,
        orderId: input.orderId,
        description: "Använda poäng vid kassan",
      },
    });
    return input.points;
  };

  return input.tx ? run(input.tx) : prisma.$transaction(run);
}
