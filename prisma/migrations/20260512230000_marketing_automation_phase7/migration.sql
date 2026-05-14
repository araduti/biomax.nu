-- Phase 7 marketing automation: subscriber state, cart snapshots, stock notifications, replenishment.

-- NewsletterSubscriber: per-flow state + unsubscribe token.
ALTER TABLE "NewsletterSubscriber"
  ADD COLUMN "unsubscribedAt" TIMESTAMP(3),
  ADD COLUMN "unsubscribeToken" TEXT,
  ADD COLUMN "welcomeSeriesStage" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "welcomeSeriesStartedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "NewsletterSubscriber_unsubscribeToken_key"
  ON "NewsletterSubscriber"("unsubscribeToken");

-- OrderItem: replenishment-reminder flag.
ALTER TABLE "OrderItem"
  ADD COLUMN "replenishmentSentAt" TIMESTAMP(3);

-- CartSnapshot: abandoned-cart capture.
CREATE TABLE "CartSnapshot" (
  "id"                  TEXT PRIMARY KEY,
  "email"               TEXT NOT NULL,
  "userId"              TEXT,
  "items"               JSONB NOT NULL,
  "subtotalSek"         DECIMAL(10, 2) NOT NULL,
  "recoveryToken"       TEXT NOT NULL,
  "firstEmailSentAt"    TIMESTAMP(3),
  "secondEmailSentAt"   TIMESTAMP(3),
  "recoveredAt"         TIMESTAMP(3),
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "CartSnapshot_recoveryToken_key" ON "CartSnapshot"("recoveryToken");
CREATE INDEX "CartSnapshot_email_idx" ON "CartSnapshot"("email");
CREATE INDEX "CartSnapshot_createdAt_idx" ON "CartSnapshot"("createdAt");

-- StockNotificationRequest: notify-me-when-back-in-stock.
CREATE TABLE "StockNotificationRequest" (
  "id"          TEXT PRIMARY KEY,
  "productId"   TEXT NOT NULL,
  "email"       TEXT NOT NULL,
  "fulfilledAt" TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockNotificationRequest_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "StockNotificationRequest_productId_email_key"
  ON "StockNotificationRequest"("productId", "email");
CREATE INDEX "StockNotificationRequest_productId_fulfilledAt_idx"
  ON "StockNotificationRequest"("productId", "fulfilledAt");
