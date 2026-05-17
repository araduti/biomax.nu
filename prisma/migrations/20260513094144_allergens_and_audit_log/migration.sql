-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "allergens" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "AdminAuditEntry" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "diff" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminAuditEntry_action_createdAt_idx" ON "AdminAuditEntry"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditEntry_entityType_entityId_idx" ON "AdminAuditEntry"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AdminAuditEntry_actorId_createdAt_idx" ON "AdminAuditEntry"("actorId", "createdAt");
