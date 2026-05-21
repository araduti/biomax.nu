-- Kine 3b-2 #3f: STRICT tenant isolation enforcement (the irreversible flip).
--
-- Drops the permissive `OR app.current_tenant_id() IS NULL` clause from
-- every tenant-owned table's RLS policy. After this migration:
--   * Every query MUST run inside withTenantRLS / tenantScope which sets
--     the GUC app.current_tenant_id.
--   * Queries outside a tenant context see ZERO rows (USING fails) and
--     cannot write (WITH CHECK fails).
--   * The kine_app runtime role (NOSUPERUSER NOBYPASSRLS) is bound by
--     these policies; only the privileged migrate role bypasses (DDL).
--
-- Pre-checks completed before applying:
--   * 33 owned tables have FORCE ROW LEVEL SECURITY
--   * tenantId is NOT NULL on every owned table (#3e shipped)
--   * APP_DATABASE_URL points at kine_app (NOSUPERUSER NOBYPASSRLS)
--   * No code path bypasses the seam (#3d shipped, the documented
--     klarna-webhook idempotency dispatch read is allow-listed inline)
--
-- After this migration the DB itself enforces isolation. The previous
-- soft enforcement (ESLint warn, in-code seam) becomes ESLint error in
-- the same slice.

ALTER POLICY "Address_tenant_isolation" ON "Address"
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

ALTER POLICY "AdminAuditEntry_tenant_isolation" ON "AdminAuditEntry"
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

ALTER POLICY "BlogCategory_tenant_isolation" ON "BlogCategory"
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

ALTER POLICY "BlogPost_tenant_isolation" ON "BlogPost"
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

ALTER POLICY "Bundle_tenant_isolation" ON "Bundle"
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

ALTER POLICY "BundleItem_tenant_isolation" ON "BundleItem"
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

ALTER POLICY "CartSnapshot_tenant_isolation" ON "CartSnapshot"
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

ALTER POLICY "Category_tenant_isolation" ON "Category"
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

ALTER POLICY "ConsentEvent_tenant_isolation" ON "ConsentEvent"
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

ALTER POLICY "Coupon_tenant_isolation" ON "Coupon"
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

ALTER POLICY "HomepageBlock_tenant_isolation" ON "HomepageBlock"
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

ALTER POLICY "HomepageHero_tenant_isolation" ON "HomepageHero"
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

ALTER POLICY "IngredientPin_tenant_isolation" ON "IngredientPin"
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

ALTER POLICY "LoyaltyAccount_tenant_isolation" ON "LoyaltyAccount"
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

ALTER POLICY "LoyaltyTransaction_tenant_isolation" ON "LoyaltyTransaction"
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

ALTER POLICY "NewsletterSubscriber_tenant_isolation" ON "NewsletterSubscriber"
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

ALTER POLICY "Order_tenant_isolation" ON "Order"
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

ALTER POLICY "OrderItem_tenant_isolation" ON "OrderItem"
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

ALTER POLICY "Product_tenant_isolation" ON "Product"
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

ALTER POLICY "ProductCrossSell_tenant_isolation" ON "ProductCrossSell"
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

ALTER POLICY "ProductIngredient_tenant_isolation" ON "ProductIngredient"
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

ALTER POLICY "ProductVariant_tenant_isolation" ON "ProductVariant"
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

ALTER POLICY "Redirect_tenant_isolation" ON "Redirect"
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

ALTER POLICY "Return_tenant_isolation" ON "Return"
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

ALTER POLICY "ReturnItem_tenant_isolation" ON "ReturnItem"
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

ALTER POLICY "Review_tenant_isolation" ON "Review"
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

ALTER POLICY "SiteSetting_tenant_isolation" ON "SiteSetting"
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

ALTER POLICY "StockNotificationRequest_tenant_isolation" ON "StockNotificationRequest"
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

ALTER POLICY "Subscription_tenant_isolation" ON "Subscription"
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

ALTER POLICY "SubscriptionLine_tenant_isolation" ON "SubscriptionLine"
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

ALTER POLICY "TenantPaymentCredential_tenant_isolation" ON "TenantPaymentCredential"
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

ALTER POLICY "Wishlist_tenant_isolation" ON "Wishlist"
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

ALTER POLICY "WishlistProduct_tenant_isolation" ON "WishlistProduct"
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

