-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "authorName" TEXT,
ADD COLUMN     "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "storeRespondedAt" TIMESTAMP(3),
ADD COLUMN     "storeResponse" TEXT;

-- CreateIndex
CREATE INDEX "Review_productId_status_createdAt_idx" ON "Review"("productId", "status", "createdAt");
