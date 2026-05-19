import { headers } from "next/headers";
import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { platformAuth } from "@/lib/auth-platform";
import { PLATFORM_HOST_HEADER } from "@/lib/tenant/host";

/**
 * Platform (Ampliosoft) authority gate — ADR 0031 D3/D4.
 *
 * Four independent checks, all required:
 *   1. request is on the platform host (middleware set the marker) —
 *      the platform surface is never reachable from a tenant host.
 *   2. a valid session on the **platform** auth instance (own cookie).
 *   3. a `PlatformAdmin` row for that user (authority is explicit,
 *      never derived from User.role or tenant membership).
 *   4. mandatory 2FA (crown-jewel, cross-tenant plane).
 *
 * Re-queried per request (no stale-elevation), memoised via React.cache.
 * notFound() — not redirect — when unauthorised, so the platform
 * surface's existence isn't disclosed to tenant users.
 */

export type PlatformActor = {
  userId: string;
  email: string;
  platformRole: "SUPERADMIN" | "SUPPORT";
};

/**
 * Lighter gate for the 2FA-enrolment page only: platform host +
 * platform session + PlatformAdmin row, but NOT the 2FA requirement
 * (this is the page where 2FA gets set up — gating it on 2FA would
 * loop). Everything else uses requirePlatformAdmin.
 */
export const requirePlatformSession = cache(
  async (): Promise<PlatformActor & { twoFactorEnabled: boolean }> => {
    const h = await headers();
    if (h.get(PLATFORM_HOST_HEADER) !== "1") notFound();
    const session = await platformAuth.api.getSession({ headers: h });
    if (!session?.user) redirect("/platform/login");
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        email: true,
        twoFactorEnabled: true,
        platformAdmin: { select: { platformRole: true } },
      },
    });
    if (!dbUser?.platformAdmin) notFound();
    return {
      userId: session.user.id,
      email: dbUser.email,
      platformRole: dbUser.platformAdmin.platformRole,
      twoFactorEnabled: dbUser.twoFactorEnabled,
    };
  }
);

export const requirePlatformAdmin = cache(
  async (): Promise<PlatformActor> => {
    const h = await headers();

    // 1. platform host only
    if (h.get(PLATFORM_HOST_HEADER) !== "1") notFound();

    // 2. platform session (separate cookie/instance)
    const session = await platformAuth.api.getSession({ headers: h });
    if (!session?.user) redirect("/platform/login");

    // 3. explicit platform authority + 4. 2FA
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        email: true,
        twoFactorEnabled: true,
        platformAdmin: { select: { platformRole: true } },
      },
    });

    if (!dbUser?.platformAdmin) notFound();
    if (!dbUser.twoFactorEnabled) {
      // Mandatory 2FA (ADR 0031) — send to enrolment, not login.
      redirect("/platform/2fa");
    }

    return {
      userId: session.user.id,
      email: dbUser.email,
      platformRole: dbUser.platformAdmin.platformRole,
    };
  }
);
