-- Korg 3b-3e (ADR 0034 / ADR 0028 D4 / ADR 0026 §4): per-tenant
-- payment credential store.
--
-- Additive only — no existing table is touched. Behaviour is unchanged
-- until rows are seeded (ADR 0034 D4: tenant zero falls back to env).
--
-- DELIBERATELY *NO* ROW LEVEL SECURITY on this table (ADR 0034 D2).
-- It is platform-plane bootstrap config, the same class as "Tenant":
-- the push webhook resolves *which* tenant from this very table, so it
-- cannot be gated on a tenant context that does not exist yet. It joins
-- the ADR 0032 D2 "outside the seam" list. Confidentiality is provided
-- by encryption at rest (secrets are sealed before INSERT —
-- lib/security/secret-box.ts), NOT by RLS. The runtime `korg_app` role
-- gets DML on this table via the ALTER DEFAULT PRIVILEGES set in
-- 20260519180000_app_role_rls (it must read it with no tenant context).

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('TEST', 'LIVE');

-- CreateTable
CREATE TABLE "TenantPaymentCredential" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'KLARNA',
    "apiKeyId" TEXT NOT NULL,
    "apiSecretEnc" TEXT NOT NULL,
    "webhookSecretEnc" TEXT,
    "baseUrl" TEXT NOT NULL,
    "mode" "PaymentMode" NOT NULL DEFAULT 'TEST',
    "encVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantPaymentCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantPaymentCredential_tenantId_key" ON "TenantPaymentCredential"("tenantId");

-- CreateIndex
CREATE INDEX "TenantPaymentCredential_provider_idx" ON "TenantPaymentCredential"("provider");

-- AddForeignKey
ALTER TABLE "TenantPaymentCredential" ADD CONSTRAINT "TenantPaymentCredential_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
