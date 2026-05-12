/**
 * Resolve which products contain a given ingredient.
 *
 * Matching: row name (lowercased) substring against the ingredient's primary
 * name + each alias. The same loose match used in the monograph "Finns i"
 * block — keeps both surfaces in sync.
 */
import { prisma } from "@/lib/prisma";
import type { IngredientMeta } from "@/lib/knowledge/ingredients";

export type MatchedProduct = {
  slug: string;
  name: string;
  shortDescription: string;
  imageUrl: string;
  price: string;
  compareAtPrice: string | null;
  inStock: boolean;
};

export async function findProductsForIngredient(
  ing: IngredientMeta
): Promise<MatchedProduct[]> {
  const all = await prisma.product.findMany({
    where: { status: "PUBLISHED" },
    select: {
      slug: true,
      name: true,
      shortDescription: true,
      imageUrl: true,
      price: true,
      compareAtPrice: true,
      stock: true,
      manageStock: true,
      ingredientList: true,
    },
  });

  const terms = [
    ing.name.toLowerCase(),
    ...(ing.aliases ?? []).map((a) => a.toLowerCase()),
  ];

  return all
    .filter((p) => {
      const list = p.ingredientList as { rows?: { name: string }[] } | null;
      if (!list?.rows) return false;
      return list.rows.some((r) => {
        const n = r.name.toLowerCase();
        return terms.some((t) => n.includes(t));
      });
    })
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      shortDescription: p.shortDescription,
      imageUrl: p.imageUrl,
      price: p.price.toString(),
      compareAtPrice: p.compareAtPrice ? p.compareAtPrice.toString() : null,
      inStock: !p.manageStock || p.stock > 0,
    }));
}
