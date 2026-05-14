import { prisma } from "@/lib/prisma";
import type { LoyaltyTxKind } from "@prisma/client";

/**
 * Read-side helpers for the customer + admin UI. No mutations here —
 * use `lib/loyalty/ledger.ts` + `lib/loyalty/account.ts` for writes.
 */

export type LoyaltyHistoryRow = {
  id: string;
  kind: LoyaltyTxKind;
  points: number;
  description: string;
  createdAt: Date;
  orderNumber: string | null;
};

export async function getAccountHistory(
  userId: string,
  limit = 50
): Promise<LoyaltyHistoryRow[]> {
  const rows = await prisma.loyaltyTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      kind: true,
      points: true,
      description: true,
      createdAt: true,
      order: { select: { orderNumber: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    points: r.points,
    description: r.description,
    createdAt: r.createdAt,
    orderNumber: r.order?.orderNumber ?? null,
  }));
}

/** Swedish sentence-case label per kind, for transaction list display. */
export function labelForKind(kind: LoyaltyTxKind): string {
  switch (kind) {
    case "EARN_ORDER":
      return "Order";
    case "BURN_REDEMPTION":
      return "Använda poäng";
    case "BONUS_WELCOME":
      return "Välkomstbonus";
    case "BONUS_BIRTHDAY":
      return "Födelsedagsbonus";
    case "BONUS_REFERRAL":
      return "Värvningsbonus";
    case "ADJUST_ADMIN":
      return "Justering";
    case "REVERSAL":
      return "Återförd";
    case "EXPIRE":
      return "Förfallna";
  }
}
