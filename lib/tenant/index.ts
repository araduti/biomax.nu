import { headers } from "next/headers";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { DEFAULT_TENANT_SLUG, TENANT_HEADER } from "./host";

export { DEFAULT_TENANT_SLUG, TENANT_HEADER } from "./host";

/**
 * Server-side current tenant (Kine slice 1 — ADR 0026/0028/0030).
 *
 * Resolution: `middleware.ts` parsed the Host edge-side and set the
 * `x-kine-tenant` request header; we look the slug up here (Node
 * runtime, prisma allowed). Memoised per request via React.cache so
 * layouts/pages/actions can call it freely.
 *
 * Fail-safe: an unknown/suspended slug falls back to the configured
 * tenant zero (env `KINE_TENANT_ZERO_SLUG`; see `./host.ts`). When
 * tenant zero is **unconfigured** and the resolved slug doesn't
 * match an ACTIVE tenant, we throw — explicit failure beats a silent
 * default. The ADR 0028 D1 increment (tenantId on owned models +
 * RLS) makes resolution authoritative for data isolation; slice 1
 * is identity/branding only.
 *
 * **#22 / #16 audit Finding 6.** Platform code does not name a
 * specific tenant. `biomax.nu` sets `KINE_TENANT_ZERO_SLUG=biomax`
 * in `.env.local` to preserve its single-tenant behaviour.
 */

export type CurrentTenant = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  primaryColorHex: string;
  status: "ACTIVE" | "SUSPENDED";
};

async function loadBySlug(slug: string): Promise<CurrentTenant | null> {
  const t = await prisma.tenant.findUnique({ where: { slug } });
  if (!t || t.status !== "ACTIVE") return null;
  return {
    id: t.id,
    slug: t.slug,
    name: t.name,
    tagline: t.tagline,
    primaryColorHex: t.primaryColorHex,
    status: t.status,
  };
}

export const currentTenant = cache(async (): Promise<CurrentTenant> => {
  let slug: string | null = DEFAULT_TENANT_SLUG;
  try {
    const requested = (await headers()).get(TENANT_HEADER);
    if (requested) slug = requested;
  } catch {
    /* headers unavailable (non-request context) → tenant zero (or null) */
  }

  const directHit = slug ? await loadBySlug(slug) : null;
  const tenantZeroFallback =
    !directHit && DEFAULT_TENANT_SLUG && slug !== DEFAULT_TENANT_SLUG
      ? await loadBySlug(DEFAULT_TENANT_SLUG)
      : null;
  const resolved = directHit ?? tenantZeroFallback;

  if (!resolved) {
    throw new Error(
      DEFAULT_TENANT_SLUG
        ? `Tenant zero "${DEFAULT_TENANT_SLUG}" is missing. Run \`npm run db:seed\`.`
        : `Tenant resolution failed for slug "${slug ?? "<none>"}" and no KINE_TENANT_ZERO_SLUG is configured.`
    );
  }
  return resolved;
});
