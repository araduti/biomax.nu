-- Korg 3b-2 sub-slice #3a (ADR 0028 D1 / ADR 0032): extend the
-- Product pilot's RLS coverage to every remaining tenant-owned table.
--
-- Each table gets ENABLE + FORCE ROW LEVEL SECURITY plus a permissive
-- transitional policy in the exact shape of the Product pilot:
--
--   USING / WITH CHECK (
--     app.current_tenant_id() IS NULL          -- legacy unwrapped path
--     OR "tenantId" = app.current_tenant_id()  -- wrapped path
--   )
--
-- The `IS NULL` branch keeps every callsite that hasn't been migrated
-- through the tenant seam yet working — pure additive, no behaviour
-- change. The final lock-down (3b-2 #3f) drops that branch in one
-- per-table ALTER POLICY, making the policy strict.
--
-- 32 tables included here (Product already pilot-protected, excluded).
-- Models with a tenantId column verified via:
--   awk '/^model /{m=$2} /^  tenantId/{print m}' prisma/schema.prisma
--
-- Ordering: alphabetical by table name. No FK ordering needed — RLS
-- is per-table and the policies do not cross-reference.
--
-- FORCE RLS still does NOT apply to a superuser / BYPASSRLS role
-- (only the korg_app runtime role is bound by it). Migrations
-- continue to run as the privileged role (DATABASE_URL) — that's
-- intentional and unchanged from the pilot.

-- ── Address ───────────────────────────────────────────────────────
ALTER TABLE "Address" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Address" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Address_tenant_isolation" ON "Address"
  USING      (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id())
  WITH CHECK (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id());

-- ── AdminAuditEntry ───────────────────────────────────────────────
ALTER TABLE "AdminAuditEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminAuditEntry" FORCE ROW LEVEL SECURITY;
CREATE POLICY "AdminAuditEntry_tenant_isolation" ON "AdminAuditEntry"
  USING      (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id())
  WITH CHECK (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id());

-- ── BlogCategory ──────────────────────────────────────────────────
ALTER TABLE "BlogCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BlogCategory" FORCE ROW LEVEL SECURITY;
CREATE POLICY "BlogCategory_tenant_isolation" ON "BlogCategory"
  USING      (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id())
  WITH CHECK (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id());

-- ── BlogPost ──────────────────────────────────────────────────────
ALTER TABLE "BlogPost" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BlogPost" FORCE ROW LEVEL SECURITY;
CREATE POLICY "BlogPost_tenant_isolation" ON "BlogPost"
  USING      (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id())
  WITH CHECK (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id());

-- ── Bundle ────────────────────────────────────────────────────────
ALTER TABLE "Bundle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Bundle" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Bundle_tenant_isolation" ON "Bundle"
  USING      (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id())
  WITH CHECK (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id());

-- ── BundleItem ────────────────────────────────────────────────────
ALTER TABLE "BundleItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BundleItem" FORCE ROW LEVEL SECURITY;
CREATE POLICY "BundleItem_tenant_isolation" ON "BundleItem"
  USING      (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id())
  WITH CHECK (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id());

-- ── CartSnapshot ──────────────────────────────────────────────────
ALTER TABLE "CartSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CartSnapshot" FORCE ROW LEVEL SECURITY;
CREATE POLICY "CartSnapshot_tenant_isolation" ON "CartSnapshot"
  USING      (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id())
  WITH CHECK (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id());

-- ── Category ──────────────────────────────────────────────────────
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Category_tenant_isolation" ON "Category"
  USING      (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id())
  WITH CHECK (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id());

-- ── ConsentEvent ──────────────────────────────────────────────────
ALTER TABLE "ConsentEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConsentEvent" FORCE ROW LEVEL SECURITY;
CREATE POLICY "ConsentEvent_tenant_isolation" ON "ConsentEvent"
  USING      (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id())
  WITH CHECK (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id());

-- ── Coupon ────────────────────────────────────────────────────────
ALTER TABLE "Coupon" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Coupon" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Coupon_tenant_isolation" ON "Coupon"
  USING      (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id())
  WITH CHECK (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id());

-- ── HomepageBlock ─────────────────────────────────────────────────
ALTER TABLE "HomepageBlock" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HomepageBlock" FORCE ROW LEVEL SECURITY;
CREATE POLICY "HomepageBlock_tenant_isolation" ON "HomepageBlock"
  USING      (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id())
  WITH CHECK (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id());

-- ── HomepageHero ──────────────────────────────────────────────────
ALTER TABLE "HomepageHero" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HomepageHero" FORCE ROW LEVEL SECURITY;
CREATE POLICY "HomepageHero_tenant_isolation" ON "HomepageHero"
  USING      (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id())
  WITH CHECK (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id());

-- ── IngredientPin ─────────────────────────────────────────────────
ALTER TABLE "IngredientPin" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IngredientPin" FORCE ROW LEVEL SECURITY;
CREATE POLICY "IngredientPin_tenant_isolation" ON "IngredientPin"
  USING      (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id())
  WITH CHECK (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id());

-- ── LoyaltyAccount ────────────────────────────────────────────────
ALTER TABLE "LoyaltyAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoyaltyAccount" FORCE ROW LEVEL SECURITY;
CREATE POLICY "LoyaltyAccount_tenant_isolation" ON "LoyaltyAccount"
  USING      (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id())
  WITH CHECK (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id());

-- ── LoyaltyTransaction ────────────────────────────────────────────
ALTER TABLE "LoyaltyTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoyaltyTransaction" FORCE ROW LEVEL SECURITY;
CREATE POLICY "LoyaltyTransaction_tenant_isolation" ON "LoyaltyTransaction"
  USING      (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id())
  WITH CHECK (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id());

-- ── NewsletterSubscriber ──────────────────────────────────────────
ALTER TABLE "NewsletterSubscriber" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NewsletterSubscriber" FORCE ROW LEVEL SECURITY;
CREATE POLICY "NewsletterSubscriber_tenant_isolation" ON "NewsletterSubscriber"
  USING      (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id())
  WITH CHECK (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id());

-- ── Order ─────────────────────────────────────────────────────────
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Order_tenant_isolation" ON "Order"
  USING      (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id())
  WITH CHECK (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id());

-- ── OrderItem ─────────────────────────────────────────────────────
ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderItem" FORCE ROW LEVEL SECURITY;
CREATE POLICY "OrderItem_tenant_isolation" ON "OrderItem"
  USING      (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id())
  WITH CHECK (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id());

-- ── ProductCrossSell ──────────────────────────────────────────────
ALTER TABLE "ProductCrossSell" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductCrossSell" FORCE ROW LEVEL SECURITY;
CREATE POLICY "ProductCrossSell_tenant_isolation" ON "ProductCrossSell"
  USING      (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id())
  WITH CHECK (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id());

-- ── ProductIngredient ─────────────────────────────────────────────
ALTER TABLE "ProductIngredient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductIngredient" FORCE ROW LEVEL SECURITY;
CREATE POLICY "ProductIngredient_tenant_isolation" ON "ProductIngredient"
  USING      (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id())
  WITH CHECK (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id());

-- ── ProductVariant ────────────────────────────────────────────────
ALTER TABLE "ProductVariant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductVariant" FORCE ROW LEVEL SECURITY;
CREATE POLICY "ProductVariant_tenant_isolation" ON "ProductVariant"
  USING      (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id())
  WITH CHECK (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id());

-- ── Redirect ──────────────────────────────────────────────────────
ALTER TABLE "Redirect" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Redirect" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Redirect_tenant_isolation" ON "Redirect"
  USING      (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id())
  WITH CHECK (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id());

-- ── Return ────────────────────────────────────────────────────────
ALTER TABLE "Return" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Return" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Return_tenant_isolation" ON "Return"
  USING      (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id())
  WITH CHECK (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id());

-- ── ReturnItem ────────────────────────────────────────────────────
ALTER TABLE "ReturnItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReturnItem" FORCE ROW LEVEL SECURITY;
CREATE POLICY "ReturnItem_tenant_isolation" ON "ReturnItem"
  USING      (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id())
  WITH CHECK (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id());

-- ── Review ────────────────────────────────────────────────────────
ALTER TABLE "Review" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Review" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Review_tenant_isolation" ON "Review"
  USING      (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id())
  WITH CHECK (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id());

-- ── SiteSetting ───────────────────────────────────────────────────
ALTER TABLE "SiteSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SiteSetting" FORCE ROW LEVEL SECURITY;
CREATE POLICY "SiteSetting_tenant_isolation" ON "SiteSetting"
  USING      (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id())
  WITH CHECK (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id());

-- ── StockNotificationRequest ──────────────────────────────────────
ALTER TABLE "StockNotificationRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockNotificationRequest" FORCE ROW LEVEL SECURITY;
CREATE POLICY "StockNotificationRequest_tenant_isolation" ON "StockNotificationRequest"
  USING      (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id())
  WITH CHECK (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id());

-- ── Subscription ──────────────────────────────────────────────────
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Subscription_tenant_isolation" ON "Subscription"
  USING      (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id())
  WITH CHECK (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id());

-- ── SubscriptionLine ──────────────────────────────────────────────
ALTER TABLE "SubscriptionLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SubscriptionLine" FORCE ROW LEVEL SECURITY;
CREATE POLICY "SubscriptionLine_tenant_isolation" ON "SubscriptionLine"
  USING      (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id())
  WITH CHECK (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id());

-- ── TenantPaymentCredential (ADR 0034) ────────────────────────────
ALTER TABLE "TenantPaymentCredential" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TenantPaymentCredential" FORCE ROW LEVEL SECURITY;
CREATE POLICY "TenantPaymentCredential_tenant_isolation" ON "TenantPaymentCredential"
  USING      (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id())
  WITH CHECK (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id());

-- ── Wishlist ──────────────────────────────────────────────────────
ALTER TABLE "Wishlist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Wishlist" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Wishlist_tenant_isolation" ON "Wishlist"
  USING      (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id())
  WITH CHECK (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id());

-- ── WishlistProduct ───────────────────────────────────────────────
ALTER TABLE "WishlistProduct" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WishlistProduct" FORCE ROW LEVEL SECURITY;
CREATE POLICY "WishlistProduct_tenant_isolation" ON "WishlistProduct"
  USING      (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id())
  WITH CHECK (app.current_tenant_id() IS NULL OR "tenantId" = app.current_tenant_id());
