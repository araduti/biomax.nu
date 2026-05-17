"use server";

import { bumpTag, productCacheTag, productListCacheTag } from "@/lib/cache/tags";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./guard";
import { audit } from "./audit";
import type { ProductStatus } from "@prisma/client";
import {
  isIngredientList,
  type IngredientList,
} from "@/lib/products/ingredient-list";
import { isDose, type Dose } from "@/lib/products/dose";
import { syncSeoHealth, syncProductIngredients } from "./post-save-sync";

export type ProductUpdateInput = {
  slug: string;
  name?: string;
  shortDescription?: string;
  longDescription?: string;
  price?: string;
  compareAtPrice?: string | null;
  stock?: number;
  manageStock?: boolean;
  status?: ProductStatus;
  ingredients?: string;
  ingredientList?: IngredientList | null;
  usage?: string;
  dosing?: Dose | null;
  storage?: string;
  warnings?: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoFocusKw?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageUrl?: string | null;
  aiKeywords?: string[];
  badges?: string[];
  allergens?: string[];
  categorySlugs?: string[];
  galleryUrls?: string[];
  faqItems?: { question: string; answer: string }[] | null;
  dateReviewed?: Date | null;
  availableFrom?: Date | null;
  availableUntil?: Date | null;
  weight?: string | null;
  lengthCm?: string | null;
  widthCm?: string | null;
  heightCm?: string | null;
  lowStockThreshold?: number | null;
  internalNote?: string | null;
  featured?: boolean;
};

export type ProductUpdateResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateProduct(
  input: ProductUpdateInput
): Promise<ProductUpdateResult> {
  const admin = await requireAdmin();

  const existing = await prisma.product.findUnique({
    where: { slug: input.slug },
    select: { id: true, stock: true, manageStock: true, status: true },
  });
  if (!existing) return { ok: false, error: "Produkten hittades inte." };

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name.trim();
  if (input.shortDescription !== undefined) data.shortDescription = input.shortDescription;
  if (input.longDescription !== undefined) data.longDescription = input.longDescription;
  if (input.ingredients !== undefined) data.ingredients = input.ingredients || null;
  if (input.ingredientList !== undefined) {
    if (input.ingredientList === null) {
      data.ingredientList = null;
    } else if (isIngredientList(input.ingredientList)) {
      // Strip empty rows + normalize whitespace before persisting
      const cleaned: IngredientList = {
        rows: input.ingredientList.rows
          .map((r) => ({ name: r.name.trim(), amount: r.amount.trim() }))
          .filter((r) => r.name || r.amount),
        perUnit: input.ingredientList.perUnit.trim() || "kapsel",
        footnote: input.ingredientList.footnote.trim(),
      };
      data.ingredientList =
        cleaned.rows.length === 0 && !cleaned.footnote ? null : cleaned;
    }
  }
  if (input.usage !== undefined) data.usage = input.usage || null;
  if (input.dosing !== undefined) {
    if (input.dosing === null) {
      data.dosing = null;
    } else if (isDose(input.dosing)) {
      // Strip empty/whitespace strings → null so saved override never carries
      // ghost fields. Caller still passes a valid Dose shape.
      const d = input.dosing;
      data.dosing = {
        amount: d.amount?.trim() || null,
        frequency: d.frequency?.trim() || null,
        timing: d.timing
          ? { label: d.timing.label.trim(), tone: d.timing.tone }
          : null,
        schedule: d.schedule,
      };
    }
  }
  if (input.storage !== undefined) data.storage = input.storage || null;
  if (input.warnings !== undefined) data.warnings = input.warnings || null;
  if (input.price !== undefined) {
    const p = parseFloat(input.price);
    if (!Number.isFinite(p) || p < 0)
      return { ok: false, error: "Ogiltigt pris." };
    data.price = p;
  }
  if (input.compareAtPrice !== undefined) {
    if (input.compareAtPrice === null || input.compareAtPrice === "") {
      data.compareAtPrice = null;
    } else {
      const cp = parseFloat(input.compareAtPrice);
      if (!Number.isFinite(cp) || cp < 0)
        return { ok: false, error: "Ogiltigt jämförpris." };
      data.compareAtPrice = cp;
    }
  }
  if (input.stock !== undefined) {
    if (!Number.isInteger(input.stock) || input.stock < 0)
      return { ok: false, error: "Ogiltigt lagersaldo." };
    data.stock = input.stock;
  }
  if (input.manageStock !== undefined) data.manageStock = input.manageStock;
  if (input.status !== undefined) data.status = input.status;
  if (input.seoTitle !== undefined) data.seoTitle = input.seoTitle || null;
  if (input.seoDescription !== undefined)
    data.seoDescription = input.seoDescription || null;
  if (input.seoFocusKw !== undefined) data.seoFocusKw = input.seoFocusKw || null;
  if (input.ogTitle !== undefined) data.ogTitle = input.ogTitle || null;
  if (input.ogDescription !== undefined)
    data.ogDescription = input.ogDescription || null;
  if (input.ogImageUrl !== undefined) data.ogImageUrl = input.ogImageUrl || null;
  if (input.dateReviewed !== undefined) data.dateReviewed = input.dateReviewed;
  if (input.availableFrom !== undefined) data.availableFrom = input.availableFrom;
  if (input.availableUntil !== undefined) data.availableUntil = input.availableUntil;

  // Logistics — all optional decimal fields. Empty string = clear, otherwise
  // parse and reject negatives. Validation lives here rather than in the form
  // so a SQL-direct edit can't bypass it.
  for (const [field, valueRaw] of [
    ["weight", input.weight],
    ["lengthCm", input.lengthCm],
    ["widthCm", input.widthCm],
    ["heightCm", input.heightCm],
  ] as const) {
    if (valueRaw === undefined) continue;
    if (valueRaw === null || valueRaw === "") {
      data[field] = null;
      continue;
    }
    const n = parseFloat(valueRaw);
    if (!Number.isFinite(n) || n < 0)
      return { ok: false, error: `Ogiltigt värde för ${field}.` };
    data[field] = n;
  }

  if (input.lowStockThreshold !== undefined) {
    if (input.lowStockThreshold === null) {
      data.lowStockThreshold = null;
    } else if (
      !Number.isInteger(input.lowStockThreshold) ||
      input.lowStockThreshold < 0
    ) {
      return { ok: false, error: "Ogiltig lågnivå-tröskel." };
    } else {
      data.lowStockThreshold = input.lowStockThreshold;
    }
  }
  if (input.internalNote !== undefined)
    data.internalNote = input.internalNote?.trim() || null;
  if (input.featured !== undefined) data.featured = input.featured;
  if (
    input.availableFrom &&
    input.availableUntil &&
    input.availableFrom >= input.availableUntil
  ) {
    return {
      ok: false,
      error: "Tillgänglig från måste vara före tillgänglig till.",
    };
  }
  if (input.badges !== undefined) {
    // Same normalisation as aiKeywords — dedupe case-insensitively, drop
    // empties, cap at a sensible ceiling so a runaway input never spams the
    // card chrome.
    const seen = new Set<string>();
    const cleaned: string[] = [];
    for (const b of input.badges.map((s) => s.trim()).filter(Boolean)) {
      const key = b.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      cleaned.push(b);
      if (cleaned.length >= 6) break;
    }
    data.badges = cleaned;
  }
  if (input.allergens !== undefined) {
    // Whitelist against the EU 1169/2011 catalogue; unknown slugs are
    // dropped silently. Dedupe + preserve display order from the picker.
    const { ALLERGENS } = await import("@/lib/products/allergens");
    const known = new Set(ALLERGENS.map((a) => a.slug));
    const seen = new Set<string>();
    const cleaned: string[] = [];
    for (const slug of input.allergens) {
      if (!known.has(slug) || seen.has(slug)) continue;
      seen.add(slug);
      cleaned.push(slug);
    }
    data.allergens = cleaned;
  }
  if (input.galleryUrls !== undefined) {
    // Preserve order, dedupe, cap.
    const seen = new Set<string>();
    const cleaned: string[] = [];
    for (const u of input.galleryUrls) {
      const url = u.trim();
      if (!url || seen.has(url)) continue;
      seen.add(url);
      cleaned.push(url);
      if (cleaned.length >= 12) break;
    }
    data.galleryUrls = cleaned;
  }
  if (input.aiKeywords !== undefined) {
    // Normalise: trim each, drop empties + dedupe (case-insensitive),
    // cap to 24 entries to keep the cluster focused.
    const seen = new Set<string>();
    const cleaned: string[] = [];
    for (const k of input.aiKeywords.map((s) => s.trim()).filter(Boolean)) {
      const key = k.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      cleaned.push(k);
      if (cleaned.length >= 24) break;
    }
    data.aiKeywords = cleaned;
  }
  if (input.faqItems !== undefined) {
    if (input.faqItems === null) {
      data.seoFaqJson = null;
    } else {
      const cleaned = input.faqItems
        .map((f) => ({
          question: f.question.trim(),
          answer: f.answer.trim(),
        }))
        .filter((f) => f.question && f.answer);
      data.seoFaqJson = cleaned.length === 0 ? null : cleaned;
    }
  }

  // Category assignment uses the relation `set` op — replaces the whole
  // join-table for this product with the given slugs. Sent in a separate
  // step from `data` because Prisma's many-to-many update shape is nested.
  let categorySet:
    | { categories: { set: { slug: string }[] } }
    | Record<string, never> = {};
  if (input.categorySlugs !== undefined) {
    const slugs = Array.from(
      new Set(input.categorySlugs.map((s) => s.trim()).filter(Boolean))
    );
    categorySet = { categories: { set: slugs.map((slug) => ({ slug })) } };
  }

  try {
    await prisma.product.update({
      where: { id: existing.id },
      data: { ...data, ...categorySet },
    });
  } catch (err) {
    console.error("updateProduct failed:", err);
    return { ok: false, error: "Kunde inte spara ändringarna." };
  }

  // Stock transition 0 → positive: fan out pending notify-me requests.
  // Soft-fails — a Brevo issue must not block the admin save itself.
  const wasOutOfStock =
    existing.manageStock && existing.stock <= 0 && existing.status === "PUBLISHED";
  const willBeInStock =
    (input.manageStock ?? existing.manageStock) === false ||
    (input.stock !== undefined && input.stock > 0) ||
    (input.stock === undefined && existing.stock > 0);
  const willBePublished =
    (input.status ?? existing.status) === "PUBLISHED";
  if (wasOutOfStock && willBeInStock && willBePublished) {
    try {
      const { fanoutStockNotifications } = await import(
        "@/lib/stock-notifications/actions"
      );
      const result = await fanoutStockNotifications(existing.id);
      if (result.sent > 0) {
        console.log(
          `[stock-notify] fanned out ${result.sent} mails for ${input.slug}`
        );
      }
    } catch (err) {
      console.error("[stock-notify] fanout threw:", err);
    }
  }

  // Post-save derivations: recompute SEO health + resolved ingredient join.
  // Both read the freshly-updated row, both are best-effort (errors logged
  // but never block the admin save).
  const refreshed = await prisma.product.findUnique({
    where: { id: existing.id },
    select: {
      id: true,
      seoTitle: true,
      seoDescription: true,
      seoFocusKw: true,
      shortDescription: true,
      longDescription: true,
      ingredientList: true,
      usage: true,
      warnings: true,
    },
  });
  if (refreshed) {
    await Promise.all([
      syncSeoHealth(refreshed),
      syncProductIngredients(refreshed),
    ]);
  }

  // Tag-scoped: invalidates only the PDP's `unstable_cache` entry + the
  // shared product-list tag (catalogue grid, related-products fallback).
  // Admin routes are dynamic so they don't need explicit invalidation.
  bumpTag(productCacheTag(input.slug));
  bumpTag(productListCacheTag());

  // Audit-log the save. `data` carries only the changed fields (the rest
  // are undefined and dropped from the JSON write), so the entry is
  // already a partial diff. Productname/slug pulled from input for the
  // human-readable column in the admin log view.
  await audit({
    actorId: admin.id,
    action: "product.update",
    entityType: "Product",
    entityId: existing.id,
    diff: { slug: input.slug, fields: Object.keys(input).filter((k) => k !== "slug") },
  });
  return { ok: true };
}
