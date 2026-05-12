/**
 * Per-product SEO/content health check used by the admin product list.
 *
 * Each product has up to four "load-bearing" content surfaces for organic
 * traffic + LLM ranking:
 *   1. seoTitle  — meta <title>; falls back to product.name (acceptable but
 *      generic)
 *   2. seoDescription — meta description; falls back to shortDescription
 *      (acceptable, but the dedicated seo field reads better in SERPs)
 *   3. seoFocusKw — internal editorial signal so we know which query each
 *      product targets. Not rendered, but lets us audit coverage.
 *   4. ingredientList — drives the Innehåll tab, the FAQ schema's "what's in
 *      it" question, and every /kop/[slug] landing for ingredients in the row
 *
 * We classify each product as `complete | partial | needs-work`. The list view
 * shows a coloured dot + tooltip listing missing fields. Bandwidth-cheap; the
 * page already fetches every product.
 */
import { parseIngredientList } from "@/lib/products/ingredient-list";

export type SeoHealthLevel = "complete" | "partial" | "needs-work";

export type SeoHealthInput = {
  seoTitle: string | null;
  seoDescription: string | null;
  seoFocusKw: string | null;
  shortDescription: string;
  longDescription: string;
  ingredientList: unknown;
  usage: string | null;
  warnings: string | null;
};

export type SeoHealth = {
  level: SeoHealthLevel;
  missing: string[];
  /** Items that aren't strictly required but would lift the page. */
  warnings: string[];
};

export function getSeoHealth(p: SeoHealthInput): SeoHealth {
  const missing: string[] = [];
  const warnings: string[] = [];

  // seoTitle: fallback to product.name works, but a hand-tuned title beats
  // the bare product name 9/10 times.
  if (!p.seoTitle?.trim()) warnings.push("SEO-titel saknas (faller tillbaka på namnet)");

  // seoDescription: fallback to shortDescription is fine if shortDescription
  // is a real sentence. Flag if both are empty.
  if (!p.seoDescription?.trim() && !p.shortDescription?.trim()) {
    missing.push("SEO-beskrivning saknas");
  } else if (!p.seoDescription?.trim()) {
    warnings.push("SEO-beskrivning saknas (faller tillbaka på kort beskrivning)");
  }

  // seoFocusKw is editorial-only. Without it we can't audit what each product
  // is targeting.
  if (!p.seoFocusKw?.trim()) warnings.push("Fokusnyckelord saknas");

  // ingredientList is a hard requirement — no Innehåll tab without it, no
  // ingredient cross-linking from /kunskap, FAQ "vad innehåller" answers thin.
  const list = parseIngredientList(p.ingredientList);
  if (!list || list.rows.length === 0) {
    missing.push("Innehållsförteckning saknas");
  }

  // Long description: needed for rich product page + Beskrivning tab.
  if (!p.longDescription?.trim()) warnings.push("Lång beskrivning saknas");

  // FAQ-buildable: the FAQPage JSON-LD only emits when ≥2 of usage / list /
  // warnings are present. If <2, FAQ rich-result is silently disabled.
  let faqInputCount = 0;
  if (p.usage?.trim()) faqInputCount++;
  if (list && list.rows.length > 0) faqInputCount++;
  if (p.warnings?.trim()) faqInputCount++;
  if (faqInputCount < 2) warnings.push("FAQ-schema gäller ej (<2 fält ifyllda)");

  let level: SeoHealthLevel;
  if (missing.length > 0) level = "needs-work";
  else if (warnings.length > 0) level = "partial";
  else level = "complete";

  return { level, missing, warnings };
}
