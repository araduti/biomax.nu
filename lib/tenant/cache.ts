import { unstable_cache } from "next/cache";

/**
 * Tenant-scoped data cache (ADR 0032 D4). `unstable_cache` keys are
 * global; a slug-only key serves one tenant's data to another (proven
 * cross-tenant cache poisoning on the PDP, 3b-3b). This helper makes
 * the tenant part of the key + tag impossible to forget. Raw
 * `unstable_cache` for tenant data is banned by ESLint outside this
 * module.
 *
 * Mirrors the `unstable_cache` shape: a thunk + key parts + options,
 * but the cache key is `["t", tenantId, ...keyParts]` and every tag is
 * prefixed `t:<tenantId>:` so revalidation is per-tenant too.
 */
export function tenantCache<R>(
  tenantId: string,
  fn: () => Promise<R>,
  keyParts: readonly string[],
  options?: { revalidate?: number | false; tags?: readonly string[] }
): () => Promise<R> {
  const tags = (options?.tags ?? []).map((t) => `t:${tenantId}:${t}`);
  return unstable_cache(fn, ["t", tenantId, ...keyParts], {
    ...(options?.revalidate !== undefined
      ? { revalidate: options.revalidate }
      : {}),
    tags,
  });
}

/** Tenant-scoped revalidation tag — pair with `revalidateTag()` so a
 *  tenant's edit never busts another tenant's cache. */
export function tenantTag(tenantId: string, tag: string): string {
  return `t:${tenantId}:${tag}`;
}
