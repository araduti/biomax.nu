import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { postTransaction } from "./ledger";
import { WELCOME_BONUS_POINTS, LOYALTY_PROGRAM_NAME } from "./constants";

/**
 * Account lifecycle helpers.
 *
 * `ensureAccount` is the only entry point for creating an account.
 * It's idempotent (safe to call multiple times for the same userId)
 * and credits the welcome bonus exactly once — on first creation.
 * Auth signup wires this in; legacy users get one lazily on their
 * first `/konto` visit.
 */

export async function ensureAccount(
  userId: string,
  options?: { tx?: Prisma.TransactionClient }
) {
  const client = options?.tx ?? prisma;
  const existing = await client.loyaltyAccount.findUnique({
    where: { userId },
  });
  if (existing) return existing;

  const account = await client.loyaltyAccount.create({
    data: { userId },
  });

  if (WELCOME_BONUS_POINTS > 0) {
    await postTransaction({
      accountId: account.id,
      userId,
      kind: "BONUS_WELCOME",
      points: WELCOME_BONUS_POINTS,
      description: `Välkomstbonus — ${LOYALTY_PROGRAM_NAME}`,
      tx: options?.tx,
    });
    // Re-fetch so the caller sees the post-bonus balance.
    return client.loyaltyAccount.findUniqueOrThrow({ where: { userId } });
  }

  return account;
}

/**
 * Fast read for "Du har X poäng"-display. Returns null for users who
 * haven't been auto-enrolled yet (legacy customers pre-loyalty). Callers
 * who must have an account should call `ensureAccount` instead.
 */
export async function getAccountBalance(userId: string): Promise<{
  balance: number;
  lifetimeEarned: number;
  enrolledAt: Date;
} | null> {
  const account = await prisma.loyaltyAccount.findUnique({
    where: { userId },
    select: { balance: true, lifetimeEarned: true, enrolledAt: true },
  });
  return account ?? null;
}
