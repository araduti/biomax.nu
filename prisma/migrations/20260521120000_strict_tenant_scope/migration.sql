-- Korg 3b-2 #3e: strict tenant scope (NOT NULL + composite uniques)
--
-- Phase A pre-check (run before applying):
--   • 0 NULL tenantId rows on all 32 owned tables (verified 2026-05-21)
--   • 33 *_tenantId_fkey constraints intact (verified)
--   • 0 within-tenant duplicates on the 16 composite-unique candidates
--
-- Changes:
--   • SET NOT NULL on tenantId for 32 owned tables
--   • DROP 16 global @unique indexes + CREATE 16 composite (tenantId, *)
--     uniques — for slug/code/sku/email/orderNumber/etc fields
--   • DROP+ADD AdminAuditEntry_tenantId_fkey (FK recreation as relation
--     becomes required) — net-zero FK change
--
-- NOT changed (deliberately):
--   • Token fields (Order.trackingToken, NewsletterSubscriber.unsubscribeToken,
--     CartSnapshot.recoveryToken) — kept globally @unique because their
--     lookups don't know the tenant yet (public URL paths)
--   • Wishlist.userId, LoyaltyAccount.userId — kept @unique because the
--     User-side relation is 1:1 (User.wishlist Wishlist? not Wishlist[]).
--     Converting to composite requires a 1:1 → 1:many relation reshape
--     plus downstream code updates — out of scope for #3e, defer to a
--     dedicated slice when biomax+tenant#2 actually requires it.
--
-- After #3f (the strict-RLS flip), NULL tenantId is a DB-level impossibility
-- via both the NOT NULL constraint here AND the RLS WITH CHECK there.

-- DropForeignKey
ALTER TABLE "AdminAuditEntry" DROP CONSTRAINT "AdminAuditEntry_tenantId_fkey";

-- DropIndex
DROP INDEX "BlogCategory_slug_key";

-- DropIndex
DROP INDEX "BlogPost_slug_key";

-- DropIndex
DROP INDEX "Bundle_slug_key";

-- DropIndex
DROP INDEX "Category_legacyWpId_key";

-- DropIndex
DROP INDEX "Category_slug_key";

-- DropIndex
DROP INDEX "Coupon_code_key";

-- DropIndex
DROP INDEX "NewsletterSubscriber_email_key";

-- DropIndex
DROP INDEX "Order_legacyWpId_key";

-- DropIndex
DROP INDEX "Order_orderNumber_key";

-- DropIndex
DROP INDEX "Order_paymentReference_key";

-- DropIndex
DROP INDEX "Product_legacyWpId_key";

-- DropIndex
DROP INDEX "Product_sku_key";

-- DropIndex
DROP INDEX "Product_slug_key";

-- DropIndex
DROP INDEX "ProductVariant_sku_key";

-- DropIndex
DROP INDEX "Redirect_fromPath_key";

-- DropIndex
DROP INDEX "Return_returnNumber_key";

-- AlterTable
ALTER TABLE "Address" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "AdminAuditEntry" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "BlogCategory" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "BlogPost" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Bundle" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "BundleItem" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "CartSnapshot" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Category" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "ConsentEvent" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Coupon" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "HomepageBlock" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "HomepageHero" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "IngredientPin" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "LoyaltyAccount" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "LoyaltyTransaction" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "NewsletterSubscriber" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "OrderItem" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "ProductCrossSell" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "ProductIngredient" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "ProductVariant" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Redirect" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Return" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "ReturnItem" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Review" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "SiteSetting" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "StockNotificationRequest" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Subscription" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "SubscriptionLine" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Wishlist" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "WishlistProduct" ALTER COLUMN "tenantId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "BlogCategory_tenantId_slug_key" ON "BlogCategory"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_tenantId_slug_key" ON "BlogPost"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Bundle_tenantId_slug_key" ON "Bundle"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Category_tenantId_slug_key" ON "Category"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Category_tenantId_legacyWpId_key" ON "Category"("tenantId", "legacyWpId");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_tenantId_code_key" ON "Coupon"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_tenantId_email_key" ON "NewsletterSubscriber"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Order_tenantId_orderNumber_key" ON "Order"("tenantId", "orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Order_tenantId_paymentReference_key" ON "Order"("tenantId", "paymentReference");

-- CreateIndex
CREATE UNIQUE INDEX "Order_tenantId_legacyWpId_key" ON "Order"("tenantId", "legacyWpId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_tenantId_sku_key" ON "Product"("tenantId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "Product_tenantId_slug_key" ON "Product"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_tenantId_legacyWpId_key" ON "Product"("tenantId", "legacyWpId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_tenantId_sku_key" ON "ProductVariant"("tenantId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "Redirect_tenantId_fromPath_key" ON "Redirect"("tenantId", "fromPath");

-- CreateIndex
CREATE UNIQUE INDEX "Return_tenantId_returnNumber_key" ON "Return"("tenantId", "returnNumber");

-- AddForeignKey
ALTER TABLE "AdminAuditEntry" ADD CONSTRAINT "AdminAuditEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

