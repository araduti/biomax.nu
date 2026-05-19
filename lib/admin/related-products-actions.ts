"use server";

import { revalidatePath } from "next/cache";
import { requireTenantRole } from "./guard";
import { tenantScope } from "@/lib/tenant/db";
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
  const { tenantId } = await requireTenantRole("admin");
  const q = query.trim();
  if (q.length < 2) return [];

  const rows = await tenantScope(tenantId, (tx) =>
    tx.product.findMany({
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
    })
  );
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
  const { tenantId } = await requireTenantRole("admin");

  const cleaned: string[] = [];
  const seen = new Set<string>();
  for (const s of targetSlugs.map((x) => x.trim()).filter(Boolean)) {
    if (s === sourceSlug || seen.has(s)) continue;
    seen.add(s);
    cleaned.push(s);
    if (cleaned.length >= MAX_RELATED) break;
  }

  type SetOutcome =
    | { kind: "missing" }
    | { kind: "ok"; finalSlugs: string[] };
  let outcome: SetOutcome;
  try {
    outcome = await tenantScope(tenantId, async (tx): Promise<SetOutcome> => {
      const source = await tx.product.findUnique({
        where: { slug: sourceSlug },
        select: { id: true },
      });
      if (!source) return { kind: "missing" };

      const targets = cleaned.length
        ? await tx.product.findMany({
            where: { slug: { in: cleaned } },
            select: { id: true, slug: true },
          })
        : [];
      const idBySlug = new Map(targets.map((t) => [t.slug, t.id]));
      const finalSlugs = cleaned.filter((s) => idBySlug.has(s));

      await tx.productCrossSell.deleteMany({
        where: { sourceProductId: source.id },
      });
      if (finalSlugs.length) {
        await tx.productCrossSell.createMany({
          data: finalSlugs.map((slug, i) => ({
            sourceProductId: source.id,
            targetProductId: idBySlug.get(slug)!,
            score: 100 - i,
            tenantId,
          })),
        });
      }
      return { kind: "ok", finalSlugs };
    });
  } catch (err) {
    console.error("setRelatedProducts failed:", err);
    return { ok: false, error: "Kunde inte spara relaterade produkter." };
  }
  if (outcome.kind === "missing")
    return { ok: false, error: "Produkten hittades inte." };

  revalidatePath(`/produkter/${sourceSlug}`);
  revalidatePath(`/admin/produkter/${sourceSlug}`);
  return { ok: true, relatedSlugs: outcome.finalSlugs };
}
