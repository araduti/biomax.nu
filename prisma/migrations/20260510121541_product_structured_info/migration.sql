-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "ingredientList" JSONB,
ADD COLUMN     "storage" TEXT,
ADD COLUMN     "warnings" TEXT;
