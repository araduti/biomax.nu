import { NextResponse, type NextRequest } from "next/server";
import {
  tenantSlugFromHost,
  isPlatformHost,
  TENANT_HEADER,
  PLATFORM_HOST_HEADER,
} from "@/lib/tenant/host";

/**
 * Kine tenant resolution (ADR 0028 D3). Next 16 renamed Middleware →
 * **Proxy** (file must be `proxy.ts`, export `proxy`); the legacy
 * `middleware.ts` convention is deprecated and broke routing here.
 *
 * Edge-safe: parses Host → tenant slug and forwards it as a request
 * header so server code (`lib/tenant`.currentTenant) resolves the
 * Tenant row without a client-supplied id (IDOR-proof by
 * construction). Subdomain-only for now; custom-domain lookup (a DB
 * call) moves server-side later.
 */
export function proxy(req: NextRequest) {
  const host = req.headers.get("host");
  const headers = new Headers(req.headers);

  if (isPlatformHost(host)) {
    // Platform (Ampliosoft) host — ADR 0031. No tenant context here;
    // the platform plane is cross-tenant and gated separately.
    headers.set(PLATFORM_HOST_HEADER, "1");

    // The platform host serves ONLY the platform app — never the
    // storefront. Anything outside /platform and the platform auth
    // endpoint redirects to /platform (which itself bounces to
    // /platform/login when unauthenticated).
    const path = req.nextUrl.pathname;
    const isPlatformPath =
      path === "/platform" ||
      path.startsWith("/platform/") ||
      path.startsWith("/api/platform-auth");
    if (!isPlatformPath) {
      const url = req.nextUrl.clone();
      url.pathname = "/platform";
      return NextResponse.redirect(url);
    }
  } else {
    headers.set(TENANT_HEADER, tenantSlugFromHost(host));
  }
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Run on app routes; skip Next internals + genuine static assets
  // ONLY. The previous blanket `.*\\..*` excluded EVERY dotted path,
  // so tenant-scoped data/SEO routes (sitemap.xml, robots.txt,
  // llms.txt, feeds/*.xml) bypassed tenant resolution and served
  // tenant-zero (biomax) to every host — a cross-tenant content leak
  // (ADR 0032). Exclude only static-asset file extensions; keep the
  // dotted data routes flowing through tenant resolution.
  // Excludes ONLY static-asset extensions. txt / xml / json are
  // deliberately NOT excluded — sitemap.xml, robots.txt, llms.txt,
  // feeds/*.xml are tenant-scoped and must resolve a tenant.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:js|mjs|css|map|png|jpe?g|gif|svg|ico|webp|avif|woff2?|ttf|eot)$).*)",
  ],
};
