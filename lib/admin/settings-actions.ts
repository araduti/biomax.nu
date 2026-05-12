"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./guard";
import { SETTING_KEYS } from "@/lib/site/settings";

export type SettingsResult = { ok: true } | { ok: false; error: string };

export async function updateShippingRules(input: {
  flatSek: number;
  freeThresholdSek: number | null;
}): Promise<SettingsResult> {
  await requireAdmin();
  if (!Number.isInteger(input.flatSek) || input.flatSek < 0)
    return { ok: false, error: "Ogiltig fraktavgift." };
  if (
    input.freeThresholdSek !== null &&
    (!Number.isInteger(input.freeThresholdSek) || input.freeThresholdSek < 0)
  )
    return { ok: false, error: "Ogiltig fri-frakt-tröskel." };

  try {
    await prisma.$transaction([
      prisma.siteSetting.upsert({
        where: { key: SETTING_KEYS.shippingFlatSek },
        create: {
          key: SETTING_KEYS.shippingFlatSek,
          value: input.flatSek,
          description: "Standard fraktavgift i SEK.",
        },
        update: { value: input.flatSek },
      }),
      prisma.siteSetting.upsert({
        where: { key: SETTING_KEYS.freeShippingThresholdSek },
        create: {
          key: SETTING_KEYS.freeShippingThresholdSek,
          value:
            input.freeThresholdSek === null
              ? Prisma.JsonNull
              : input.freeThresholdSek,
          description: "Subtotal i SEK som ger fri frakt. NULL = aldrig.",
        },
        update: {
          value:
            input.freeThresholdSek === null
              ? Prisma.JsonNull
              : input.freeThresholdSek,
        },
      }),
    ]);
  } catch (err) {
    console.error("updateShippingRules failed:", err);
    return { ok: false, error: "Kunde inte spara." };
  }

  revalidatePath("/admin/installningar");
  revalidatePath("/checkout");
  return { ok: true };
}

export async function updateLowStockDefault(
  value: number
): Promise<SettingsResult> {
  await requireAdmin();
  if (!Number.isInteger(value) || value < 0)
    return { ok: false, error: "Ogiltigt värde." };

  try {
    await prisma.siteSetting.upsert({
      where: { key: SETTING_KEYS.lowStockDefault },
      create: {
        key: SETTING_KEYS.lowStockDefault,
        value,
        description: "Sajt-standard för &quot;Få kvar&quot;-tröskel.",
      },
      update: { value },
    });
  } catch (err) {
    console.error("updateLowStockDefault failed:", err);
    return { ok: false, error: "Kunde inte spara." };
  }

  revalidatePath("/admin/installningar");
  revalidatePath("/admin/produkter");
  return { ok: true };
}
