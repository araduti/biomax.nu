-- CreateTable
CREATE TABLE "UptimeProbe" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "httpStatus" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "origin" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UptimeProbe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UptimeProbe_url_checkedAt_idx" ON "UptimeProbe"("url", "checkedAt");

-- CreateIndex
CREATE INDEX "UptimeProbe_checkedAt_idx" ON "UptimeProbe"("checkedAt");

-- CreateIndex
CREATE INDEX "UptimeProbe_status_checkedAt_idx" ON "UptimeProbe"("status", "checkedAt");
