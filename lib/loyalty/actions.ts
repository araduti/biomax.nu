"use server";

import { currentUser } from "@/lib/session";
import { getAccountBalance } from "./account";

/**
 * Read the current user's loyalty balance for client components.
 * Returns null for guests / users without an account (callers should
 * hide the redemption surface in that case).
 */
export async function getMyLoyaltyBalance(): Promise<{
  balance: number;
  lifetimeEarned: number;
} | null> {
  const user = await currentUser();
  if (!user) return null;
  const account = await getAccountBalance(user.id);
  if (!account) return null;
  return {
    balance: account.balance,
    lifetimeEarned: account.lifetimeEarned,
  };
}
