import { prisma } from "@/lib/prisma";
import { getAllIngredients } from "@/lib/knowledge/ingredients";
import { getSeoHealth } from "@/lib/admin/seo-health";

export async function getDashboardStats() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [
    totalOrdersAllTime,
    paidOrdersThisMonth,
    paidOrdersPrevMonth,
    revenueThisMonth,
    revenuePrevMonth,
    pendingCount,
    paidCount,
    customerCount,
    productCount,
    lowStock,
    recentOrders,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({
      where: {
        status: { in: ["PAID", "FULFILLED"] },
        createdAt: { gte: startOfMonth },
      },
    }),
    prisma.order.count({
      where: {
        status: { in: ["PAID", "FULFILLED"] },
        createdAt: { gte: startOfPrevMonth, lte: endOfPrevMonth },
      },
    }),
    prisma.order.aggregate({
      where: {
        status: { in: ["PAID", "FULFILLED"] },
        createdAt: { gte: startOfMonth },
      },
      _sum: { totalAmount: true },
    }),
    prisma.order.aggregate({
      where: {
        status: { in: ["PAID", "FULFILLED"] },
        createdAt: { gte: startOfPrevMonth, lte: endOfPrevMonth },
      },
      _sum: { totalAmount: true },
    }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.count({ where: { status: "PAID" } }),
    prisma.user.count({ where: { role: "customer" } }),
    prisma.product.count({ where: { status: "PUBLISHED" } }),
    prisma.product.findMany({
      where: { manageStock: true, stock: { lte: 5 } },
      select: { id: true, name: true, slug: true, stock: true, sku: true },
      orderBy: { stock: "asc" },
      take: 5,
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        orderNumber: true,
        email: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        legacySource: true,
        _count: { select: { items: true } },
      },
    }),
  ]);

  // Content health — per-product SEO completeness + kunskapsbank coverage.
  // Independent of the order/customer queries above, runs in parallel-ish on
  // the same request. Cheap because the registry lives in code and the
  // product fetch is a single SELECT.
  const [productsForHealth, ingredients] = await Promise.all([
    prisma.product.findMany({
      where: { status: "PUBLISHED" },
      select: {
        id: true,
        seoTitle: true,
        seoDescription: true,
        seoFocusKw: true,
        shortDescription: true,
        longDescription: true,
        ingredientList: true,
        usage: true,
        warnings: true,
      },
    }),
    Promise.resolve(getAllIngredients()),
  ]);

  const productHealth = { complete: 0, partial: 0, "needs-work": 0 };
  for (const p of productsForHealth) {
    productHealth[getSeoHealth(p).level]++;
  }

  const monographsTotal = ingredients.length;
  const monographsWithRefs = ingredients.filter(
    (i) => (i.references?.length ?? 0) > 0
  ).length;
  const monographsWithRelated = ingredients.filter(
    (i) => (i.relatedSlugs?.length ?? 0) > 0
  ).length;

  return {
    totalOrdersAllTime,
    paidOrdersThisMonth,
    paidOrdersPrevMonth,
    revenueThisMonth: parseFloat(revenueThisMonth._sum.totalAmount?.toString() ?? "0"),
    revenuePrevMonth: parseFloat(revenuePrevMonth._sum.totalAmount?.toString() ?? "0"),
    pendingCount,
    paidCount,
    customerCount,
    productCount,
    lowStock,
    recentOrders,
    productHealth,
    monographs: {
      total: monographsTotal,
      withReferences: monographsWithRefs,
      withRelated: monographsWithRelated,
    },
  };
}
