/**
 * Site search — Postgres ILIKE across products + in-memory match against
 * symptom landings + ingredient monographs. Designed for the small
 * catalogue we have today (~20 products, ~40 ingredients, ~10 symptom
 * pages): Postgres without full-text indexes is fast enough. Migrate to
 * `pg_trgm` or Typesense when the catalogue grows past ~500 products
 * (the result-quality tip we'd hit first is fuzzy matching).
 *
 * Returns three buckets, each capped, with `kind` for grouped rendering.
 */
import { prisma } from "@/lib/prisma";
import { publicProductWhere } from "@/lib/products/availability";
import { getAllIngredients } from "@/lib/knowledge/ingredients";
import { getAllSymptoms } from "@/lib/symptoms/registry";
import { BEHOV_LABELS } from "@/lib/symptoms/behov-labels";

export type SearchResults = {
  products: Array<{
    slug: string;
    name: string;
    shortDescription: string;
    imageUrl: string;
    price: string;
  }>;
  ingredients: Array<{
    slug: string;
    name: string;
    summary: string;
  }>;
  behov: Array<{
    slug: string;
    label: string;
    summary: string;
  }>;
};

const PRODUCT_LIMIT = 12;
const INGREDIENT_LIMIT = 8;
const BEHOV_LIMIT = 6;

const BEHOV_LABEL_BY_SLUG = new Map(BEHOV_LABELS.map((b) => [b.slug, b.label]));

/**
 * Normalise the query — trim, lowercase, drop diacritics. Same shape we
 * apply on the search corpus so "ä" matches "a" and "öl" matches "ol".
 */
function normalise(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export async function search(rawQuery: string): Promise<SearchResults> {
  const q = rawQuery.trim();
  if (q.length < 2) {
    return { products: [], ingredients: [], behov: [] };
  }
  const needle = normalise(q);

  // Products: case-insensitive contains across name + shortDescription.
  // We don't search longDescription (signal-to-noise tanks).
  const products = await prisma.product.findMany({
    where: {
      ...publicProductWhere(),
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { shortDescription: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: { totalSales: "desc" },
    take: PRODUCT_LIMIT,
    select: {
      slug: true,
      name: true,
      shortDescription: true,
      imageUrl: true,
      price: true,
    },
  });

  // Ingredients (in-memory — ~40 entries, no need for SQL).
  const ingredients = getAllIngredients()
    .filter((ing) => {
      const haystacks = [
        normalise(ing.name),
        ...(ing.aliases ?? []).map(normalise),
        normalise(ing.summary),
      ];
      return haystacks.some((h) => h.includes(needle));
    })
    .slice(0, INGREDIENT_LIMIT)
    .map((ing) => ({
      slug: ing.slug,
      name: ing.name,
      summary: ing.summary,
    }));

  // Behov / symptom pages (also in-memory). Match against label + summary.
  const behov = getAllSymptoms()
    .filter((s) => {
      const label = BEHOV_LABEL_BY_SLUG.get(s.slug) ?? s.shortTitle;
      return (
        normalise(label).includes(needle) ||
        normalise(s.summary).includes(needle) ||
        normalise(s.shortTitle).includes(needle)
      );
    })
    .slice(0, BEHOV_LIMIT)
    .map((s) => ({
      slug: s.slug,
      label: BEHOV_LABEL_BY_SLUG.get(s.slug) ?? s.shortTitle,
      summary: s.summary,
    }));

  return {
    products: products.map((p) => ({
      slug: p.slug,
      name: p.name,
      shortDescription: p.shortDescription,
      imageUrl: p.imageUrl,
      price: p.price.toString(),
    })),
    ingredients,
    behov,
  };
}
