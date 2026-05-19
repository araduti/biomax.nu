import { prisma } from "@/lib/prisma";
import { tenantScope } from "./db";

/**
 * Per-tenant export — ADR 0033 Part A2 (also serves offboarding +
 * the first half of move-out in Part B and the per-tenant DR runbook
 * in Part A3).
 *
 * Generalises the lib/gdpr/core.ts `buildUserExport` pattern from
 * per-subject (Article 15) to per-tenant: emits every row of every
 * tenant-owned model PLUS the Better Auth Organization /
 * Member / Invitation rows linked via Tenant.organizationId PLUS
 * platform-plane Tenant + TenantPaymentCredential rows for the
 * target tenant, PLUS a placeholder object-storage manifest.
 *
 * Authorisation + audit are NOT here. Like buildUserExport this is a
 * pure aggregation function; the caller — a Platform action gated by
 * requirePlatformAdmin() — owns both (ADR 0031 D3/D4).
 *
 * Why a single tenantScope wraps every read: a snapshot must be
 * point-in-time consistent. withTenantRLS opens an interactive
 * REPEATABLE READ-ish (Prisma default Read Committed but a single
 * tx) transaction; all reads see the same committed state and FORCE
 * RLS guarantees we never accidentally drag another tenant's row in.
 *
 * Out of scope HERE (flagged in the runbook):
 *   - A re-importer companion (target-side write) — Part B move-out.
 *   - Per-tenant object-storage prefixing — public/shops/<tenantId>/
 *     does not exist yet (ADR 0028 D7 deferred); the manifest emits
 *     an empty array + a TODO marker so the consumer knows.
 *   - Anonymisation: this is a raw extract for the controller, NOT a
 *     redacted GDPR Article 15 export. Subject-level Article 15 stays
 *     in lib/gdpr/core.ts.
 */

export type TenantExport = { filename: string; payload: string };

export type TenantExportObjectManifest = {
  /**
   * Per-tenant file paths under `public/shops/<tenantId>/`. Today the
   * codebase has no per-tenant file namespacing (everything is at
   * `public/`), so this is always `[]` and `note` flags the deferral.
   */
  files: string[];
  note: string;
};

/**
 * Aggregate every row tied to this tenant into a single
 * machine-readable JSON document. Returns `null` if the tenant is
 * gone (deleted between the platform UI render and the action call).
 */
export async function exportTenant(
  tenantId: string
): Promise<TenantExport | null> {
  // 1) Platform-plane row — outside RLS (Tenant + TenantPaymentCredential
  //    are deliberately OUTSIDE the seam, ADR 0032 D2 + the
  //    TenantPaymentCredential model comment). Read first so we can
  //    return null cleanly before opening the RLS tx.
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      slug: true,
      name: true,
      tagline: true,
      primaryColorHex: true,
      status: true,
      organizationId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!tenant) return null;

  const paymentCredential = await prisma.tenantPaymentCredential.findUnique({
    where: { tenantId },
  });

  // 2) Better Auth org-plugin rows — keyed via Tenant.organizationId.
  //    These are library-owned (no tenantId column), so we read them
  //    directly. Member.userId points at User rows which we do NOT
  //    export (users can be cross-tenant; the User table is shared
  //    library plane, not tenant-owned).
  const orgRows = tenant.organizationId
    ? await prisma.$transaction(async (px) => {
        const organization = await px.organization.findUnique({
          where: { id: tenant.organizationId! },
        });
        const members = await px.member.findMany({
          where: { organizationId: tenant.organizationId! },
        });
        const invitations = await px.invitation.findMany({
          where: { organizationId: tenant.organizationId! },
        });
        return { organization, members, invitations };
      })
    : { organization: null, members: [], invitations: [] };

  // 3) All owned-model rows, inside ONE RLS-scoped tx for point-in-
  //    time consistency. FORCE RLS guarantees we only see this
  //    tenant's rows (a missing scope would zero-out the result, not
  //    cross-tenant leak — ADR 0032 D7).
  const owned = await tenantScope(tenantId, async (tx) => ({
    categories: await tx.category.findMany(),
    products: await tx.product.findMany(),
    productIngredients: await tx.productIngredient.findMany(),
    productVariants: await tx.productVariant.findMany(),
    productCrossSells: await tx.productCrossSell.findMany(),
    reviews: await tx.review.findMany(),
    blogCategories: await tx.blogCategory.findMany(),
    blogPosts: await tx.blogPost.findMany(),
    orders: await tx.order.findMany(),
    orderItems: await tx.orderItem.findMany(),
    addresses: await tx.address.findMany(),
    wishlists: await tx.wishlist.findMany(),
    wishlistProducts: await tx.wishlistProduct.findMany(),
    coupons: await tx.coupon.findMany(),
    siteSettings: await tx.siteSetting.findMany(),
    newsletterSubscribers: await tx.newsletterSubscriber.findMany(),
    cartSnapshots: await tx.cartSnapshot.findMany(),
    bundles: await tx.bundle.findMany(),
    bundleItems: await tx.bundleItem.findMany(),
    ingredientPins: await tx.ingredientPin.findMany(),
    homepageBlocks: await tx.homepageBlock.findMany(),
    stockNotificationRequests: await tx.stockNotificationRequest.findMany(),
    redirects: await tx.redirect.findMany(),
    adminAuditEntries: await tx.adminAuditEntry.findMany(),
    consentEvents: await tx.consentEvent.findMany(),
    subscriptions: await tx.subscription.findMany(),
    subscriptionLines: await tx.subscriptionLine.findMany(),
    returns: await tx.return.findMany(),
    returnItems: await tx.returnItem.findMany(),
    homepageHeroes: await tx.homepageHero.findMany(),
    loyaltyAccounts: await tx.loyaltyAccount.findMany(),
    loyaltyTransactions: await tx.loyaltyTransaction.findMany(),
  }));

  // 4) Object-storage manifest. TODO: when ADR 0028 D7 per-tenant
  //    file namespacing lands (`public/shops/<tenantId>/`), walk that
  //    prefix and emit the file list. Today there are no per-tenant
  //    files, so the empty list + note is the honest answer.
  const objectManifest: TenantExportObjectManifest = {
    files: [],
    note:
      "TODO ADR 0028 D7 / ADR 0033 Part A2: per-tenant object-storage " +
      "namespace not yet provisioned. Re-emit when public/shops/<tenantId>/ " +
      "(or the equivalent S3/R2 prefix) exists.",
  };

  const payload = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      schemaVersion: 1,
      gdprArticle: null,
      tenant,
      paymentCredential,
      organization: orgRows.organization,
      members: orgRows.members,
      invitations: orgRows.invitations,
      owned,
      objectManifest,
    },
    null,
    2
  );

  const safeSlug = tenant.slug.replace(/[^a-z0-9.-]/gi, "_");
  return {
    filename: `korg-tenant-${safeSlug}-${new Date()
      .toISOString()
      .slice(0, 10)}.json`,
    payload,
  };
}
