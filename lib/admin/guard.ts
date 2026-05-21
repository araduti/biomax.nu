import { redirect, notFound } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";
import { currentTenant } from "@/lib/tenant";

/**
 * Tenant authority gate (ADR 0031 D2/D5, ADR 0032). The admin surface
 * is scoped to exactly ONE tenant — the Host-resolved tenant
 * (`currentTenant()`), single-tenant-per-host (simpler than
 * Watchtower's multi-workspace switcher). Authorization = "is a member
 * of *this* tenant's Better Auth Organization with a sufficient role".
 * Cross-tenant operation is the SEPARATE platform plane
 * (`lib/platform/guard.ts`, `admin.kine.se`) — never reachable here.
 *
 * Behaviour (mirrors the pre-tenant requireAdmin so biomax owners see
 * no regression — they were backfilled as biomax org `owner` members):
 *  - Not logged in            → redirect /logga-in (preserve target)
 *  - Not a member / role < min → 404 (existence of /admin not disclosed)
 *  - Member WITHOUT 2FA        → redirect /konto/sakerhet to enrol.
 *    The admin surface (orders, PII, refunds) is mandatory-2FA: a
 *    stolen password alone must not grant it. The setup page is
 *    login-gated only (not admin-gated) so this can't loop.
 *  - Member WITH 2FA & role≥min → return the tenant-scoped actor.
 *
 * Re-queried per request (not session-cached) so a demotion or org
 * removal takes effect immediately; memoised per (minRole) via
 * React.cache so layout + page + actions share one query per request.
 */

export type TenantRole = "owner" | "admin" | "member";

const ROLE_RANK: Record<TenantRole, number> = {
  member: 1,
  admin: 2,
  owner: 3,
};

function parseRole(raw: string): TenantRole | null {
  return raw === "owner" || raw === "admin" || raw === "member" ? raw : null;
}

export type TenantActor = {
  userId: string;
  email: string;
  name: string | null;
  firstName: string | null;
  /** Kine Tenant.id — the seam scope (tenantScope(tenantId, …)). */
  tenantId: string;
  /** Better Auth Organization.id backing this tenant. */
  organizationId: string;
  /** This user's role within the tenant org. */
  role: TenantRole;
};

export const requireTenantRole = cache(
  async (minRole: TenantRole): Promise<TenantActor> => {
    const sessionUser = await currentUser();
    if (!sessionUser) redirect("/logga-in?redirect=/admin");

    // The admin tenant is the Host-resolved tenant. currentTenant()
    // fail-safes to tenant zero (biomax) outside a known Host, matching
    // the storefront — never another tenant.
    const tenant = await currentTenant();
    const orgLink = await prisma.tenant.findUnique({
      where: { id: tenant.id },
      select: { organizationId: true },
    });
    // No Organization provisioned for this tenant → no tenant admin
    // plane exists for it. Hide it (don't redirect — same as non-member).
    if (!orgLink?.organizationId) notFound();
    const organizationId = orgLink.organizationId;

    const dbUser = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        email: true,
        name: true,
        firstName: true,
        twoFactorEnabled: true,
        members: {
          where: { organizationId },
          select: { role: true },
          take: 1,
        },
      },
    });

    const membership = dbUser?.members[0];
    const role = membership ? parseRole(membership.role) : null;
    if (!dbUser || !role || ROLE_RANK[role] < ROLE_RANK[minRole]) {
      // Non-member, unknown role, or insufficient role → 404. Mirrors
      // the pre-tenant behaviour of hiding /admin from non-admins.
      notFound();
    }

    // Mandatory 2FA for the admin surface. Bounce to enrolment until
    // it's on. requireTenantRole also runs inside admin server actions,
    // so this closes the mutation path too — a member without 2FA can
    // neither view nor act.
    if (!dbUser.twoFactorEnabled) {
      redirect("/konto/sakerhet?krav=admin-2fa");
    }

    return {
      userId: sessionUser.id,
      email: dbUser.email,
      name: dbUser.name,
      firstName: dbUser.firstName,
      tenantId: tenant.id,
      organizationId,
      role,
    };
  }
);

export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  firstName: string | null;
  role: "admin";
};

/**
 * @deprecated ADR 0031 D5 — flat global admin gate. Superseded by
 * `requireTenantRole(minRole)` which is tenant-scoped. Kept as a thin
 * shim (delegates to `requireTenantRole("admin")`) only for callers not
 * yet migrated; do not use in new code. `UserRole.admin` itself is
 * retired in a later slice (D5 step 4), not here.
 */
export const requireAdmin = cache(async (): Promise<AdminUser> => {
  const actor = await requireTenantRole("admin");
  return {
    id: actor.userId,
    email: actor.email,
    name: actor.name,
    firstName: actor.firstName,
    role: "admin",
  };
});
