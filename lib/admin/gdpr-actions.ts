"use server";

import { z } from "zod";
import { requireAdmin } from "./guard";
import { audit } from "./audit";
import { cuidSchema, fail } from "@/lib/validation/shared";
import { buildUserExport, anonymizeUser } from "@/lib/gdpr/core";

/**
 * Admin-initiated GDPR actions. The hard part (export aggregation,
 * Bokföringslagen-safe anonymisation) lives in `lib/gdpr/core.ts` and is
 * shared with customer self-service (ADR 0025). This file owns only the
 * admin authz gate + the admin-attributed audit entry.
 */

const CustomerIdSchema = z.object({ userId: cuidSchema });

export type GdprExportResult =
  | { ok: true; filename: string; payload: string }
  | { ok: false; error: string };

export async function exportCustomerData(
  raw: unknown
): Promise<GdprExportResult> {
  const admin = await requireAdmin();
  const parsed = CustomerIdSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error);

  const exported = await buildUserExport(parsed.data.userId);
  if (!exported) return { ok: false, error: "Kunden hittades inte." };

  await audit({
    actorId: admin.id,
    action: "customer.export",
    entityType: "User",
    entityId: parsed.data.userId,
    diff: { filename: exported.filename },
  });
  return { ok: true, ...exported };
}

export type GdprAnonymizeResult = { ok: true } | { ok: false; error: string };

/**
 * Anonymise a customer. Irreversible. The admin UI gates this behind a
 * confirm step.
 */
export async function anonymizeCustomer(
  raw: unknown
): Promise<GdprAnonymizeResult> {
  const admin = await requireAdmin();
  const parsed = CustomerIdSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error);

  const result = await anonymizeUser(parsed.data.userId);
  if (!result.ok) return result;

  await audit({
    actorId: admin.id,
    action: "customer.anonymize",
    entityType: "User",
    entityId: parsed.data.userId,
    diff: { previousEmail: result.previousEmail },
  });
  return { ok: true };
}
