-- Korg 3b-1 (ADR 0028 D1 / 0030 D2): additive tenantId on the 32
-- tenant-owned models. NULLABLE + backfilled to tenant zero (biomax).
-- No NOT NULL, no composite uniques, no RLS yet — behaviour unchanged
-- (nothing reads/enforces tenantId until 3b-2/3b-3).

-- Category
ALTER TABLE "Category" ADD COLUMN "tenantId" TEXT;
UPDATE "Category" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'biomax') WHERE "tenantId" IS NULL;
CREATE INDEX "Category_tenantId_idx" ON "Category"("tenantId");
ALTER TABLE "Category" ADD CONSTRAINT "Category_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Product
ALTER TABLE "Product" ADD COLUMN "tenantId" TEXT;
UPDATE "Product" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'biomax') WHERE "tenantId" IS NULL;
CREATE INDEX "Product_tenantId_idx" ON "Product"("tenantId");
ALTER TABLE "Product" ADD CONSTRAINT "Product_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ProductIngredient
ALTER TABLE "ProductIngredient" ADD COLUMN "tenantId" TEXT;
UPDATE "ProductIngredient" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'biomax') WHERE "tenantId" IS NULL;
CREATE INDEX "ProductIngredient_tenantId_idx" ON "ProductIngredient"("tenantId");
ALTER TABLE "ProductIngredient" ADD CONSTRAINT "ProductIngredient_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ProductVariant
ALTER TABLE "ProductVariant" ADD COLUMN "tenantId" TEXT;
UPDATE "ProductVariant" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'biomax') WHERE "tenantId" IS NULL;
CREATE INDEX "ProductVariant_tenantId_idx" ON "ProductVariant"("tenantId");
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ProductCrossSell
ALTER TABLE "ProductCrossSell" ADD COLUMN "tenantId" TEXT;
UPDATE "ProductCrossSell" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'biomax') WHERE "tenantId" IS NULL;
CREATE INDEX "ProductCrossSell_tenantId_idx" ON "ProductCrossSell"("tenantId");
ALTER TABLE "ProductCrossSell" ADD CONSTRAINT "ProductCrossSell_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Review
ALTER TABLE "Review" ADD COLUMN "tenantId" TEXT;
UPDATE "Review" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'biomax') WHERE "tenantId" IS NULL;
CREATE INDEX "Review_tenantId_idx" ON "Review"("tenantId");
ALTER TABLE "Review" ADD CONSTRAINT "Review_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- BlogCategory
ALTER TABLE "BlogCategory" ADD COLUMN "tenantId" TEXT;
UPDATE "BlogCategory" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'biomax') WHERE "tenantId" IS NULL;
CREATE INDEX "BlogCategory_tenantId_idx" ON "BlogCategory"("tenantId");
ALTER TABLE "BlogCategory" ADD CONSTRAINT "BlogCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- BlogPost
ALTER TABLE "BlogPost" ADD COLUMN "tenantId" TEXT;
UPDATE "BlogPost" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'biomax') WHERE "tenantId" IS NULL;
CREATE INDEX "BlogPost_tenantId_idx" ON "BlogPost"("tenantId");
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Order
ALTER TABLE "Order" ADD COLUMN "tenantId" TEXT;
UPDATE "Order" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'biomax') WHERE "tenantId" IS NULL;
CREATE INDEX "Order_tenantId_idx" ON "Order"("tenantId");
ALTER TABLE "Order" ADD CONSTRAINT "Order_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- OrderItem
ALTER TABLE "OrderItem" ADD COLUMN "tenantId" TEXT;
UPDATE "OrderItem" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'biomax') WHERE "tenantId" IS NULL;
CREATE INDEX "OrderItem_tenantId_idx" ON "OrderItem"("tenantId");
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Address
ALTER TABLE "Address" ADD COLUMN "tenantId" TEXT;
UPDATE "Address" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'biomax') WHERE "tenantId" IS NULL;
CREATE INDEX "Address_tenantId_idx" ON "Address"("tenantId");
ALTER TABLE "Address" ADD CONSTRAINT "Address_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Wishlist
ALTER TABLE "Wishlist" ADD COLUMN "tenantId" TEXT;
UPDATE "Wishlist" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'biomax') WHERE "tenantId" IS NULL;
CREATE INDEX "Wishlist_tenantId_idx" ON "Wishlist"("tenantId");
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- WishlistProduct
ALTER TABLE "WishlistProduct" ADD COLUMN "tenantId" TEXT;
UPDATE "WishlistProduct" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'biomax') WHERE "tenantId" IS NULL;
CREATE INDEX "WishlistProduct_tenantId_idx" ON "WishlistProduct"("tenantId");
ALTER TABLE "WishlistProduct" ADD CONSTRAINT "WishlistProduct_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Coupon
ALTER TABLE "Coupon" ADD COLUMN "tenantId" TEXT;
UPDATE "Coupon" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'biomax') WHERE "tenantId" IS NULL;
CREATE INDEX "Coupon_tenantId_idx" ON "Coupon"("tenantId");
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SiteSetting
ALTER TABLE "SiteSetting" ADD COLUMN "tenantId" TEXT;
UPDATE "SiteSetting" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'biomax') WHERE "tenantId" IS NULL;
CREATE INDEX "SiteSetting_tenantId_idx" ON "SiteSetting"("tenantId");
ALTER TABLE "SiteSetting" ADD CONSTRAINT "SiteSetting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- NewsletterSubscriber
ALTER TABLE "NewsletterSubscriber" ADD COLUMN "tenantId" TEXT;
UPDATE "NewsletterSubscriber" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'biomax') WHERE "tenantId" IS NULL;
CREATE INDEX "NewsletterSubscriber_tenantId_idx" ON "NewsletterSubscriber"("tenantId");
ALTER TABLE "NewsletterSubscriber" ADD CONSTRAINT "NewsletterSubscriber_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CartSnapshot
ALTER TABLE "CartSnapshot" ADD COLUMN "tenantId" TEXT;
UPDATE "CartSnapshot" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'biomax') WHERE "tenantId" IS NULL;
CREATE INDEX "CartSnapshot_tenantId_idx" ON "CartSnapshot"("tenantId");
ALTER TABLE "CartSnapshot" ADD CONSTRAINT "CartSnapshot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Bundle
ALTER TABLE "Bundle" ADD COLUMN "tenantId" TEXT;
UPDATE "Bundle" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'biomax') WHERE "tenantId" IS NULL;
CREATE INDEX "Bundle_tenantId_idx" ON "Bundle"("tenantId");
ALTER TABLE "Bundle" ADD CONSTRAINT "Bundle_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- BundleItem
ALTER TABLE "BundleItem" ADD COLUMN "tenantId" TEXT;
UPDATE "BundleItem" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'biomax') WHERE "tenantId" IS NULL;
CREATE INDEX "BundleItem_tenantId_idx" ON "BundleItem"("tenantId");
ALTER TABLE "BundleItem" ADD CONSTRAINT "BundleItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- IngredientPin
ALTER TABLE "IngredientPin" ADD COLUMN "tenantId" TEXT;
UPDATE "IngredientPin" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'biomax') WHERE "tenantId" IS NULL;
CREATE INDEX "IngredientPin_tenantId_idx" ON "IngredientPin"("tenantId");
ALTER TABLE "IngredientPin" ADD CONSTRAINT "IngredientPin_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- HomepageBlock
ALTER TABLE "HomepageBlock" ADD COLUMN "tenantId" TEXT;
UPDATE "HomepageBlock" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'biomax') WHERE "tenantId" IS NULL;
CREATE INDEX "HomepageBlock_tenantId_idx" ON "HomepageBlock"("tenantId");
ALTER TABLE "HomepageBlock" ADD CONSTRAINT "HomepageBlock_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- StockNotificationRequest
ALTER TABLE "StockNotificationRequest" ADD COLUMN "tenantId" TEXT;
UPDATE "StockNotificationRequest" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'biomax') WHERE "tenantId" IS NULL;
CREATE INDEX "StockNotificationRequest_tenantId_idx" ON "StockNotificationRequest"("tenantId");
ALTER TABLE "StockNotificationRequest" ADD CONSTRAINT "StockNotificationRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ConsentEvent
ALTER TABLE "ConsentEvent" ADD COLUMN "tenantId" TEXT;
UPDATE "ConsentEvent" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'biomax') WHERE "tenantId" IS NULL;
CREATE INDEX "ConsentEvent_tenantId_idx" ON "ConsentEvent"("tenantId");
ALTER TABLE "ConsentEvent" ADD CONSTRAINT "ConsentEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Subscription
ALTER TABLE "Subscription" ADD COLUMN "tenantId" TEXT;
UPDATE "Subscription" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'biomax') WHERE "tenantId" IS NULL;
CREATE INDEX "Subscription_tenantId_idx" ON "Subscription"("tenantId");
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SubscriptionLine
ALTER TABLE "SubscriptionLine" ADD COLUMN "tenantId" TEXT;
UPDATE "SubscriptionLine" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'biomax') WHERE "tenantId" IS NULL;
CREATE INDEX "SubscriptionLine_tenantId_idx" ON "SubscriptionLine"("tenantId");
ALTER TABLE "SubscriptionLine" ADD CONSTRAINT "SubscriptionLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Return
ALTER TABLE "Return" ADD COLUMN "tenantId" TEXT;
UPDATE "Return" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'biomax') WHERE "tenantId" IS NULL;
CREATE INDEX "Return_tenantId_idx" ON "Return"("tenantId");
ALTER TABLE "Return" ADD CONSTRAINT "Return_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ReturnItem
ALTER TABLE "ReturnItem" ADD COLUMN "tenantId" TEXT;
UPDATE "ReturnItem" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'biomax') WHERE "tenantId" IS NULL;
CREATE INDEX "ReturnItem_tenantId_idx" ON "ReturnItem"("tenantId");
ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- HomepageHero
ALTER TABLE "HomepageHero" ADD COLUMN "tenantId" TEXT;
UPDATE "HomepageHero" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'biomax') WHERE "tenantId" IS NULL;
CREATE INDEX "HomepageHero_tenantId_idx" ON "HomepageHero"("tenantId");
ALTER TABLE "HomepageHero" ADD CONSTRAINT "HomepageHero_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- LoyaltyAccount
ALTER TABLE "LoyaltyAccount" ADD COLUMN "tenantId" TEXT;
UPDATE "LoyaltyAccount" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'biomax') WHERE "tenantId" IS NULL;
CREATE INDEX "LoyaltyAccount_tenantId_idx" ON "LoyaltyAccount"("tenantId");
ALTER TABLE "LoyaltyAccount" ADD CONSTRAINT "LoyaltyAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- LoyaltyTransaction
ALTER TABLE "LoyaltyTransaction" ADD COLUMN "tenantId" TEXT;
UPDATE "LoyaltyTransaction" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'biomax') WHERE "tenantId" IS NULL;
CREATE INDEX "LoyaltyTransaction_tenantId_idx" ON "LoyaltyTransaction"("tenantId");
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Redirect
ALTER TABLE "Redirect" ADD COLUMN "tenantId" TEXT;
UPDATE "Redirect" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'biomax') WHERE "tenantId" IS NULL;
CREATE INDEX "Redirect_tenantId_idx" ON "Redirect"("tenantId");
ALTER TABLE "Redirect" ADD CONSTRAINT "Redirect_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AdminAuditEntry
ALTER TABLE "AdminAuditEntry" ADD COLUMN "tenantId" TEXT;
UPDATE "AdminAuditEntry" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'biomax') WHERE "tenantId" IS NULL;
CREATE INDEX "AdminAuditEntry_tenantId_idx" ON "AdminAuditEntry"("tenantId");
ALTER TABLE "AdminAuditEntry" ADD CONSTRAINT "AdminAuditEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

