import { prisma } from "@/lib/prisma";
import type { Prisma, LoyaltyTxKind } from "@prisma/client";

/**
 * Atomic ledger writes.
 *
 * Every points mutation MUST go through `postTransaction` — this is the
 * only function that's allowed to update `LoyaltyAccount.balance`,
 * `lifetimeEarned`, and `lastActivityAt`. The account cache and the
 * transaction row update in a single Prisma transaction so the invariant
 * `SUM(transactions.points) === account.balance` holds at all times.
 *
 * Direct `prisma.loyaltyAccount.update({ balance: ... })` calls outside
 * this module are a bug. If you need an admin manual adjust, write an
 * ADJUST_ADMIN transaction here.
 */

export type PostTransactionInput = {
  accountId: string;
  userId: string;
  kind: LoyaltyTxKind;
  /** Signed. Positive = credit; negative = debit. */
  points: number;
  /** Order this transaction relates to (EARN_ORDER, REVERSAL). */
  orderId?: string | null;
  /** Admin actor for ADJUST_ADMIN rows. */
  adminId?: string | null;
  /** Customer-facing one-liner. Required. */
  description: string;
  /** Optional Prisma transaction client for multi-step writes. */
  tx?: Prisma.TransactionClient;
};

export async function postTransaction(input: PostTransactionInput) {
  const run = async (client: Prisma.TransactionClient) => {
    const row = await client.loyaltyTransaction.create({
      data: {
        accountId: input.accountId,
        userId: input.userId,
        kind: input.kind,
        points: input.points,
        orderId: input.orderId ?? null,
        adminId: input.adminId ?? null,
        description: input.description,
      },
    });

    // Lifetime-earned tracks positive transactions only — burns and
    // expiries don't subtract from it (that's the whole point of a
    // lifetime counter for tier preview).
    const lifetimeDelta = input.points > 0 ? input.points : 0;

    await client.loyaltyAccount.update({
      where: { id: input.accountId },
      data: {
        balance: { increment: input.points },
        lifetimeEarned: { increment: lifetimeDelta },
        lastActivityAt: new Date(),
      },
    });

    return row;
  };

  return input.tx ? run(input.tx) : prisma.$transaction(run);
}
