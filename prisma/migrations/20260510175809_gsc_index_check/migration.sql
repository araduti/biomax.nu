-- CreateTable
CREATE TABLE "GscIndexCheck" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "coverageState" TEXT,
    "robotsState" TEXT,
    "indexingState" TEXT,
    "pageFetchState" TEXT,
    "lastCrawlTime" TIMESTAMP(3),
    "googleCanonical" TEXT,
    "userCanonical" TEXT,
    "crawledAs" TEXT,
    "richResultsVerdict" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GscIndexCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GscIndexCheck_url_key" ON "GscIndexCheck"("url");

-- CreateIndex
CREATE INDEX "GscIndexCheck_verdict_idx" ON "GscIndexCheck"("verdict");

-- CreateIndex
CREATE INDEX "GscIndexCheck_checkedAt_idx" ON "GscIndexCheck"("checkedAt");
