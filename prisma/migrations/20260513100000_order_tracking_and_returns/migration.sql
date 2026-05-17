-- Order: tracking + carrier + service-point + cancellation columns.
ALTER TABLE "Order"
  ADD COLUMN "carrier"            TEXT,
  ADD COLUMN "trackingNumber"     TEXT,
  ADD COLUMN "labelPdfUrl"        TEXT,
  ADD COLUMN "servicePointId"     TEXT,
  ADD COLUMN "servicePointName"   TEXT,
  ADD COLUMN "trackingToken"      TEXT,
  ADD COLUMN "cancelledAt"        TIMESTAMP(3),
  ADD COLUMN "cancellationReason" TEXT;

-- Tracking-number lookup for the public /spara/[ref] page when used
-- against the carrier reference instead of the token.
CREATE INDEX "Order_trackingNumber_idx" ON "Order"("trackingNumber");

-- trackingToken must be globally unique — it's the only auth for the
-- public tracking link. Postgres treats NULLs as distinct so existing
-- rows with NULL tokens won't collide.
CREATE UNIQUE INDEX "Order_trackingToken_key" ON "Order"("trackingToken");

-- Return moderation queue.
CREATE TYPE "ReturnStatus" AS ENUM (
  'REQUESTED',
  'APPROVED',
  'RECEIVED',
  'REFUNDED',
  'REJECTED'
);

CREATE TABLE "Return" (
  "id"              TEXT NOT NULL,
  "returnNumber"    TEXT NOT NULL,
  "orderId"         TEXT NOT NULL,
  "userId"          TEXT,
  "status"          "ReturnStatus" NOT NULL DEFAULT 'REQUESTED',
  "reason"          TEXT,
  "refundAmount"    DECIMAL(10,2),
  "refundReference" TEXT,
  "refundedAt"      TIMESTAMP(3),
  "internalNote"    TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Return_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Return_returnNumber_key" ON "Return"("returnNumber");
CREATE INDEX "Return_orderId_idx" ON "Return"("orderId");
CREATE INDEX "Return_userId_idx" ON "Return"("userId");
CREATE INDEX "Return_status_createdAt_idx" ON "Return"("status", "createdAt");

ALTER TABLE "Return"
  ADD CONSTRAINT "Return_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "Return_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ReturnItem" (
  "id"           TEXT NOT NULL,
  "returnId"     TEXT NOT NULL,
  "orderItemId"  TEXT NOT NULL,
  "quantity"     INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "ReturnItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReturnItem_returnId_orderItemId_key"
  ON "ReturnItem"("returnId", "orderItemId");

ALTER TABLE "ReturnItem"
  ADD CONSTRAINT "ReturnItem_returnId_fkey"
    FOREIGN KEY ("returnId") REFERENCES "Return"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ReturnItem_orderItemId_fkey"
    FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
