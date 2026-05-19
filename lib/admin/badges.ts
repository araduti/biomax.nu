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
import { tenantCache } from "@/lib/tenant/cache";
import { tenantScope } from "@/lib/tenant/db";
import { getLowStockDefault } from "@/lib/site/settings";

export type AdminBadges = {
  ordersToPack: number;
  returnsToProcess: number;
  reviewsToModerate: number;
  productsLowStock: number;
};

async function compute(tenantId: string): Promise<AdminBadges> {
  const threshold = await getLowStockDefault();
  return tenantScope(tenantId, async (tx) => {
    const [
      ordersToPack,
      returnsToProcess,
      reviewsToModerate,
      lowStockSingleSku,
      lowStockVariant,
    ] = await Promise.all([
      tx.order.count({
        where: {
          status: "PAID",
          // Exclude legacy WordPress imports — they're PAID-equivalent
          // in the source data but represent already-fulfilled history.
          legacySource: null,
        },
      }),
      tx.return.count({ where: { status: "REQUESTED" } }),
      tx.review.count({ where: { status: "PENDING" } }),
      // Products without variants — straightforward.
      tx.product.count({
        where: {
          status: "PUBLISHED",
          manageStock: true,
          stock: { lte: threshold },
          variants: { none: {} },
        },
      }),
      // Products with variants — count distinct parents with at least
      // one variant under threshold.
      tx.product.count({
        where: {
          status: "PUBLISHED",
          variants: {
            some: { manageStock: true, stock: { lte: threshold } },
          },
        },
      }),
    ]);
    return {
      ordersToPack,
      returnsToProcess,
      reviewsToModerate,
      productsLowStock: lowStockSingleSku + lowStockVariant,
    };
  });
}

/**
 * Per-tenant cached for 60 s and tenant-tagged so one tenant's admin
 * edit never busts another tenant's badge cache (ADR 0032 D4). Pass the
 * tenant id from the admin guard (`requireTenantRole().tenantId`).
 */
export function getAdminBadges(tenantId: string): Promise<AdminBadges> {
  return tenantCache(tenantId, () => compute(tenantId), ["admin-badges"], {
    revalidate: 60,
    tags: ["admin-badges"],
  })();
}
