-- CreateTable
CREATE TABLE "WebVital" (
    "id" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "sampleId" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "navigationType" TEXT,
    "connection" TEXT,
    "device" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebVital_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebVital_sampleId_key" ON "WebVital"("sampleId");

-- CreateIndex
CREATE INDEX "WebVital_metric_route_createdAt_idx" ON "WebVital"("metric", "route", "createdAt");

-- CreateIndex
CREATE INDEX "WebVital_createdAt_idx" ON "WebVital"("createdAt");
