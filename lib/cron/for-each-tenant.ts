/**
 * `forEachActiveTenant` — the single sanctioned wrapper for cron / webhook
 * routes that execute *without* a request-bound tenant context (no Host
 * header, no per-request ALS frame). It drives each ACTIVE tenant
 * through `tenantScope` so every owned-model read/write inside the
 * callback is RLS-isolated, FORCE-checked, and cascade-safe (ADR 0028 /
 * 0032).
 *
 *   - The dispatch query (`tenant.findMany`) runs OUTSIDE any scope —
 *     `Tenant` is intentionally NOT in the ESLint ban list because it
 *     IS the dispatch table.
 *   - Per-tenant errors are caught and emitted as a structured
 *     `console.warn` with `{cronName, tenantId, slug, error}`. They do
 *     NOT abort the run — a poisoned tenant must not block the rest.
 *     They DO bump the `failed` counter so the route handler's response
 *     reflects partial failure to the operator.
 *   - No CRON_SECRET / token check here — that contract is per-route
 *     (different auth headers) and stays at the GET handler boundary.
 *   - No `tenantId` literal sneaks into the callback's payload — the
 *     `SET LOCAL app.current_tenant_id` GUC + RLS WITH CHECK enforces
 *     it. Callbacks just call `tx.<ownedModel>.*` and the database
 *     does the rest.
 *
 * Lock-down note (sub-slice 3b-2 #3f): once the permissive
 * `OR app.current_tenant_id() IS NULL` clause is dropped, any cron that
 * bypasses this helper will see zero rows / write errors. Crons MUST
 * route through here before #3f flips.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withTenantRLS } from "@/lib/tenant/rls";

export type ForEachTenantSummary = {
  ok: number;
  failed: number;
  errors: Array<{ tenantId: string; slug: string; error: string }>;
};

export type ForEachTenantContext = {
  id: string;
  slug: string;
};

export type ForEachTenantOptions = {
  /**
   * Per-tenant Prisma interactive-tx timeout (ms). Default 5000 (Prisma
   * default). Crons that do external I/O inside the callback (HTTP to
   * Kustom OM, transactional email API) must raise this — the tx stays
   * open until the callback resolves, and a hung network call past the
   * timeout aborts with `Transaction already closed`.
   *
   * Rule of thumb:
   *   - pure DB cron (data-retention, welcome-series writes only)  → default
   *   - cron that calls a 3rd-party API in the loop                → 60_000
   *   - cron with many sendTransactional + many DB updates         → 120_000
   */
  txTimeoutMs?: number;
  /** Per-tenant Prisma interactive-tx maxWait (ms). Default 2000. */
  txMaxWaitMs?: number;
};

/**
 * Run `fn` once per ACTIVE tenant inside a per-tenant `tenantScope`
 * transaction. The `tx` parameter is a Prisma transaction client that
 * already has `SET LOCAL app.current_tenant_id` applied — every
 * `tx.<ownedModel>.*` call is RLS-scoped automatically.
 *
 * @param cronName  Stable identifier used in structured warn logs
 *                  (e.g. "welcome-series", "data-retention",
 *                  "webhooks/brevo"). Lets operators grep failures.
 * @param fn        Per-tenant work. Receives the scoped tx + a
 *                  `{id, slug}` tenant view (no extra fields by design —
 *                  add only when a cron actually needs them).
 */
export async function forEachActiveTenant(
  cronName: string,
  fn: (
    tx: Prisma.TransactionClient,
    tenant: ForEachTenantContext
  ) => Promise<void>,
  options?: ForEachTenantOptions
): Promise<ForEachTenantSummary> {
  // Dispatch query — Tenant is not owned; reading it outside a scope is
  // the correct call (and is NOT flagged by the no-restricted-syntax
  // owned-model selector).
  const tenants = await prisma.tenant.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, slug: true },
    orderBy: { slug: "asc" },
  });

  const summary: ForEachTenantSummary = { ok: 0, failed: 0, errors: [] };

  for (const t of tenants) {
    try {
      await withTenantRLS(
        t.id,
        (tx) => fn(tx, { id: t.id, slug: t.slug }),
        options?.txTimeoutMs !== undefined || options?.txMaxWaitMs !== undefined
          ? {
              ...(options.txTimeoutMs !== undefined
                ? { timeoutMs: options.txTimeoutMs }
                : {}),
              ...(options.txMaxWaitMs !== undefined
                ? { maxWaitMs: options.txMaxWaitMs }
                : {}),
            }
          : undefined
      );
      summary.ok++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      summary.failed++;
      summary.errors.push({ tenantId: t.id, slug: t.slug, error: message });
      // Structured + greppable. One JSON line per failed tenant.
      console.warn(
        JSON.stringify({
          cronName,
          tenantId: t.id,
          slug: t.slug,
          error: message,
        })
      );
    }
  }

  return summary;
}
