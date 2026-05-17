import { prisma } from "@/lib/prisma";
import { ensureAccount } from "./account";
import { postTransaction } from "./ledger";
import { pointsFromKr } from "./constants";

/**
 * Award points for a paid order.
 *
 * Idempotent per orderId: if an EARN_ORDER row already exists for this
 * order, this is a no-op. That makes it safe to call from both the
 * Klarna webhook and the admin "mark as paid" action without worrying
 * about double-credits.
 *
 * Guest orders (userId === null) are silently skipped — there's no
 * account to credit. If we ever want to retroactively credit when a
 * guest later creates an account with the same email, that's a separate
 * reconciliation job.
 */
export async function awardOrderPoints(orderId: string): Promise<{
  awarded: number;
  reason: "ok" | "already-awarded" | "guest" | "zero-total" | "not-found";
}> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      totalAmount: true,
      loyaltyPointsAwarded: true,
      orderNumber: true,
    },
  });
  if (!order) return { awarded: 0, reason: "not-found" };
  if (!order.userId) return { awarded: 0, reason: "guest" };
  if (order.loyaltyPointsAwarded !== null) {
    return { awarded: order.loyaltyPointsAwarded, reason: "already-awarded" };
  }

  const totalKr = parseFloat(order.totalAmount.toString());
  const points = pointsFromKr(totalKr);
  if (points <= 0) return { awarded: 0, reason: "zero-total" };

  const account = await ensureAccount(order.userId);

  await prisma.$transaction(async (tx) => {
    await postTransaction({
      accountId: account.id,
      userId: order.userId!,
      kind: "EARN_ORDER",
      points,
      orderId: order.id,
      description: `Order ${order.orderNumber}`,
      tx,
    });
    await tx.order.update({
      where: { id: order.id },
      data: { loyaltyPointsAwarded: points },
    });
  });

  return { awarded: points, reason: "ok" };
}

/**
 * Reverse a previously-paid order — both the EARN_ORDER (debit the
 * earned points back) and the BURN_REDEMPTION (credit the spent points
 * back). Idempotent on both sides via the kind+orderId existence
 * checks. We deliberately do NOT clear the cached `loyaltyPointsAwarded`
 * /`loyaltyPointsRedeemed` snapshots on Order — those remain the
 * historical record; the balance is corrected via the new ledger rows.
 */
export async function reverseOrderPoints(orderId: string): Promise<{
  earnReversed: number;
  burnRefunded: number;
  reason: "ok" | "nothing-to-reverse" | "not-found";
}> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      orderNumber: true,
      loyaltyPointsAwarded: true,
      loyaltyPointsRedeemed: true,
    },
  });
  if (!order) {
    return { earnReversed: 0, burnRefunded: 0, reason: "not-found" };
  }
  if (
    !order.userId ||
    (!order.loyaltyPointsAwarded && !order.loyaltyPointsRedeemed)
  ) {
    return { earnReversed: 0, burnRefunded: 0, reason: "nothing-to-reverse" };
  }

  const account = await prisma.loyaltyAccount.findUnique({
    where: { userId: order.userId },
    select: { id: true },
  });
  if (!account) {
    return { earnReversed: 0, burnRefunded: 0, reason: "nothing-to-reverse" };
  }

  let earnReversed = 0;
  let burnRefunded = 0;

  // Reverse the earn (debit)
  if (order.loyaltyPointsAwarded) {
    const already = await prisma.loyaltyTransaction.findFirst({
      where: { orderId: order.id, kind: "REVERSAL" },
      select: { id: true },
    });
    if (!already) {
      await postTransaction({
        accountId: account.id,
        userId: order.userId,
        kind: "REVERSAL",
        points: -order.loyaltyPointsAwarded,
        orderId: order.id,
        description: `Återförd — order ${order.orderNumber}`,
      });
      earnReversed = order.loyaltyPointsAwarded;
    }
  }

  // Refund the burn (credit). Posted as an ADJUST_ADMIN row tagged
  // with the orderId — we don't have a dedicated "burn-refund" kind,
  // and ADJUST with description carries enough audit weight. Idempotent
  // via the same kind+orderId guard.
  if (order.loyaltyPointsRedeemed) {
    const already = await prisma.loyaltyTransaction.findFirst({
      where: { orderId: order.id, kind: "ADJUST_ADMIN" },
      select: { id: true },
    });
    if (!already) {
      await postTransaction({
        accountId: account.id,
        userId: order.userId,
        kind: "ADJUST_ADMIN",
        points: order.loyaltyPointsRedeemed,
        orderId: order.id,
        description: `Återbetalda poäng — order ${order.orderNumber}`,
      });
      burnRefunded = order.loyaltyPointsRedeemed;
    }
  }

  return { earnReversed, burnRefunded, reason: "ok" };
}
