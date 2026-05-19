import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Request-scoped tenant context (ADR 0028 D1 / 0030 D2).
 *
 * The resolved tenant id is carried through the async call tree so
 * data access can scope/​enforce without threading it through every
 * function signature. Set once at the request boundary (by the
 * tenant-aware data layer in a later sub-slice); read by `withTenantRLS`.
 *
 * 3b-3 foundation: additive. Nothing populates or reads this yet — the
 * proxy/​call-site wiring + FORCE RLS land in the following sub-slices.
 */

type TenantContext = { readonly tenantId: string };

const als = new AsyncLocalStorage<TenantContext>();

export function runWithTenantContext<T>(
  tenantId: string,
  fn: () => T
): T {
  return als.run({ tenantId }, fn);
}

/** Current tenant id, or null outside a tenant-scoped request
 *  (platform plane, crons before per-tenant iteration, build). */
export function currentTenantIdOrNull(): string | null {
  return als.getStore()?.tenantId ?? null;
}

export function requireTenantId(): string {
  const id = als.getStore()?.tenantId;
  if (!id) {
    throw new Error(
      "No tenant in context. A tenant-scoped operation ran outside a " +
        "tenant request (or before the context was set)."
    );
  }
  return id;
}
