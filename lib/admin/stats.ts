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
  // Hero comparison windows — "Intäkter idag" vs the *same weekday*
  // last week (a Friday compares to last Friday, not yesterday — order
  // volume is strongly weekday-shaped for a supplement shop).
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfSameWeekdayLastWeek = new Date(startOfToday);
  startOfSameWeekdayLastWeek.setDate(startOfToday.getDate() - 7);
  const endOfSameWeekdayLastWeek = new Date(startOfSameWeekdayLastWeek);
  endOfSameWeekdayLastWeek.setHours(23, 59, 59, 999);
  // Customer-cohort windows (rolling 30 / prior-30 / rolling 90).
  const start30 = new Date(now);
  start30.setDate(now.getDate() - 30);
  const start60 = new Date(now);
  start60.setDate(now.getDate() - 60);
  const start90 = new Date(now);
  start90.setDate(now.getDate() - 90);

  const lowStockThreshold = await getLowStockDefault();

  const [
    paidOrdersThisMonth,
    paidOrdersPrevMonth,
    paidOrdersToday,
    revenueThisMonth,
    revenuePrevMonth,
    revenueTodayAgg,
    revenueSameWeekdayLastWeekAgg,
    newCustomers,
    newCustomersPrev,
    repurchaseGroups,
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
    // Orders today — denominator for the Plausible conversion KPI.
    prisma.order.count({
      where: {
        status: { in: ["PAID", "FULFILLED"] },
        createdAt: { gte: startOfToday },
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
    // Hero — today's revenue and the same weekday last week.
    prisma.order.aggregate({
      where: {
        status: { in: ["PAID", "FULFILLED"] },
        createdAt: { gte: startOfToday },
        legacySource: null,
      },
      _sum: { totalAmount: true },
    }),
    prisma.order.aggregate({
      where: {
        status: { in: ["PAID", "FULFILLED"] },
        createdAt: {
          gte: startOfSameWeekdayLastWeek,
          lte: endOfSameWeekdayLastWeek,
        },
        legacySource: null,
      },
      _sum: { totalAmount: true },
    }),
    // New customers — rolling 30 d vs the prior 30 d (delta).
    prisma.user.count({
      where: { role: "customer", createdAt: { gte: start30 } },
    }),
    prisma.user.count({
      where: {
        role: "customer",
        createdAt: { gte: start60, lt: start30 },
      },
    }),
    // Repurchase rate (rolling 90 d) — orders grouped by customer so we
    // can count "≥2 orders" vs "≥1 order" without N+1 queries.
    prisma.order.groupBy({
      by: ["userId"],
      where: {
        status: { in: ["PAID", "FULFILLED"] },
        createdAt: { gte: start90 },
        legacySource: null,
      },
      _count: { _all: true },
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

  // Repurchase rate — share of active customers (≥1 paid order in the
  // window) who placed ≥2. Empty cohort → 0 so the KPI never shows NaN.
  const activeCustomers = repurchaseGroups.length;
  const repeatCustomers = repurchaseGroups.filter(
    (g) => g._count._all >= 2
  ).length;
  const repurchaseRate =
    activeCustomers > 0
      ? Math.round((repeatCustomers / activeCustomers) * 100)
      : 0;

  return {
    paidOrdersThisMonth,
    paidOrdersPrevMonth,
    paidOrdersToday,
    revenueThisMonth: parseFloat(
      revenueThisMonth._sum.totalAmount?.toString() ?? "0"
    ),
    revenuePrevMonth: parseFloat(
      revenuePrevMonth._sum.totalAmount?.toString() ?? "0"
    ),
    revenueToday: parseFloat(
      revenueTodayAgg._sum.totalAmount?.toString() ?? "0"
    ),
    revenueSameWeekdayLastWeek: parseFloat(
      revenueSameWeekdayLastWeekAgg._sum.totalAmount?.toString() ?? "0"
    ),
    newCustomers,
    newCustomersPrev,
    repurchaseRate,
    repurchaseActiveCustomers: activeCustomers,
    lowStock,
    recentOrders,
  };
}

/**
 * Daily revenue + order count over the last `days` calendar days
 * (inclusive of today). Used to render sparklines next to the
 * Översikt trend strip — gives a glanceable shape of the week-on-week
 * trajectory that a single delta percentage can't convey.
 *
 * Returns 0 for days with no orders so the sparkline x-axis stays
 * regular. Excludes legacy WP-imported orders for the same reason the
 * rest of the dashboard does (their createdAt is the import time, not
 * the real purchase date).
 */
export async function getDailyMetrics(days = 30): Promise<{
  revenue: number[];
  orders: number[];
}> {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const rows = await prisma.order.findMany({
    where: {
      status: { in: ["PAID", "FULFILLED"] },
      createdAt: { gte: start },
      legacySource: null,
    },
    select: { totalAmount: true, createdAt: true },
  });

  // Bucket into one slot per day so the sparkline has a regular
  // x-spacing (key = yyyy-mm-dd in local time).
  const revenue = new Array(days).fill(0) as number[];
  const orders = new Array(days).fill(0) as number[];
  for (const r of rows) {
    const day = new Date(r.createdAt);
    day.setHours(0, 0, 0, 0);
    const idx = Math.floor(
      (day.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)
    );
    if (idx >= 0 && idx < days) {
      revenue[idx] += parseFloat(r.totalAmount.toString());
      orders[idx] += 1;
    }
  }
  return { revenue, orders };
}

/**
 * The packing queue — the Översikt "Att packa" table. Oldest first
 * (FIFO is the warehouse contract: the order waiting longest ships
 * next).
 *
 * Definition MUST match the canonical "to pack" filter used by the
 * Packlista page and the sidebar `ordersToPack` badge: `status: PAID`
 * + non-legacy. Nothing more. (A previous version also excluded
 * `trackingNumber != null`, which silently dropped PAID orders that
 * had a stub tracking number from a test booking — they still need
 * physical packing, so Översikt disagreed with Packlista + the badge.
 * Booking a label ≠ packed; only FULFILLED means shipped.)
 *
 * `oldestAgeHours` powers the section hint ("äldsta sedan 4 timmar").
 */
export type PackQueueRow = {
  id: string;
  orderNumber: string;
  customerName: string;
  email: string;
  status: "PAID";
  paymentProvider: "KLARNA" | "STRIPE" | "MANUAL";
  totalAmount: string;
  createdAt: Date;
};

export async function getPackQueue(take = 8): Promise<{
  rows: PackQueueRow[];
  total: number;
  oldestAgeHours: number | null;
}> {
  const where = {
    status: "PAID" as const,
    legacySource: null,
  };
  const [rows, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take,
      select: {
        id: true,
        orderNumber: true,
        email: true,
        status: true,
        paymentProvider: true,
        totalAmount: true,
        createdAt: true,
        shippingAddress: { select: { fullName: true } },
        user: {
          select: { firstName: true, lastName: true, name: true },
        },
      },
    }),
    prisma.order.count({ where }),
  ]);

  const oldest = rows[0]?.createdAt ?? null;
  const oldestAgeHours = oldest
    ? Math.max(
        0,
        Math.floor((Date.now() - oldest.getTime()) / 3_600_000)
      )
    : null;

  return {
    rows: rows.map((r) => {
      const fromUser = [r.user?.firstName, r.user?.lastName]
        .filter(Boolean)
        .join(" ");
      const customerName =
        r.shippingAddress?.fullName?.trim() ||
        fromUser ||
        r.user?.name?.trim() ||
        r.email.split("@")[0];
      return {
        id: r.id,
        orderNumber: r.orderNumber,
        customerName,
        email: r.email,
        status: r.status as "PAID",
        paymentProvider: r.paymentProvider,
        totalAmount: r.totalAmount.toString(),
        createdAt: r.createdAt,
      };
    }),
    total,
    oldestAgeHours,
  };
}

/**
 * Best sellers over a rolling window (Översikt "Bästsäljare · senaste
 * 7 dagar"). Units sold per product from paid, non-legacy orders, with
 * the unit delta vs the immediately-preceding window of the same
 * length. Ranked by units desc.
 *
 * Two `groupBy` passes over OrderItem (current + prior window) joined
 * through Order on date/status — no per-product N+1.
 */
export type BestSeller = {
  productId: string;
  name: string;
  slug: string | null;
  category: string | null;
  units: number;
  deltaPct: number | null;
};

export async function getBestSellers(
  days = 7,
  take = 4
): Promise<BestSeller[]> {
  const now = Date.now();
  const start = new Date(now - days * 86_400_000);
  const prevStart = new Date(now - 2 * days * 86_400_000);

  async function unitsByProduct(gte: Date, lt?: Date) {
    const grouped = await prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        productId: { not: null },
        order: {
          status: { in: ["PAID", "FULFILLED"] },
          legacySource: null,
          createdAt: lt ? { gte, lt } : { gte },
        },
      },
      _sum: { quantity: true },
    });
    const m = new Map<string, number>();
    for (const g of grouped) {
      if (g.productId) m.set(g.productId, g._sum.quantity ?? 0);
    }
    return m;
  }

  const [current, prior] = await Promise.all([
    unitsByProduct(start),
    unitsByProduct(prevStart, start),
  ]);

  const ranked = [...current.entries()]
    .map(([productId, units]) => ({ productId, units }))
    .sort((a, b) => b.units - a.units)
    .slice(0, take);
  if (ranked.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: ranked.map((r) => r.productId) } },
    select: {
      id: true,
      name: true,
      slug: true,
      categories: { select: { name: true }, take: 1 },
    },
  });
  const pById = new Map(products.map((p) => [p.id, p]));

  return ranked.map((r) => {
    const p = pById.get(r.productId);
    const prev = prior.get(r.productId) ?? 0;
    const deltaPct =
      prev > 0 ? Math.round(((r.units - prev) / prev) * 100) : null;
    return {
      productId: r.productId,
      name: p?.name ?? "Okänd produkt",
      slug: p?.slug ?? null,
      category: p?.categories[0]?.name ?? null,
      units: r.units,
      deltaPct,
    };
  });
}
