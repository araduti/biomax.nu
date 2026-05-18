"use server";

import { z } from "zod";
import { currentUser } from "@/lib/session";
import { audit } from "@/lib/admin/audit";
import { fail } from "@/lib/validation/shared";
import { buildUserExport, anonymizeUser } from "@/lib/gdpr/core";

/**
 * Customer self-service GDPR (ADR 0025).
 *
 * The target user is ALWAYS derived from the session — these actions
 * take no userId from the client, which structurally eliminates IDOR: a
 * customer can only ever export/erase their own account regardless of
 * what they POST. Same shared core as the admin path; audited with the
 * user's own id + `self-` actions so the log shows it was
 * customer-initiated.
 */

export type SelfExportResult =
  | { ok: true; filename: string; payload: string }
  | { ok: false; error: string };

export async function exportMyData(): Promise<SelfExportResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Du måste vara inloggad." };

  const exported = await buildUserExport(user.id);
  if (!exported) return { ok: false, error: "Kontot hittades inte." };

  await audit({
    actorId: user.id,
    action: "customer.self-export",
    entityType: "User",
    entityId: user.id,
    diff: { filename: exported.filename },
  });
  return { ok: true, ...exported };
}

const DeleteSchema = z.object({
  confirmation: z
    .string()
    .trim()
    .refine((v) => v === "RADERA", {
      message: 'Skriv "RADERA" för att bekräfta.',
    }),
});

export type SelfDeleteResult = { ok: true } | { ok: false; error: string };

/**
 * Irreversible self-service erasure. Requires the typed confirmation
 * phrase (re-checked server-side). The shared core anonymises in place
 * (keeps Bokföringslagen order rows) and deletes the user's sessions +
 * accounts, so the active session is invalidated server-side; the
 * client signs out + redirects after this resolves.
 */
export async function deleteMyAccount(
  raw: unknown
): Promise<SelfDeleteResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Du måste vara inloggad." };

  const parsed = DeleteSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error);

  const result = await anonymizeUser(user.id);
  if (!result.ok) return result;

  await audit({
    actorId: user.id,
    action: "customer.self-delete",
    entityType: "User",
    entityId: user.id,
    diff: { previousEmail: result.previousEmail },
  });
  return { ok: true };
}
