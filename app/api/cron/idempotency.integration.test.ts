import { describe, it, expect, beforeEach } from "vitest";
import { prisma, resetDb } from "@/test/integration/db";

/**
 * The two DB-level invariants the webhook + cron fixes depend on,
 * proven against real Postgres:
 *
 *  1. Subscription-renewal claim — the conditional `updateMany` the cron
 *     uses to advance nextOrderAt lets exactly one of N concurrent runs
 *     win, so a retried/duplicated cron can't double-charge.
 *  2. Order.paymentReference UNIQUE — the constraint
 *     ensureOrderFromKustomOrder relies on so the confirmation page +
 *     Klarna push can't both persist an order for the same payment.
 */

let seq = 0;

describe("subscription renewal claim (P1, cron double-run)", () => {
  beforeEach(resetDb);

  it("exactly one of three concurrent claims advances the subscription", async () => {
    seq++;
    const now = new Date();
    const past = new Date(now.getTime() - 60_000);
    const future = new Date(now.getTime() + 30 * 24 * 3600_000);

    const sub = await prisma.subscription.create({
      data: {
        email: `sub-${Date.now()}-${seq}@example.com`,
        status: "ACTIVE",
        intervalDays: 30,
        nextOrderAt: past,
      },
    });

    const claim = () =>
      prisma.subscription.updateMany({
        where: { id: sub.id, status: "ACTIVE", nextOrderAt: { lte: now } },
        data: { nextOrderAt: future, lastRenewedAt: now },
      });

    const results = await Promise.all([claim(), claim(), claim()]);
    const totalClaimed = results.reduce((s, r) => s + r.count, 0);

    expect(totalClaimed).toBe(1); // not 3 → no triple renewal/charge

    const after = await prisma.subscription.findUniqueOrThrow({
      where: { id: sub.id },
      select: { nextOrderAt: true },
    });
    expect(after.nextOrderAt.getTime()).toBe(future.getTime());
  });
});

describe("Order.paymentReference dedupe (P0, webhook race)", () => {
  beforeEach(resetDb);

  it("two concurrent orders for the same payment → one wins, one P2002", async () => {
    seq++;
    const ref = `kustom_order_${Date.now()}_${seq}`;

    const create = (orderNumber: string) =>
      prisma.order.create({
        data: {
          orderNumber,
          email: "kund@example.com",
          status: "PAID",
          paymentReference: ref,
          subtotal: "100.00",
          totalAmount: "100.00",
          taxRateBp: 600,
        },
      });

    const results = await Promise.allSettled([
      create(`BMX-A-${seq}`),
      create(`BMX-B-${seq}`),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected") as
      | PromiseRejectedResult
      | undefined;
    expect(rejected).toBeDefined();
    // Prisma unique-constraint violation code.
    expect(String(rejected!.reason?.code ?? rejected!.reason)).toContain(
      "P2002"
    );

    const count = await prisma.order.count({
      where: { paymentReference: ref },
    });
    expect(count).toBe(1);
  });
});
