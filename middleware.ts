import { NextResponse, type NextRequest } from "next/server";
import {
  tenantSlugFromHost,
  isPlatformHost,
  TENANT_HEADER,
  PLATFORM_HOST_HEADER,
} from "@/lib/tenant/host";

/**
 * Korg tenant-resolution middleware (ADR 0028 D3 — there was no
 * middleware before this). Edge-safe: parses Host → tenant slug and
 * forwards it as a request header so server code
 * (`lib/tenant`.currentTenant) can resolve the Tenant row without a
 * client-supplied id (IDOR-proof by construction).
 *
 * Slice 1 is subdomain-only; custom-domain lookup (a DB call) moves
 * server-side later.
 */
export function middleware(req: NextRequest) {
  const host = req.headers.get("host");
  const headers = new Headers(req.headers);

  if (isPlatformHost(host)) {
    // Platform (Ampliosoft) host — ADR 0031. No tenant context here;
    // the platform plane is cross-tenant and gated separately.
    headers.set(PLATFORM_HOST_HEADER, "1");
  } else {
    headers.set(TENANT_HEADER, tenantSlugFromHost(host));
  }
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Run on app routes; skip static assets + Next internals.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
