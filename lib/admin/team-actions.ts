"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTenantRole } from "./guard";
import { audit } from "./audit";

type Result = { ok: true } | { ok: false; error: string };

/**
 * Access control for the admin surface. Admin status is a plain
 * `User.role` string re-checked on every request by requireTenantRole();
 * these actions are the only supported way to change it from the UI
 * (besides the CLI `scripts/make-admin.ts` and the bootstrap seeder).
 *
 * Guard rails — both are real lock-out / privilege risks:
 *   - You cannot demote yourself (avoids an accidental self-lockout
 *     mid-session; also stops a coerced single click removing the
 *     actor's own trail).
 *   - The LAST admin cannot be demoted (the panel must never become
 *     unreachable — recovery would need shell + the make-admin script).
 *
 * Note: promoting/demoting changes the DB row immediately. requireTenantRole
 * re-queries per request and 2FA is enforced there, so a freshly
 * promoted user still has to pass 2FA enrolment before /admin opens.
 */

export async function promoteToAdmin(emailRaw: string): Promise<Result> {
  const actor = await requireTenantRole("owner");
  const email = emailRaw.trim().toLowerCase();
  if (!email) return { ok: false, error: "Ange en e-postadress." };

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, email: true },
  });
  if (!user) {
    return {
      ok: false,
      error:
        "Ingen användare med den e-postadressen. Personen måste ha ett konto först.",
    };
  }
  if (user.role === "admin") {
    return { ok: false, error: "Användaren är redan admin." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: "admin" },
  });
  await audit({
    actorId: actor.userId,
    action: "team.promote",
    entityType: "User",
    entityId: user.id,
    diff: { email: user.email, before: "customer", after: "admin" },
  });

  revalidatePath("/admin/team");
  revalidatePath(`/admin/kunder/${user.id}`);
  return { ok: true };
}

export async function demoteAdmin(userId: string): Promise<Result> {
  const actor = await requireTenantRole("owner");

  if (userId === actor.userId) {
    return {
      ok: false,
      error:
        "Du kan inte ta bort din egen adminbehörighet. Be en annan admin göra det.",
    };
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, email: true },
  });
  if (!target || target.role !== "admin") {
    return { ok: false, error: "Användaren är inte admin." };
  }

  const adminCount = await prisma.user.count({ where: { role: "admin" } });
  if (adminCount <= 1) {
    return {
      ok: false,
      error:
        "Det måste finnas minst en admin. Utse en ny admin innan du tar bort den sista.",
    };
  }

  await prisma.user.update({
    where: { id: target.id },
    data: { role: "customer" },
  });
  await audit({
    actorId: actor.userId,
    action: "team.demote",
    entityType: "User",
    entityId: target.id,
    diff: { email: target.email, before: "admin", after: "customer" },
  });

  revalidatePath("/admin/team");
  revalidatePath(`/admin/kunder/${target.id}`);
  return { ok: true };
}
