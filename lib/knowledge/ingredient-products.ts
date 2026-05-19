/**
 * Resolve which products contain a given ingredient.
 *
 * Editor-pinned takes priority. Otherwise reads the `ProductIngredient`
 * join table populated on product save (`syncProductIngredients` in
 * `lib/admin/post-save-sync.ts`), which itself uses the same `findIngredient`
 * matcher the monograph "Finns i" block uses — so both surfaces stay in
 * sync.
 *
 * Was previously a full-table scan + JS substring match invoked 40+ times
 * sequentially from `sitemap.ts`, `llms.txt/route.ts`, and
 * `kop/[slug]/generateStaticParams`. The join table makes each call O(1).
 */
import { hostTenantScope } from "@/lib/tenant/db";
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

function toMatched(p: {
  slug: string;
  name: string;
  shortDescription: string;
  imageUrl: string;
  price: { toString(): string };
  compareAtPrice: { toString(): string } | null;
  stock: number;
  manageStock: boolean;
}): MatchedProduct {
  return {
    slug: p.slug,
    name: p.name,
    shortDescription: p.shortDescription,
    imageUrl: p.imageUrl,
    price: p.price.toString(),
    compareAtPrice: p.compareAtPrice ? p.compareAtPrice.toString() : null,
    inStock: !p.manageStock || p.stock > 0,
  };
}

export async function findProductsForIngredient(
  ing: IngredientMeta
): Promise<MatchedProduct[]> {
  // 1) Editor-pinned takes priority. Pins resolve via the ingredient slug
  // (not name) and override the auto-derived list completely.
  const pinned = await hostTenantScope((tx) =>
    tx.ingredientPin.findMany({
      where: {
        ingredientSlug: ing.slug,
        product: { status: "PUBLISHED" },
      },
      orderBy: { position: "asc" },
      select: {
        product: {
          select: {
            slug: true,
            name: true,
            shortDescription: true,
            imageUrl: true,
            price: true,
            compareAtPrice: true,
            stock: true,
            manageStock: true,
          },
        },
      },
    })
  );
  if (pinned.length > 0) {
    return pinned.map(({ product }) => toMatched(product));
  }

  // 2) ProductIngredient join. Populated on product save via
  // `syncProductIngredients` (lib/admin/post-save-sync.ts).
  const joined = await hostTenantScope((tx) =>
    tx.productIngredient.findMany({
      where: {
        ingredientSlug: ing.slug,
        product: { status: "PUBLISHED" },
      },
      select: {
        product: {
          select: {
            slug: true,
            name: true,
            shortDescription: true,
            imageUrl: true,
            price: true,
            compareAtPrice: true,
            stock: true,
            manageStock: true,
          },
        },
      },
    })
  );

  return joined.map(({ product }) => toMatched(product));
}
