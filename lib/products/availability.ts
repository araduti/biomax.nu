import type { Prisma } from "@prisma/client";

/**
 * Prisma `where` fragment for products that should be visible to the public
 * right now: status PUBLISHED, current time inside the editor-scheduled
 * availability window. Compose with `AND`/`OR` clauses or spread into a
 * larger where object.
 */
export function publicProductWhere(now: Date = new Date()): Prisma.ProductWhereInput {
  return {
    status: "PUBLISHED",
    AND: [
      { OR: [{ availableFrom: null }, { availableFrom: { lte: now } }] },
      { OR: [{ availableUntil: null }, { availableUntil: { gt: now } }] },
    ],
  };
}

/** True when the given product fields make it publicly visible right now. */
export function isProductAvailable(
  product: { status: string; availableFrom: Date | null; availableUntil: Date | null },
  now: Date = new Date()
): boolean {
  if (product.status !== "PUBLISHED") return false;
  if (product.availableFrom && product.availableFrom > now) return false;
  if (product.availableUntil && product.availableUntil <= now) return false;
  return true;
}
