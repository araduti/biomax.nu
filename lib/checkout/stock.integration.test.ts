import { describe, it, expect, beforeEach } from "vitest";
import { prisma, resetDb } from "@/test/integration/db";
import {
  reserveStock,
  restockReturnedItems,
  InsufficientStockError,
} from "@/lib/checkout/stock";

/**
 * Real-Postgres proof of the P0-1 oversell fix. Two checkouts for the
 * last units run concurrently; the conditional `UPDATE ... WHERE stock
 * >= qty` plus row locking under READ COMMITTED must let exactly one
 * win and never drive stock negative.
 */

let seq = 0;
async function makeProduct(stock: number, manageStock = true) {
  seq++;
  return prisma.product.create({
    data: {
      tenantId: "ttesttenant0",
      sku: `SKU-${Date.now()}-${seq}`,
      slug: `slug-${Date.now()}-${seq}`,
      name: "Balans",
      shortDescription: "x",
      longDescription: "x",
      status: "PUBLISHED",
      price: "199.00",
      imageUrl: "",
      stock,
      manageStock,
    },
  });
}

describe("reserveStock — concurrent oversell (real Postgres, P0-1)", () => {
  beforeEach(resetDb);

  it("lets exactly one of two concurrent last-5-units orders through", async () => {
    const p = await makeProduct(5);

    const attempt = () =>
      prisma.$transaction((tx) =>
        reserveStock(tx, [
          {
            kind: "product",
            id: p.id,
            quantity: 5,
            manageStock: true,
            label: "Balans",
          },
        ])
      );

    const results = await Promise.allSettled([attempt(), attempt()]);
    const ok = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected");

    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect((failed[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      InsufficientStockError
    );

    const after = await prisma.product.findUniqueOrThrow({
      where: { id: p.id },
      select: { stock: true },
    });
    expect(after.stock).toBe(0); // never -5
  });

  it("partial-overlap: 10 in stock, two ×6 orders → one wins, stock=4", async () => {
    const p = await makeProduct(10);
    const attempt = () =>
      prisma.$transaction((tx) =>
        reserveStock(tx, [
          {
            kind: "product",
            id: p.id,
            quantity: 6,
            manageStock: true,
            label: "Balans",
          },
        ])
      );

    const results = await Promise.allSettled([attempt(), attempt()]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);

    const after = await prisma.product.findUniqueOrThrow({
      where: { id: p.id },
      select: { stock: true },
    });
    expect(after.stock).toBe(4);
  });

  it("ten concurrent single-unit orders on 3 stock → 3 succeed, 7 fail, stock=0", async () => {
    const p = await makeProduct(3);
    const attempt = () =>
      prisma.$transaction((tx) =>
        reserveStock(tx, [
          {
            kind: "product",
            id: p.id,
            quantity: 1,
            manageStock: true,
            label: "Balans",
          },
        ])
      );

    const results = await Promise.allSettled(
      Array.from({ length: 10 }, attempt)
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(3);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(7);

    const after = await prisma.product.findUniqueOrThrow({
      where: { id: p.id },
      select: { stock: true },
    });
    expect(after.stock).toBe(0);
  });

  it("rolls the whole transaction back when one line is short", async () => {
    const a = await makeProduct(10);
    const b = await makeProduct(1);

    await expect(
      prisma.$transaction((tx) =>
        reserveStock(tx, [
          { kind: "product", id: a.id, quantity: 2, manageStock: true, label: "A" },
          { kind: "product", id: b.id, quantity: 5, manageStock: true, label: "B" },
        ])
      )
    ).rejects.toBeInstanceOf(InsufficientStockError);

    // A must NOT have been decremented — the txn rolled back.
    const aAfter = await prisma.product.findUniqueOrThrow({
      where: { id: a.id },
      select: { stock: true },
    });
    expect(aAfter.stock).toBe(10);
  });

  it("restockReturnedItems increments the real row", async () => {
    const p = await makeProduct(2);
    await prisma.$transaction((tx) =>
      restockReturnedItems(tx, [
        { productId: p.id, variantId: null, quantity: 4 },
      ])
    );
    const after = await prisma.product.findUniqueOrThrow({
      where: { id: p.id },
      select: { stock: true },
    });
    expect(after.stock).toBe(6);
  });
});
