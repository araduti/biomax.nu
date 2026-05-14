-- Bundles ("Köp tillsammans"-paket)
CREATE TABLE "Bundle" (
  "id"              TEXT PRIMARY KEY,
  "slug"            TEXT NOT NULL,
  "name"            TEXT NOT NULL,
  "description"     TEXT,
  "discountPercent" INTEGER NOT NULL DEFAULT 10,
  "active"          BOOLEAN NOT NULL DEFAULT true,
  "position"        INTEGER NOT NULL DEFAULT 0,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "Bundle_slug_key" ON "Bundle"("slug");
CREATE INDEX "Bundle_active_position_idx" ON "Bundle"("active", "position");

CREATE TABLE "BundleItem" (
  "id"        TEXT PRIMARY KEY,
  "bundleId"  TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "position"  INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "BundleItem_bundleId_fkey"
    FOREIGN KEY ("bundleId") REFERENCES "Bundle"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BundleItem_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "BundleItem_bundleId_productId_key" ON "BundleItem"("bundleId", "productId");
CREATE INDEX "BundleItem_bundleId_position_idx" ON "BundleItem"("bundleId", "position");

-- Homepage editorial blocks.
CREATE TABLE "HomepageBlock" (
  "id"        TEXT PRIMARY KEY,
  "kind"      TEXT NOT NULL,
  "payload"   JSONB NOT NULL,
  "position"  INTEGER NOT NULL DEFAULT 0,
  "active"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX "HomepageBlock_active_position_idx" ON "HomepageBlock"("active", "position");
