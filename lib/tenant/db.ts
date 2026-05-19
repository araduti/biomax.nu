import type { Prisma } from "@prisma/client";
import { withTenantRLS } from "./rls";
import { requireTenantId } from "./context";
import { currentTenant } from "./index";

/**
 * THE sanctioned data-access seam for tenant-owned models
 * (ADR 0032 D2). Every read/write of a tenant-scoped model MUST go
 * through one of these; direct `prisma.<ownedModel>` / raw `prisma`
 * import outside the seam + per-domain repositories is banned by
 * ESLint (warning during the 3b-3d migration, hard error at the 3b-2
 * lock-down). Each runs inside `withTenantRLS` → `SET LOCAL
 * app.current_tenant_id` → FORCE RLS enforces isolation at the DB
 * (fail-safe: forget the scope → zero rows / write error, never
 * another tenant's data).
 *
 *   tenantScope(id, fn)     — explicit tenant id (RSC: id from
 *                             currentTenant()).
 *   currentTenantScope(fn)  — tenant from the ALS request context
 *                             (server actions / route handlers /
 *                             per-tenant cron iterations that called
 *                             runWithTenantContext).
 *   hostTenantScope(fn)     — RSC ergonomic: resolve the tenant from
 *                             the request Host, then scope.
 */

export function tenantScope<T>(
  tenantId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return withTenantRLS(tenantId, fn);
}

export function currentTenantScope<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return withTenantRLS(requireTenantId(), fn);
}

export async function hostTenantScope<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  const t = await currentTenant();
  return withTenantRLS(t.id, fn);
}
