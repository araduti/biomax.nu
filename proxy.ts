import { NextResponse, type NextRequest } from "next/server";
import {
  tenantSlugFromHost,
  isPlatformHost,
  TENANT_HEADER,
  PLATFORM_HOST_HEADER,
} from "@/lib/tenant/host";

/**
 * Korg tenant resolution (ADR 0028 D3). Next 16 renamed Middleware →
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
  // Run on app routes; skip static assets + Next internals.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
