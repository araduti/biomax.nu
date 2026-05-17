-- Hand-written (not `prisma migrate diff`): the auto-diff would DROP &
-- recreate User.role, wiping every user's role. The String values
-- already match the enum labels, so an in-place USING cast is safe and
-- lossless.

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('customer', 'admin');

-- AlterTable: String -> UserRole, preserving existing values
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole" USING ("role"::"UserRole");
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'customer';

-- CreateIndex: composite indexes for the public listing / cron filters
CREATE INDEX "Product_status_totalSales_idx" ON "Product"("status", "totalSales");
CREATE INDEX "Product_status_publishedAt_idx" ON "Product"("status", "publishedAt");
CREATE INDEX "Product_status_updatedAt_idx" ON "Product"("status", "updatedAt");
CREATE INDEX "Order_status_reviewRequestSentAt_idx" ON "Order"("status", "reviewRequestSentAt");
CREATE INDEX "OrderItem_replenishmentSentAt_idx" ON "OrderItem"("replenishmentSentAt");
