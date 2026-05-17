"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./guard";
import { SETTING_KEYS } from "@/lib/site/settings";
import { fail } from "@/lib/validation/shared";

export type SettingsResult = { ok: true } | { ok: false; error: string };

const WarehouseEmailsSchema = z.object({
  emails: z.string().trim().max(1000),
});

const TrustpilotSchema = z.object({
  rating: z.string().trim().max(8),
  reviewCount: z.string().trim().max(10),
  profileUrl: z.string().trim().max(500),
});

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

/**
 * Warehouse alert recipients — comma-separated emails that receive the
 * daily low-stock cron output. Light validation: each entry must look
 * like an email; whole-list is stored as a single comma-separated string
 * because the cron does the splitting + lowercase normalisation.
 */
export async function updateWarehouseAlertEmails(
  raw: unknown
): Promise<SettingsResult> {
  await requireAdmin();
  const parsed = WarehouseEmailsSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error);

  const cleaned = parsed.data.emails
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
  for (const e of cleaned) {
    if (!e.includes("@") || e.length > 320) {
      return { ok: false, error: `Ogiltig e-postadress: ${e}` };
    }
  }

  try {
    await prisma.siteSetting.upsert({
      where: { key: SETTING_KEYS.warehouseAlertEmails },
      create: {
        key: SETTING_KEYS.warehouseAlertEmails,
        value: cleaned.join(","),
        description: "Mottagare av dagligt lagerlarmsmejl (kommaseparerad lista).",
      },
      update: { value: cleaned.join(",") },
    });
  } catch (err) {
    console.error("updateWarehouseAlertEmails failed:", err);
    return { ok: false, error: "Kunde inte spara." };
  }

  revalidatePath("/admin/installningar");
  return { ok: true };
}

/**
 * Trustpilot live numbers. The admin pastes current values from the
 * Trustpilot dashboard (paid-tier API access for an auto-refresh cron
 * is a follow-up). Empty rating/count are stored as JsonNull so the
 * widget falls back to the CTA-only variant.
 */
export async function updateTrustpilotSummary(
  raw: unknown
): Promise<SettingsResult> {
  await requireAdmin();
  const parsed = TrustpilotSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error);

  let rating: number | null = null;
  if (parsed.data.rating.length > 0) {
    const n = parseFloat(parsed.data.rating.replace(",", "."));
    if (!Number.isFinite(n) || n < 0 || n > 5) {
      return { ok: false, error: "Betyget måste vara 0–5." };
    }
    // Persist as number with one decimal — matches what Trustpilot displays.
    rating = Math.round(n * 10) / 10;
  }

  let reviewCount: number | null = null;
  if (parsed.data.reviewCount.length > 0) {
    const n = parseInt(parsed.data.reviewCount, 10);
    if (!Number.isFinite(n) || n < 0) {
      return { ok: false, error: "Antal omdömen måste vara ett heltal ≥ 0." };
    }
    reviewCount = n;
  }

  const profileUrl = parsed.data.profileUrl;
  if (profileUrl.length > 0 && !/^https?:\/\//.test(profileUrl)) {
    return { ok: false, error: "Profil-URL måste börja med https://." };
  }

  try {
    await prisma.$transaction([
      prisma.siteSetting.upsert({
        where: { key: SETTING_KEYS.trustpilotRating },
        create: {
          key: SETTING_KEYS.trustpilotRating,
          value: rating === null ? Prisma.JsonNull : rating,
          description: "Trustpilot-betyg (0–5). NULL = visa CTA-variant utan siffra.",
        },
        update: {
          value: rating === null ? Prisma.JsonNull : rating,
        },
      }),
      prisma.siteSetting.upsert({
        where: { key: SETTING_KEYS.trustpilotReviewCount },
        create: {
          key: SETTING_KEYS.trustpilotReviewCount,
          value: reviewCount === null ? Prisma.JsonNull : reviewCount,
          description: "Antal Trustpilot-omdömen. NULL = dölj siffran.",
        },
        update: {
          value: reviewCount === null ? Prisma.JsonNull : reviewCount,
        },
      }),
      prisma.siteSetting.upsert({
        where: { key: SETTING_KEYS.trustpilotProfileUrl },
        create: {
          key: SETTING_KEYS.trustpilotProfileUrl,
          value: profileUrl || "https://se.trustpilot.com/review/biomax.nu",
          description: "URL till Biomax Trustpilot-profil.",
        },
        update: {
          value: profileUrl || "https://se.trustpilot.com/review/biomax.nu",
        },
      }),
    ]);
  } catch (err) {
    console.error("updateTrustpilotSummary failed:", err);
    return { ok: false, error: "Kunde inte spara." };
  }

  revalidatePath("/admin/installningar");
  revalidatePath("/");
  return { ok: true };
}
