import { prisma } from "@/lib/prisma";
import { getLowStockDefault } from "@/lib/site/settings";

/**
 * Dashboard data — focused on "what does the admin need to see THIS
 * MORNING?", not "every possible metric we could compute".
 *
 * Three buckets:
 *   1. Trend — this-month vs prev-month money + order counts. Compact
 *      strip on the dashboard, not a wall of KPI cards.
 *   2. Recent — last 5 *non-legacy* orders.
 *   3. Lågt lager — PUBLISHED products only (the old query showed
 *      DRAFT products at 0 stock, which was the noisy default and the
 *      reason the dashboard looked alarming on fresh installs).
 *
 * Counts that drive the "Att göra nu"-zone live in `lib/admin/badges.ts`
 * — separated because they're also rendered in the sidebar and that
 * cache is keyed differently.
 */
export async function getDashboardStats() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfPrevMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    0,
    23,
    59,
    59
  );
  const lowStockThreshold = await getLowStockDefault();

  const [
    paidOrdersThisMonth,
    paidOrdersPrevMonth,
    revenueThisMonth,
    revenuePrevMonth,
    lowStockSingleSku,
    lowStockVariants,
    recentOrders,
  ] = await Promise.all([
    prisma.order.count({
      where: {
        status: { in: ["PAID", "FULFILLED"] },
        createdAt: { gte: startOfMonth },
        legacySource: null,
      },
    }),
    prisma.order.count({
      where: {
        status: { in: ["PAID", "FULFILLED"] },
        createdAt: { gte: startOfPrevMonth, lte: endOfPrevMonth },
        legacySource: null,
      },
    }),
    prisma.order.aggregate({
      where: {
        status: { in: ["PAID", "FULFILLED"] },
        createdAt: { gte: startOfMonth },
        legacySource: null,
      },
      _sum: { totalAmount: true },
    }),
    prisma.order.aggregate({
      where: {
        status: { in: ["PAID", "FULFILLED"] },
        createdAt: { gte: startOfPrevMonth, lte: endOfPrevMonth },
        legacySource: null,
      },
      _sum: { totalAmount: true },
    }),
    // Low stock — single-SKU products only (no variants).
    prisma.product.findMany({
      where: {
        status: "PUBLISHED",
        manageStock: true,
        stock: { lte: lowStockThreshold },
        variants: { none: {} },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        stock: true,
        sku: true,
      },
      orderBy: { stock: "asc" },
      take: 8,
    }),
    // Low stock — variant rows that breach threshold, with parent
    // product joined for display. We split this query because the
    // variant + parent product lookup is structurally different from
    // single-SKU products and the alternative (a wide OR clause) is
    // harder to reason about.
    prisma.productVariant.findMany({
      where: {
        manageStock: true,
        stock: { lte: lowStockThreshold },
        product: { status: "PUBLISHED" },
      },
      select: {
        id: true,
        label: true,
        sku: true,
        stock: true,
        product: { select: { name: true, slug: true } },
      },
      orderBy: { stock: "asc" },
      take: 8,
    }),
    prisma.order.findMany({
      where: { legacySource: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        orderNumber: true,
        email: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
    }),
  ]);

  // Normalise both low-stock sources into one display list. Sort by
  // stock ascending so the most-urgent zero rows surface first; cap
  // total at 6 entries (the dashboard sidebar is narrow).
  const lowStock = [
    ...lowStockSingleSku.map((p) => ({
      kind: "product" as const,
      sku: p.sku,
      name: p.name,
      slug: p.slug,
      stock: p.stock,
    })),
    ...lowStockVariants.map((v) => ({
      kind: "variant" as const,
      sku: v.sku,
      name: `${v.product.name} — ${v.label}`,
      slug: v.product.slug,
      stock: v.stock,
    })),
  ]
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 6);

  return {
    paidOrdersThisMonth,
    paidOrdersPrevMonth,
    revenueThisMonth: parseFloat(
      revenueThisMonth._sum.totalAmount?.toString() ?? "0"
    ),
    revenuePrevMonth: parseFloat(
      revenuePrevMonth._sum.totalAmount?.toString() ?? "0"
    ),
    lowStock,
    recentOrders,
  };
}
