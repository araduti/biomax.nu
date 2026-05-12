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
 *  - Logged in admin → return fresh DB row with role
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
    },
  });

  if (!dbUser || dbUser.role !== "admin") notFound();

  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    firstName: dbUser.firstName,
    role: "admin",
  };
});
