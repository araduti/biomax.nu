/*
  Warnings:

  - You are about to drop the column `unsubscribed` on the `NewsletterSubscriber` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "SeoHealthLevel" AS ENUM ('COMPLETE', 'PARTIAL', 'NEEDS_WORK');

-- Backfill: any subscriber with the legacy `unsubscribed=true` bool but no
-- `unsubscribedAt` timestamp gets the timestamp set to consentedAt (best
-- proxy for "they unsubscribed at some unknown point after signup"). After
-- this, every lifecycle check that only consults `unsubscribedAt` is correct.
UPDATE "NewsletterSubscriber"
   SET "unsubscribedAt" = COALESCE("unsubscribedAt", "consentedAt")
 WHERE "unsubscribed" = true
   AND "unsubscribedAt" IS NULL;

-- AlterTable
ALTER TABLE "NewsletterSubscriber" DROP COLUMN "unsubscribed";

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "taxRateBp" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "seoHealthLevel" "SeoHealthLevel";

-- CreateTable
CREATE TABLE "ProductIngredient" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "ingredientSlug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductIngredient_ingredientSlug_idx" ON "ProductIngredient"("ingredientSlug");

-- CreateIndex
CREATE UNIQUE INDEX "ProductIngredient_productId_ingredientSlug_key" ON "ProductIngredient"("productId", "ingredientSlug");

-- CreateIndex
CREATE INDEX "Address_userId_idx" ON "Address"("userId");

-- AddForeignKey
ALTER TABLE "ProductIngredient" ADD CONSTRAINT "ProductIngredient_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
