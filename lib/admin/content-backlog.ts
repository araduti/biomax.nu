/**
 * Editorial backlog feeding /admin/innehall. Aggregates four classes of
 * "work to do" by joining the product catalogue against the ingredient
 * monograph registry:
 *
 *   1. Monografier som saknar källor — ADR 0011's known editorial debt
 *   2. Råvaror utan monografi          — product rows referencing ingredients
 *                                        we haven't written about
 *   3. Produkter med tunn FAQ          — FAQ schema silently disabled when
 *                                        fewer than 2 generatable Q&As exist
 *   4. Monografier utan produkter      — registry entries that aren't actually
 *                                        used in any current product
 *
 * All four are computed from data we already have — no external calls.
 */
import { hostTenantScope } from "@/lib/tenant/db";
import {
  getAllIngredients,
  findIngredient,
  type IngredientMeta,
} from "@/lib/knowledge/ingredients";
import { parseIngredientList } from "@/lib/products/ingredient-list";
import { buildProductFaq } from "@/lib/products/faq";

// ── Monografier som saknar källor ────────────────────────────────────

export type MissingSourceEntry = {
  slug: string;
  name: string;
  category: IngredientMeta["category"];
};

export function getMonographsMissingSources(): MissingSourceEntry[] {
  return getAllIngredients()
    .filter((i) => (i.references?.length ?? 0) === 0)
    .map((i) => ({ slug: i.slug, name: i.name, category: i.category }))
    .sort((a, b) => a.name.localeCompare(b.name, "sv"));
}

// ── Råvaror utan monografi ─────────────────────────────────────────

export type UnmatchedIngredient = {
  /** Raw row name as it appears in product data. */
  rowName: string;
  /** Products this name appears in (slug + name). */
  products: { slug: string; name: string }[];
};

export async function getUnmatchedIngredients(): Promise<UnmatchedIngredient[]> {
  const products = await hostTenantScope((tx) =>
    tx.product.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, name: true, ingredientList: true },
    })
  );

  const buckets = new Map<string, UnmatchedIngredient>();
  for (const p of products) {
    const list = parseIngredientList(p.ingredientList);
    if (!list) continue;
    for (const row of list.rows) {
      const trimmed = row.name.trim();
      if (!trimmed) continue;
      if (findIngredient(trimmed)) continue;
      // Group by lowercased name so "L-arginine" and "L-arginine " collapse.
      const key = trimmed.toLowerCase();
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { rowName: trimmed, products: [] };
        buckets.set(key, bucket);
      }
      bucket.products.push({ slug: p.slug, name: p.name });
    }
  }
  return [...buckets.values()].sort((a, b) =>
    a.rowName.localeCompare(b.rowName, "sv")
  );
}

// ── Produkter med tunn FAQ ─────────────────────────────────────────

export type ThinFaqProduct = {
  slug: string;
  name: string;
  /** How many auto-derived Q&As we can build right now — needs ≥2 for schema. */
  faqCount: number;
  /** Which of the source fields are missing. */
  missing: string[];
};

export async function getThinFaqProducts(): Promise<ThinFaqProduct[]> {
  const products = await hostTenantScope((tx) =>
    tx.product.findMany({
      where: { status: "PUBLISHED" },
      select: {
        slug: true,
        name: true,
        usage: true,
        warnings: true,
        ingredientList: true,
        seoFaqJson: true,
      },
    })
  );

  const out: ThinFaqProduct[] = [];
  for (const p of products) {
    const faq = buildProductFaq(p);
    if (faq.length >= 2) continue;
    const missing: string[] = [];
    if (!p.usage?.trim()) missing.push("Dosering");
    const list = parseIngredientList(p.ingredientList);
    if (!list || list.rows.length === 0) missing.push("Innehållsförteckning");
    if (!p.warnings?.trim()) missing.push("Observera");
    out.push({ slug: p.slug, name: p.name, faqCount: faq.length, missing });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, "sv"));
}

// ── Monografier utan produkter ─────────────────────────────────────

export type OrphanMonograph = {
  slug: string;
  name: string;
  category: IngredientMeta["category"];
};

export async function getOrphanMonographs(): Promise<OrphanMonograph[]> {
  // Pull every published product's ingredient list once, build a lowercased
  // name set, then check each registry entry against it.
  const products = await hostTenantScope((tx) =>
    tx.product.findMany({
      where: { status: "PUBLISHED" },
      select: { ingredientList: true },
    })
  );

  const used = new Set<string>();
  for (const p of products) {
    const list = parseIngredientList(p.ingredientList);
    if (!list) continue;
    for (const row of list.rows) {
      const matched = findIngredient(row.name);
      if (matched) used.add(matched.slug);
    }
  }

  return getAllIngredients()
    .filter((i) => !used.has(i.slug))
    .map((i) => ({ slug: i.slug, name: i.name, category: i.category }))
    .sort((a, b) => a.name.localeCompare(b.name, "sv"));
}

// ── Summary tile ──────────────────────────────────────────────────

export type BacklogSummary = {
  missingSources: number;
  unmatchedIngredients: number;
  thinFaq: number;
  orphanMonographs: number;
};

export async function getBacklogSummary(): Promise<BacklogSummary> {
  const [missingSources, unmatched, thin, orphans] = await Promise.all([
    Promise.resolve(getMonographsMissingSources().length),
    getUnmatchedIngredients().then((r) => r.length),
    getThinFaqProducts().then((r) => r.length),
    getOrphanMonographs().then((r) => r.length),
  ]);
  return {
    missingSources,
    unmatchedIngredients: unmatched,
    thinFaq: thin,
    orphanMonographs: orphans,
  };
}
