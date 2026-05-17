import { describe, it, expect } from "vitest";
import type { Prisma } from "@prisma/client";
import {
  reserveStock,
  restockReturnedItems,
  InsufficientStockError,
} from "@/lib/checkout/stock";

/**
 * Minimal in-memory fake of the two Prisma models reserveStock touches.
 * It faithfully models Postgres' atomic conditional UPDATE: updateMany
 * only mutates a row when EVERY where-clause predicate holds, and reports
 * `count` accordingly. That is exactly the property the oversell guard
 * relies on, so testing against this fake gives real regression cover
 * without a database.
 */
type Row = { id: string; stock: number; manageStock: boolean };

function makeModel(rows: Row[]) {
  const byId = new Map(rows.map((r) => [r.id, { ...r }]));
  return {
    store: byId,
    updateMany: async ({
      where,
      data,
    }: {
      where: { id: string; manageStock?: boolean; stock?: { gte: number } };
      data: { stock: { decrement?: number; increment?: number } };
    }) => {
      const row = byId.get(where.id);
      if (!row) return { count: 0 };
      if (where.manageStock !== undefined && row.manageStock !== where.manageStock)
        return { count: 0 };
      if (where.stock?.gte !== undefined && !(row.stock >= where.stock.gte))
        return { count: 0 };
      if (data.stock.decrement != null) row.stock -= data.stock.decrement;
      if (data.stock.increment != null) row.stock += data.stock.increment;
      return { count: 1 };
    },
    findUnique: async ({ where }: { where: { id: string } }) => {
      const row = byId.get(where.id);
      return row ? { stock: row.stock, manageStock: row.manageStock } : null;
    },
  };
}

function makeTx(products: Row[], variants: Row[]) {
  const product = makeModel(products);
  const productVariant = makeModel(variants);
  return {
    tx: { product, productVariant } as unknown as Prisma.TransactionClient,
    product,
    productVariant,
  };
}

describe("reserveStock — oversell guard (P0-1/P0-2)", () => {
  it("decrements product stock when sufficient", async () => {
    const { tx, product } = makeTx(
      [{ id: "p1", stock: 10, manageStock: true }],
      []
    );
    await reserveStock(tx, [
      { kind: "product", id: "p1", quantity: 3, manageStock: true, label: "Balans" },
    ]);
    expect(product.store.get("p1")!.stock).toBe(7);
  });

  it("throws InsufficientStockError and does NOT go negative when short", async () => {
    const { tx, product } = makeTx(
      [{ id: "p1", stock: 2, manageStock: true }],
      []
    );
    await expect(
      reserveStock(tx, [
        { kind: "product", id: "p1", quantity: 5, manageStock: true, label: "Balans" },
      ])
    ).rejects.toBeInstanceOf(InsufficientStockError);
    // Guard failed → row untouched, never negative.
    expect(product.store.get("p1")!.stock).toBe(2);
  });

  it("surfaces the live available count in the error", async () => {
    const { tx } = makeTx([{ id: "p1", stock: 1, manageStock: true }], []);
    try {
      await reserveStock(tx, [
        { kind: "product", id: "p1", quantity: 9, manageStock: true, label: "Björkglukos" },
      ]);
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(InsufficientStockError);
      expect((e as InsufficientStockError).available).toBe(1);
      expect((e as InsufficientStockError).message).toContain("Björkglukos");
    }
  });

  it("models concurrent checkouts for the last units: second one is rejected", async () => {
    // Both orders validated against stock=5 (the advisory read). The
    // atomic guard must let exactly one win.
    const { tx, product } = makeTx(
      [{ id: "p1", stock: 5, manageStock: true }],
      []
    );
    await reserveStock(tx, [
      { kind: "product", id: "p1", quantity: 5, manageStock: true, label: "Beta Glucan" },
    ]);
    expect(product.store.get("p1")!.stock).toBe(0);
    await expect(
      reserveStock(tx, [
        { kind: "product", id: "p1", quantity: 5, manageStock: true, label: "Beta Glucan" },
      ])
    ).rejects.toBeInstanceOf(InsufficientStockError);
    expect(product.store.get("p1")!.stock).toBe(0); // never -5
  });

  it("decrements variant stock for variant-scoped lines", async () => {
    const { tx, productVariant } = makeTx(
      [],
      [{ id: "v1", stock: 4, manageStock: true }]
    );
    await reserveStock(tx, [
      { kind: "variant", id: "v1", quantity: 4, manageStock: true, label: "Easy Way — 90 kaps" },
    ]);
    expect(productVariant.store.get("v1")!.stock).toBe(0);
  });

  it("skips unmanaged-stock lines without error or mutation", async () => {
    const { tx, product } = makeTx(
      [{ id: "p1", stock: 0, manageStock: false }],
      []
    );
    await reserveStock(tx, [
      { kind: "product", id: "p1", quantity: 999, manageStock: false, label: "Made-to-order" },
    ]);
    expect(product.store.get("p1")!.stock).toBe(0);
  });
});

describe("restockReturnedItems (P0-3)", () => {
  it("increments product stock by the returned quantity", async () => {
    const { tx, product } = makeTx(
      [{ id: "p1", stock: 3, manageStock: true }],
      []
    );
    await restockReturnedItems(tx, [
      { productId: "p1", variantId: null, quantity: 2 },
    ]);
    expect(product.store.get("p1")!.stock).toBe(5);
  });

  it("increments variant stock when the line was variant-scoped", async () => {
    const { tx, productVariant } = makeTx(
      [],
      [{ id: "v1", stock: 1, manageStock: true }]
    );
    await restockReturnedItems(tx, [
      { productId: "p1", variantId: "v1", quantity: 3 },
    ]);
    expect(productVariant.store.get("v1")!.stock).toBe(4);
  });

  it("ignores zero/negative quantities", async () => {
    const { tx, product } = makeTx(
      [{ id: "p1", stock: 7, manageStock: true }],
      []
    );
    await restockReturnedItems(tx, [
      { productId: "p1", variantId: null, quantity: 0 },
    ]);
    expect(product.store.get("p1")!.stock).toBe(7);
  });
});
