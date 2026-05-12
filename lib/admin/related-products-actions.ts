"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./guard";
import { publicProductWhere } from "@/lib/products/availability";

const MAX_RELATED = 6;

export type RelatedSearchResult = {
  slug: string;
  name: string;
  imageUrl: string;
  primaryCategory: string | null;
};

export async function searchProductsForRelated(
  sourceSlug: string,
  query: string
): Promise<RelatedSearchResult[]> {
  await requireAdmin();
  const q = query.trim();
  if (q.length < 2) return [];

  const rows = await prisma.product.findMany({
    where: {
      ...publicProductWhere(),
      slug: { not: sourceSlug },
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      slug: true,
      name: true,
      imageUrl: true,
      categories: { select: { name: true }, take: 1 },
    },
    orderBy: { totalSales: "desc" },
    take: 12,
  });
  return rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    imageUrl: r.imageUrl,
    primaryCategory: r.categories[0]?.name ?? null,
  }));
}

export type SetRelatedResult =
  | { ok: true; relatedSlugs: string[] }
  | { ok: false; error: string };

/**
 * Replace the editor-pinned cross-sells for a product. Order is preserved
 * via descending `score` (first pin = highest score). Public page falls
 * back to category-based auto-pick when no pins exist.
 */
export async function setRelatedProducts(
  sourceSlug: string,
  targetSlugs: string[]
): Promise<SetRelatedResult> {
  await requireAdmin();

  const source = await prisma.product.findUnique({
    where: { slug: sourceSlug },
    select: { id: true },
  });
  if (!source) return { ok: false, error: "Produkten hittades inte." };

  const cleaned: string[] = [];
  const seen = new Set<string>();
  for (const s of targetSlugs.map((x) => x.trim()).filter(Boolean)) {
    if (s === sourceSlug || seen.has(s)) continue;
    seen.add(s);
    cleaned.push(s);
    if (cleaned.length >= MAX_RELATED) break;
  }

  const targets = cleaned.length
    ? await prisma.product.findMany({
        where: { slug: { in: cleaned } },
        select: { id: true, slug: true },
      })
    : [];
  const idBySlug = new Map(targets.map((t) => [t.slug, t.id]));
  const finalSlugs = cleaned.filter((s) => idBySlug.has(s));

  try {
    await prisma.$transaction([
      prisma.productCrossSell.deleteMany({
        where: { sourceProductId: source.id },
      }),
      ...(finalSlugs.length
        ? [
            prisma.productCrossSell.createMany({
              data: finalSlugs.map((slug, i) => ({
                sourceProductId: source.id,
                targetProductId: idBySlug.get(slug)!,
                score: 100 - i,
              })),
            }),
          ]
        : []),
    ]);
  } catch (err) {
    console.error("setRelatedProducts failed:", err);
    return { ok: false, error: "Kunde inte spara relaterade produkter." };
  }

  revalidatePath(`/produkter/${sourceSlug}`);
  revalidatePath(`/admin/produkter/${sourceSlug}`);
  return { ok: true, relatedSlugs: finalSlugs };
}
