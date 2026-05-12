-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "heightCm" DECIMAL(6,1),
ADD COLUMN     "internalNote" TEXT,
ADD COLUMN     "lengthCm" DECIMAL(6,1),
ADD COLUMN     "lowStockThreshold" INTEGER,
ADD COLUMN     "widthCm" DECIMAL(6,1);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);
