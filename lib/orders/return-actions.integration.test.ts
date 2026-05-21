import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma, resetDb } from "@/test/integration/db";

// recordRefund is a "use server" action that pulls in Next runtime +
// auth deps. Stub those; the DB and the stock/state-machine logic stay
// REAL so the idempotency + guard fixes are genuinely exercised.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/admin/guard", () => ({
  requireTenantRole: vi.fn(async () => ({
    userId: "admintestuser",
    email: "admin@test",
    name: null,
    firstName: null,
    tenantId: "ttesttenant0",
    organizationId: "otestorg0",
    role: "admin" as const,
  })),
}));
vi.mock("@/lib/admin/audit", () => ({ audit: vi.fn(async () => {}) }));
vi.mock("@/lib/session", () => ({ currentUser: vi.fn(async () => null) }));

const { recordRefund } = await import("@/lib/orders/return-actions");

let seq = 0;
const TEST_TENANT_ID = "ttesttenant0";
async function seedRefundable(orderStatus: "PAID" | "CANCELLED", stock = 10) {
  seq++;
  const tag = `${Date.now()}-${seq}`;
  const product = await prisma.product.create({
    data: {
      tenantId: TEST_TENANT_ID,
      sku: `SKU-${tag}`,
      slug: `slug-${tag}`,
      name: "Björkglukos",
      shortDescription: "x",
      longDescription: "x",
      status: "PUBLISHED",
      price: "150.00",
      imageUrl: "",
      stock,
      manageStock: true,
    },
  });
  const order = await prisma.order.create({
    data: {
      tenantId: TEST_TENANT_ID,
      orderNumber: `BMX-${tag}`,
      email: "kund@example.com",
      status: orderStatus,
      subtotal: "300.00",
      totalAmount: "300.00",
      taxRateBp: 600,
      items: {
        create: {
          tenantId: TEST_TENANT_ID,
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          quantity: 2,
          unitPrice: "150.00",
          totalPrice: "300.00",
        },
      },
    },
    include: { items: true },
  });
  const ret = await prisma.return.create({
    data: {
      tenantId: TEST_TENANT_ID,
      returnNumber: `BMX-RET-${tag}`,
      orderId: order.id,
      status: "RECEIVED",
      items: {
        create: { tenantId: TEST_TENANT_ID, orderItemId: order.items[0]!.id, quantity: 2 },
      },
    },
  });
  return { product, order, ret };
}

describe("recordRefund — real DB (P0-3 + state guard)", () => {
  beforeEach(resetDb);

  it("restocks returned units exactly once and is idempotent on re-call", async () => {
    const { product, ret } = await seedRefundable("PAID", 10);

    const first = await recordRefund({
      returnId: ret.id,
      refundAmount: 300,
      refundReference: "klarna-refund-1",
    });
    expect(first.ok).toBe(true);

    let p = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
      select: { stock: true },
    });
    expect(p.stock).toBe(12); // 10 + 2 returned

    const refreshed = await prisma.return.findUniqueOrThrow({
      where: { id: ret.id },
      select: { status: true },
    });
    expect(refreshed.status).toBe("REFUNDED");
    const ord = await prisma.order.findFirstOrThrow({
      where: { returns: { some: { id: ret.id } } },
      select: { status: true },
    });
    expect(ord.status).toBe("REFUNDED");

    // Second call (admin double-click / retry) must NOT double-restock.
    const second = await recordRefund({
      returnId: ret.id,
      refundAmount: 300,
      refundReference: "klarna-refund-1",
    });
    expect(second.ok).toBe(true);
    p = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
      select: { stock: true },
    });
    expect(p.stock).toBe(12); // still 12, not 14
  });

  it("two concurrent recordRefund calls restock only once", async () => {
    const { product, ret } = await seedRefundable("PAID", 5);

    await Promise.allSettled([
      recordRefund({ returnId: ret.id, refundAmount: 300, refundReference: "r" }),
      recordRefund({ returnId: ret.id, refundAmount: 300, refundReference: "r" }),
    ]);

    const p = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
      select: { stock: true },
    });
    expect(p.stock).toBe(7); // 5 + 2, never 5 + 4
  });

  it("refuses to refund a CANCELLED order and leaves stock untouched", async () => {
    const { product, ret } = await seedRefundable("CANCELLED", 8);

    const res = await recordRefund({
      returnId: ret.id,
      refundAmount: 300,
      refundReference: "x",
    });
    expect(res.ok).toBe(false);

    const p = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
      select: { stock: true },
    });
    expect(p.stock).toBe(8);
    const r = await prisma.return.findUniqueOrThrow({
      where: { id: ret.id },
      select: { status: true },
    });
    expect(r.status).toBe("RECEIVED"); // unchanged
  });
});
