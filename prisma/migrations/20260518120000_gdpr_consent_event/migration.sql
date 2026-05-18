-- ADR 0023: append-only server-side consent proof.

-- CreateTable
CREATE TABLE "ConsentEvent" (
    "id" TEXT NOT NULL,
    "subjectKey" TEXT NOT NULL,
    "userId" TEXT,
    "analytics" BOOLEAN NOT NULL,
    "marketing" BOOLEAN NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsentEvent_subjectKey_createdAt_idx" ON "ConsentEvent"("subjectKey", "createdAt");

-- CreateIndex
CREATE INDEX "ConsentEvent_userId_createdAt_idx" ON "ConsentEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ConsentEvent_createdAt_idx" ON "ConsentEvent"("createdAt");

-- ADR 0024: retention purge range-scans StockNotificationRequest on age.
-- CreateIndex
CREATE INDEX "StockNotificationRequest_createdAt_idx" ON "StockNotificationRequest"("createdAt");
