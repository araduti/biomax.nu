"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/admin/audit";
import { requirePlatformAdmin } from "@/lib/platform/guard";
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
