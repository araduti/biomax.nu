-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "dateReviewed" TIMESTAMP(3),
ADD COLUMN     "ogDescription" TEXT,
ADD COLUMN     "ogImageUrl" TEXT,
ADD COLUMN     "ogTitle" TEXT;
