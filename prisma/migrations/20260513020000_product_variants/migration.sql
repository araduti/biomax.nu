-- Product variants: per-size / per-strength SKU rows.
CREATE TABLE "ProductVariant" (
  "id"             TEXT PRIMARY KEY,
  "productId"      TEXT NOT NULL,
  "sku"            TEXT NOT NULL,
  "label"          TEXT NOT NULL,
  "position"       INTEGER NOT NULL DEFAULT 0,
  "price"          DECIMAL(10, 2) NOT NULL,
  "compareAtPrice" DECIMAL(10, 2),
  "stock"          INTEGER NOT NULL DEFAULT 0,
  "manageStock"    BOOLEAN NOT NULL DEFAULT true,
  "weight"         DECIMAL(8, 3),
  "isDefault"      BOOLEAN NOT NULL DEFAULT false,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductVariant_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");
CREATE INDEX "ProductVariant_productId_position_idx" ON "ProductVariant"("productId", "position");

-- OrderItem: variant references frozen at order time.
ALTER TABLE "OrderItem"
  ADD COLUMN "variantId"    TEXT,
  ADD COLUMN "variantLabel" TEXT;
