"use server";

import { revalidatePath } from "next/cache";
import { requireTenantRole } from "./guard";
import { tenantScope } from "@/lib/tenant/db";

const CODE_RE = /^[A-Z0-9_-]{3,40}$/;

export type CouponInput = {
  code: string;
  description?: string | null;
  discountPercent?: number | null;
  discountAmount?: string | null;
  startsAt?: Date | null;
  expiresAt?: Date | null;
  active?: boolean;
  maxUses?: number | null;
};

export type CouponResult =
  | { ok: true; code: string }
  | { ok: false; error: string };

function validateInput(
  input: CouponInput,
  isCreate: boolean
): { ok: true } | { ok: false; error: string } {
  const code = input.code.trim().toUpperCase();
  if (!CODE_RE.test(code))
    return {
      ok: false,
      error: "Kod ska vara 3–40 tecken, A–Z, 0–9, _ eller -.",
    };
  // Discount: exactly one of percent or amount must be set on create, or
  // (on update) at least one must remain set after applying changes.
  const hasPct = input.discountPercent != null && input.discountPercent > 0;
  const hasAmt =
    input.discountAmount != null &&
    input.discountAmount !== "" &&
    parseFloat(input.discountAmount) > 0;
  if (isCreate && !hasPct && !hasAmt)
    return { ok: false, error: "Ange antingen procent eller belopp." };
  if (hasPct && hasAmt)
    return { ok: false, error: "Välj antingen procent eller belopp, inte båda." };
  if (
    input.discountPercent != null &&
    (input.discountPercent < 0 || input.discountPercent > 100)
  )
    return { ok: false, error: "Procent måste vara 0–100." };
  if (
    input.startsAt &&
    input.expiresAt &&
    input.startsAt >= input.expiresAt
  )
    return { ok: false, error: "Startdatum måste vara före slutdatum." };
  if (input.maxUses != null && (!Number.isInteger(input.maxUses) || input.maxUses < 0))
    return { ok: false, error: "Ogiltigt antal användningar." };
  return { ok: true };
}

export async function createCoupon(input: CouponInput): Promise<CouponResult> {
  const { tenantId } = await requireTenantRole("admin");
  const v = validateInput(input, true);
  if (!v.ok) return v;
  const code = input.code.trim().toUpperCase();

  let collided: boolean;
  try {
    collided = await tenantScope(tenantId, async (tx) => {
      const collision = await tx.coupon.findUnique({
        where: { code },
        select: { id: true },
      });
      if (collision) return true;
      await tx.coupon.create({
        data: {
          code,
          description: input.description?.trim() || null,
          discountPercent:
            input.discountPercent != null && input.discountPercent > 0
              ? input.discountPercent
              : null,
          discountAmount:
            input.discountAmount && parseFloat(input.discountAmount) > 0
              ? parseFloat(input.discountAmount)
              : null,
          startsAt: input.startsAt ?? null,
          expiresAt: input.expiresAt ?? null,
          active: input.active ?? true,
          maxUses: input.maxUses ?? null,
          tenantId,
        },
      });
      return false;
    });
  } catch (err) {
    console.error("createCoupon failed:", err);
    return { ok: false, error: "Kunde inte skapa rabattkoden." };
  }
  if (collided) return { ok: false, error: "Kod används redan." };

  revalidatePath("/admin/kuponger");
  return { ok: true, code };
}

export async function updateCoupon(input: CouponInput): Promise<CouponResult> {
  const { tenantId } = await requireTenantRole("admin");
  const v = validateInput(input, false);
  if (!v.ok) return v;
  const code = input.code.trim().toUpperCase();

  let missing: boolean;
  try {
    missing = await tenantScope(tenantId, async (tx) => {
      const existing = await tx.coupon.findUnique({
        where: { code },
        select: { id: true },
      });
      if (!existing) return true;
      await tx.coupon.update({
        where: { id: existing.id },
        data: {
          description: input.description?.trim() || null,
          discountPercent:
            input.discountPercent != null && input.discountPercent > 0
              ? input.discountPercent
              : null,
          discountAmount:
            input.discountAmount && parseFloat(input.discountAmount) > 0
              ? parseFloat(input.discountAmount)
              : null,
          startsAt: input.startsAt ?? null,
          expiresAt: input.expiresAt ?? null,
          active: input.active ?? true,
          maxUses: input.maxUses ?? null,
        },
      });
      return false;
    });
  } catch (err) {
    console.error("updateCoupon failed:", err);
    return { ok: false, error: "Kunde inte spara rabattkoden." };
  }
  if (missing) return { ok: false, error: "Koden hittades inte." };

  revalidatePath("/admin/kuponger");
  return { ok: true, code };
}

export async function deleteCoupon(
  code: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { tenantId } = await requireTenantRole("admin");

  type DelOutcome =
    | { kind: "missing" }
    | { kind: "used" }
    | { kind: "ok" };
  let outcome: DelOutcome;
  try {
    outcome = await tenantScope(tenantId, async (tx): Promise<DelOutcome> => {
      const existing = await tx.coupon.findUnique({
        where: { code },
        select: { id: true, usedCount: true },
      });
      if (!existing) return { kind: "missing" };
      if (existing.usedCount > 0) return { kind: "used" };
      await tx.coupon.delete({ where: { id: existing.id } });
      return { kind: "ok" };
    });
  } catch (err) {
    console.error("deleteCoupon failed:", err);
    return { ok: false, error: "Kunde inte ta bort koden." };
  }
  if (outcome.kind === "missing")
    return { ok: false, error: "Koden hittades inte." };
  if (outcome.kind === "used")
    return {
      ok: false,
      error:
        "Koden har redan använts — avaktivera istället så historiken bevaras.",
    };

  revalidatePath("/admin/kuponger");
  return { ok: true };
}
