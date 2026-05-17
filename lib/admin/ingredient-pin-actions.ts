"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./guard";
import { publicProductWhere } from "@/lib/products/availability";

const MAX_PINS = 8;

export type IngredientPinSearchResult = {
  slug: string;
  name: string;
  imageUrl: string;
  primaryCategory: string | null;
};

export async function searchProductsForIngredientPin(
  query: string
): Promise<IngredientPinSearchResult[]> {
  await requireAdmin();
  const q = query.trim();
  if (q.length < 2) return [];
  const rows = await prisma.product.findMany({
    where: {
      ...publicProductWhere(),
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

export type SetPinsResult = { ok: true } | { ok: false; error: string };

/**
 * Replace the pin list for a single ingredient slug. Order in the
 * provided array becomes the `position` column. Re-running with the
 * same array is a no-op.
 */
export async function setIngredientPins(
  ingredientSlug: string,
  productSlugs: string[]
): Promise<SetPinsResult> {
  await requireAdmin();
  if (productSlugs.length > MAX_PINS) {
    return {
      ok: false,
      error: `Max ${MAX_PINS} pins per ingrediens.`,
    };
  }

  const products = await prisma.product.findMany({
    where: { slug: { in: productSlugs } },
    select: { id: true, slug: true },
  });
  const idBySlug = new Map(products.map((p) => [p.slug, p.id]));
  const finalSlugs = productSlugs.filter((s) => idBySlug.has(s));

  try {
    await prisma.$transaction([
      prisma.ingredientPin.deleteMany({ where: { ingredientSlug } }),
      ...(finalSlugs.length > 0
        ? [
            prisma.ingredientPin.createMany({
              data: finalSlugs.map((slug, i) => ({
                ingredientSlug,
                productId: idBySlug.get(slug)!,
                position: i,
              })),
            }),
          ]
        : []),
    ]);
  } catch (err) {
    console.error("setIngredientPins failed:", err);
    return { ok: false, error: "Kunde inte spara." };
  }

  revalidatePath(`/kop/${ingredientSlug}`);
  revalidatePath(`/kunskap/ingredienser/${ingredientSlug}`);
  revalidatePath("/admin/ingredient-pins");
  return { ok: true };
}
