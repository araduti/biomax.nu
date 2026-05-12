"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./guard";

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
  await requireAdmin();
  const v = validateInput(input, true);
  if (!v.ok) return v;
  const code = input.code.trim().toUpperCase();

  const collision = await prisma.coupon.findUnique({
    where: { code },
    select: { id: true },
  });
  if (collision) return { ok: false, error: "Kod används redan." };

  try {
    await prisma.coupon.create({
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
      },
    });
  } catch (err) {
    console.error("createCoupon failed:", err);
    return { ok: false, error: "Kunde inte skapa rabattkoden." };
  }

  revalidatePath("/admin/kuponger");
  return { ok: true, code };
}

export async function updateCoupon(input: CouponInput): Promise<CouponResult> {
  await requireAdmin();
  const v = validateInput(input, false);
  if (!v.ok) return v;
  const code = input.code.trim().toUpperCase();

  const existing = await prisma.coupon.findUnique({
    where: { code },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Koden hittades inte." };

  try {
    await prisma.coupon.update({
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
  } catch (err) {
    console.error("updateCoupon failed:", err);
    return { ok: false, error: "Kunde inte spara rabattkoden." };
  }

  revalidatePath("/admin/kuponger");
  return { ok: true, code };
}

export async function deleteCoupon(
  code: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const existing = await prisma.coupon.findUnique({
    where: { code },
    select: { id: true, usedCount: true },
  });
  if (!existing) return { ok: false, error: "Koden hittades inte." };
  if (existing.usedCount > 0)
    return {
      ok: false,
      error:
        "Koden har redan använts — avaktivera istället så historiken bevaras.",
    };

  try {
    await prisma.coupon.delete({ where: { id: existing.id } });
  } catch (err) {
    console.error("deleteCoupon failed:", err);
    return { ok: false, error: "Kunde inte ta bort koden." };
  }

  revalidatePath("/admin/kuponger");
  return { ok: true };
}
