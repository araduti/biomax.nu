"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/admin/audit";
import { requirePlatformAdmin } from "@/lib/platform/guard";
import { exportTenant as buildTenantExport } from "@/lib/tenant/export";
import { cuidSchema, fail, type ActionResult } from "@/lib/validation/shared";

/**
 * Cross-tenant platform action (ADR 0031 D4): suspend/resume a tenant.
 * Gated by requirePlatformAdmin; every cross-tenant mutation is audited
 * with actor + target tenant.
 */
const Input = z.object({
  tenantId: cuidSchema,
  next: z.enum(["ACTIVE", "SUSPENDED"]),
});

export async function setTenantStatus(
  raw: unknown
): Promise<ActionResult> {
  const actor = await requirePlatformAdmin();
  const parsed = Input.safeParse(raw);
  if (!parsed.success) return fail(parsed.error);
  const { tenantId, next } = parsed.data;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, slug: true, status: true },
  });
  if (!tenant) return { ok: false, error: "Hyresgästen hittades inte." };
  if (tenant.slug === "biomax" && next === "SUSPENDED") {
    return { ok: false, error: "Tenant zero (biomax) kan inte stängas av." };
  }

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { status: next },
  });
  await audit({
    actorId: actor.userId,
    action: "platform.tenant.status",
    entityType: "Tenant",
    entityId: tenantId,
    diff: { slug: tenant.slug, from: tenant.status, to: next },
  });

  revalidatePath("/platform");
  return { ok: true };
}

/**
 * ADR 0033 Part A2 — per-tenant logical export. Cross-tenant platform
 * capability (Platform plane, ADR 0031 D4): the dump contains every
 * row owned by the target tenant + its Better Auth org rows. Gated
 * by requirePlatformAdmin and audited with actor + target tenant.
 *
 * Returned as a base64'd payload so the client can trigger a download
 * without us setting up a separate /platform/api route (one server
 * action, one round-trip). The payload is JSON text — base64 just
 * survives the JSON-RPC encoding cleanly.
 */
const ExportInput = z.object({ tenantId: cuidSchema });

export type TenantExportResult =
  | {
      ok: true;
      filename: string;
      /** base64-encoded UTF-8 JSON payload */
      payloadB64: string;
    }
  | { ok: false; error: string };

export async function exportTenant(
  raw: unknown
): Promise<TenantExportResult> {
  const actor = await requirePlatformAdmin();
  const parsed = ExportInput.safeParse(raw);
  if (!parsed.success) return fail(parsed.error);
  const { tenantId } = parsed.data;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, slug: true },
  });
  if (!tenant) return { ok: false, error: "Hyresgästen hittades inte." };

  const exported = await buildTenantExport(tenantId);
  if (!exported) {
    return { ok: false, error: "Exporten misslyckades." };
  }

  await audit({
    actorId: actor.userId,
    action: "platform.tenant.export",
    entityType: "Tenant",
    entityId: tenantId,
    diff: { slug: tenant.slug, bytes: exported.payload.length },
  });

  return {
    ok: true,
    filename: exported.filename,
    payloadB64: Buffer.from(exported.payload, "utf8").toString("base64"),
  };
}
