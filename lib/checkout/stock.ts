import type { Prisma } from "@prisma/client";

/**
 * Atomic stock reservation — the single source of truth for decrementing
 * inventory when an order is created.
 *
 * The availability check during cart validation (`product.stock < qty`) is
 * a read-then-write TOCTOU and is ADVISORY ONLY: two concurrent checkouts
 * for the last unit both pass it. The authoritative guard is the
 * conditional `updateMany` below — `stock >= quantity` is evaluated by
 * Postgres atomically as part of the UPDATE, so a row can never be driven
 * negative regardless of concurrency. `count === 0` means the guard failed
 * (insufficient stock) and we abort the whole transaction.
 *
 * MUST be called inside a `prisma.$transaction` so a failed reservation
 * rolls back the order/items/address created alongside it.
 */

export class InsufficientStockError extends Error {
  constructor(
    readonly label: string,
    readonly available: number
  ) {
    super(`För få i lager: "${label}" (${available} kvar).`);
    this.name = "InsufficientStockError";
  }
}

export type StockReservation = {
  kind: "product" | "variant";
  id: string;
  quantity: number;
  /** Whether the SKU tracks stock. Unmanaged lines are skipped. */
  manageStock: boolean;
  /** Human label for the error message ("Balans — 90 kaps"). */
  label: string;
};

export async function reserveStock(
  tx: Prisma.TransactionClient,
  reservations: StockReservation[]
): Promise<void> {
  for (const r of reservations) {
    if (!r.manageStock || r.quantity <= 0) continue;

    const result =
      r.kind === "variant"
        ? await tx.productVariant.updateMany({
            where: { id: r.id, manageStock: true, stock: { gte: r.quantity } },
            data: { stock: { decrement: r.quantity } },
          })
        : await tx.product.updateMany({
            where: { id: r.id, manageStock: true, stock: { gte: r.quantity } },
            data: { stock: { decrement: r.quantity } },
          });

    if (result.count === 0) {
      // Guard failed. Re-read the live value purely to surface an
      // accurate "X kvar" message; the abort itself is non-negotiable.
      const current =
        r.kind === "variant"
          ? await tx.productVariant.findUnique({
              where: { id: r.id },
              select: { stock: true, manageStock: true },
            })
          : await tx.product.findUnique({
              where: { id: r.id },
              select: { stock: true, manageStock: true },
            });
      // manageStock flipped to false between resolve and reserve → nothing
      // to reserve, not an error.
      if (current && !current.manageStock) continue;
      throw new InsufficientStockError(r.label, current?.stock ?? 0);
    }
  }
}

/**
 * Idempotent restock — the inverse of `reserveStock`, used when a return
 * is refunded. Increments are unconditional (stock can always go up);
 * caller is responsible for only invoking this once per return via a
 * status-transition guard.
 */
export type RestockEntry = {
  productId: string | null;
  variantId: string | null;
  quantity: number;
};

export async function restockReturnedItems(
  tx: Prisma.TransactionClient,
  entries: RestockEntry[]
): Promise<void> {
  for (const e of entries) {
    if (e.quantity <= 0) continue;
    if (e.variantId) {
      await tx.productVariant.updateMany({
        where: { id: e.variantId, manageStock: true },
        data: { stock: { increment: e.quantity } },
      });
    } else if (e.productId) {
      await tx.product.updateMany({
        where: { id: e.productId, manageStock: true },
        data: { stock: { increment: e.quantity } },
      });
    }
  }
}
