/**
 * Edge-safe tenant-slug resolution from the request Host. NO prisma /
 * Node imports here — `middleware.ts` runs on the edge runtime.
 *
 * Mapping (ADR 0026 §2):
 *   {slug}.korg.nu          → slug
 *   www.korg.nu / korg.nu   → tenant zero ("biomax")
 *   {slug}.localhost:PORT   → slug          (dev)
 *   localhost / 127.0.0.1   → tenant zero   (dev, behaviour unchanged)
 *
 * Custom merchant domains (butik.example.se) come later — they'll be a
 * Domain table lookup, which can't run on the edge, so that resolution
 * will move server-side. Slice 1 is subdomain-only.
 */

export const DEFAULT_TENANT_SLUG = "biomax";
export const TENANT_HEADER = "x-korg-tenant";

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

export function tenantSlugFromHost(host: string | null | undefined): string {
  if (!host) return DEFAULT_TENANT_SLUG;
  const hostname = host.split(":")[0].trim().toLowerCase();
  if (!hostname || hostname === "localhost" || IPV4.test(hostname)) {
    return DEFAULT_TENANT_SLUG;
  }
  const parts = hostname.split(".");
  // {slug}.localhost (dev)
  if (parts.length === 2 && parts[1] === "localhost") {
    return normalize(parts[0]);
  }
  // {slug}.korg.nu (3+ labels) — apex/www → tenant zero
  if (parts.length >= 3) {
    const sub = parts[0];
    if (sub === "www" || sub === "") return DEFAULT_TENANT_SLUG;
    return normalize(sub);
  }
  // apex korg.nu or anything unrecognised → tenant zero
  return DEFAULT_TENANT_SLUG;
}

function normalize(slug: string): string {
  const s = slug.replace(/[^a-z0-9-]/g, "");
  return s.length > 0 ? s : DEFAULT_TENANT_SLUG;
}
