import { redirect, notFound } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  firstName: string | null;
  role: "admin";
};

/**
 * Server-side admin gate. Use at the top of every /admin/* page or layout.
 *
 * Behavior:
 *  - Not logged in → redirect to /logga-in
 *  - Logged in but not admin → 404 (hide existence of /admin)
 *  - Logged in admin WITHOUT 2FA → redirect to /konto/sakerhet to
 *    enrol. The admin surface (orders, customers, PII, refunds) is
 *    mandatory-2FA: a stolen admin password alone must not grant it.
 *    The setup page is login-gated only (not admin-gated) so this can't
 *    loop.
 *  - Logged in admin WITH 2FA → return fresh DB row with role.
 *
 * We re-query the DB rather than trust the session-cached role to avoid
 * stale-role-elevation issues (admin demoted but session still valid).
 * Memoized via React.cache so layout + page share one query per request.
 */
export const requireAdmin = cache(async (): Promise<AdminUser> => {
  const sessionUser = await currentUser();
  if (!sessionUser) redirect("/logga-in?redirect=/admin");

  const dbUser = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      role: true,
      twoFactorEnabled: true,
    },
  });

  if (!dbUser || dbUser.role !== "admin") notFound();

  // Mandatory 2FA for the admin surface. Bounce to the security page
  // (which prompts TOTP enrolment) until it's on. requireAdmin also
  // runs inside admin server actions, so this closes the mutation path
  // too — an admin without 2FA can neither view nor act.
  if (!dbUser.twoFactorEnabled) {
    redirect("/konto/sakerhet?krav=admin-2fa");
  }

  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    firstName: dbUser.firstName,
    role: "admin",
  };
});
