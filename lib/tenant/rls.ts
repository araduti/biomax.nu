import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Tenant Row-Level-Security seam (ADR 0028 D1 — the Watchtower-proven
 * pattern, `packages/db/src/rls.ts`).
 *
 * Runs `fn` inside a Prisma interactive transaction that first issues
 * `SET LOCAL app.current_tenant_id = '<id>'`. **SET LOCAL** scopes the
 * GUC to this transaction only — it is cleared on commit/rollback and
 * therefore *cannot* leak across pooled `pg` connections (the failure
 * mode a bare session GUC would have). FORCE ROW LEVEL SECURITY
 * policies (added per-model in a later sub-slice) read it via
 * `app.current_tenant_id()`.
 *
 * 3b-3 foundation: defined now, not yet wired into the prisma proxy /
 * call sites and no RLS policy enforces it yet — additive.
 */

// tenant ids are Prisma cuids: [a-z0-9]+. Validate before interpolating
// (SET does not accept bind params — $executeRawUnsafe is required).
const SAFE_TENANT_ID = /^[a-z0-9]+$/i;

export async function withTenantRLS<T>(
  tenantId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: { timeoutMs?: number; maxWaitMs?: number }
): Promise<T> {
  if (!tenantId || !SAFE_TENANT_ID.test(tenantId)) {
    throw new Error(
      `withTenantRLS: invalid tenantId "${tenantId}" (expected a cuid).`
    );
  }
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(
        `SET LOCAL app.current_tenant_id = '${tenantId}'`
      );
      return fn(tx);
    },
    options
      ? {
          ...(options.timeoutMs !== undefined
            ? { timeout: options.timeoutMs }
            : {}),
          ...(options.maxWaitMs !== undefined
            ? { maxWait: options.maxWaitMs }
            : {}),
        }
      : undefined
  );
}
