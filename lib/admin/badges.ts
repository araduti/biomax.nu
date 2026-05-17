/**
 * Admin sidebar + dashboard badge counts.
 *
 * One DB read per badge, all in parallel, all narrow. The numbers drive
 * the sidebar nav chips ("Ordrar •3") and the dashboard's "Att göra nu"
 * action cards. We cache the result because every admin page renders
 * the sidebar — without caching that's 6 round-trips per request.
 *
 * Counts deliberately *exclude*:
 *   - Legacy-WP archived orders (`legacySource != null`). They've been
 *     PENDING for years and are never going to flip; surfacing them
 *     would mean an admin always sees "Ordrar •18" no matter what.
 *   - DRAFT products in low-stock (their zero stock is intentional).
 *
 * Variant-aware:
 *   - Low-stock counts a product if `manageStock && stock <= threshold`
 *     for products without variants, OR if *any* variant matches that
 *     for products with variants.
 */
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getLowStockDefault } from "@/lib/site/settings";

export type AdminBadges = {
  ordersToPack: number;
  returnsToProcess: number;
  reviewsToModerate: number;
  productsLowStock: number;
};

async function countLowStockProducts(threshold: number): Promise<number> {
  // Products without variants — straightforward.
  const singleSku = await prisma.product.count({
    where: {
      status: "PUBLISHED",
      manageStock: true,
      stock: { lte: threshold },
      variants: { none: {} },
    },
  });

  // Products with variants — count distinct parents that have at least
  // one variant under threshold. We could do this with a groupBy on the
  // variant table; the cleaner path is to count products that have a
  // matching variant.
  const variantHits = await prisma.product.count({
    where: {
      status: "PUBLISHED",
      variants: {
        some: { manageStock: true, stock: { lte: threshold } },
      },
    },
  });

  return singleSku + variantHits;
}

async function compute(): Promise<AdminBadges> {
  const threshold = await getLowStockDefault();
  const [ordersToPack, returnsToProcess, reviewsToModerate, productsLowStock] =
    await Promise.all([
      prisma.order.count({
        where: {
          status: "PAID",
          // Exclude legacy WordPress imports — they're PAID-equivalent in
          // the source data but represent already-fulfilled history.
          legacySource: null,
        },
      }),
      prisma.return.count({ where: { status: "REQUESTED" } }),
      prisma.review.count({ where: { status: "PENDING" } }),
      countLowStockProducts(threshold),
    ]);
  return {
    ordersToPack,
    returnsToProcess,
    reviewsToModerate,
    productsLowStock,
  };
}

/**
 * Cached for 60 s and tagged so admin actions can invalidate explicitly
 * if they ever need a fresh badge before the TTL.
 */
export const getAdminBadges = unstable_cache(compute, ["admin-badges"], {
  revalidate: 60,
  tags: ["admin-badges"],
});
