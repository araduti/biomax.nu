import { headers } from "next/headers";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { DEFAULT_TENANT_SLUG, TENANT_HEADER } from "./host";

export { DEFAULT_TENANT_SLUG, TENANT_HEADER } from "./host";

/**
 * Server-side current tenant (Korg slice 1 — ADR 0026/0028/0030).
 *
 * Resolution: `middleware.ts` parsed the Host edge-side and set the
 * `x-korg-tenant` request header; we look the slug up here (Node
 * runtime, prisma allowed). Memoised per request via React.cache so
 * layouts/pages/actions can call it freely.
 *
 * Fail-safe: an unknown/suspended slug falls back to **tenant zero**
 * (`biomax`) so the storefront's behaviour is unchanged while the
 * platform is incrementally tenant-scoped. The ADR 0028 D1 increment
 * (tenantId on owned models + RLS) makes resolution authoritative for
 * data isolation; slice 1 is identity/branding only.
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
  let slug = DEFAULT_TENANT_SLUG;
  try {
    const requested = (await headers()).get(TENANT_HEADER);
    if (requested) slug = requested;
  } catch {
    /* headers unavailable (non-request context) → tenant zero */
  }

  const resolved =
    (await loadBySlug(slug)) ??
    (slug === DEFAULT_TENANT_SLUG ? null : await loadBySlug(DEFAULT_TENANT_SLUG));

  if (!resolved) {
    throw new Error(
      `Tenant zero "${DEFAULT_TENANT_SLUG}" is missing. Run \`npm run db:seed\`.`
    );
  }
  return resolved;
});
