-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "bundleDiscountPercent" INTEGER,
ADD COLUMN     "bundleId" TEXT,
ADD COLUMN     "bundleName" TEXT,
ADD COLUMN     "bundleSlug" TEXT;
