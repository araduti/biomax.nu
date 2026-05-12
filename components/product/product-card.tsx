import Image from "next/image";
import Link from "next/link";
import type { Product, Category } from "@prisma/client";
import { stripHtml } from "@/lib/sanitize";
import { formatPriceSEK } from "@/lib/format";

type ProductCardProduct = Pick<
  Product,
  "id" | "slug" | "name" | "shortDescription" | "imageUrl" | "price" | "totalSales"
> & {
  categories?: Pick<Category, "name">[];
};

const TAG_BY_SLUG: Record<string, string> = {
  balans: "Mest sålda",
  bjorkglukos: "Bästsäljare",
  "beta-glucan": "Kliniskt dokumenterat",
  "easy-way-lactium": "Bästsäljare",
};

/**
 * Catalog product card. The image source has been normalized server-side
 * (scripts/normalize-product-images.ts) — every product is 1000×1000 with
 * the brand warm-cream backdrop baked in. So this component can be light:
 * no card frame, no compensating chrome — just image, meta, title, price.
 *
 * On warm-cream section backgrounds the photo's cream padding merges
 * seamlessly so all bottles appear to float on a unified surface.
 */
export function ProductCard({ product }: { product: ProductCardProduct }) {
  const category = product.categories?.[0]?.name;
  const tag = TAG_BY_SLUG[product.slug];
  const description = stripHtml(product.shortDescription, 110);

  return (
    <Link href={`/produkter/${product.slug}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-surface-warm">
        <div className="absolute inset-[8%]">
          <Image
            src={product.imageUrl || "/products/_placeholder.svg"}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 280px"
            quality={85}
            className="object-contain mix-blend-darken transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        </div>
      </div>

      <div className="mt-4 font-sans text-[10px] uppercase tracking-[0.22em] text-ink-mute font-semibold leading-snug">
        {category && <span>{category}</span>}
        {category && tag && (
          <span aria-hidden className="mx-2 inline-block w-1 h-1 rounded-full bg-accent align-middle" />
        )}
        {tag && <span className="text-accent-deep">{tag}</span>}
      </div>

      <h3 className="mt-2 font-display text-lg md:text-xl font-medium tracking-tight text-primary-deep leading-tight line-clamp-2 min-h-[2.5em]">
        {product.name}
      </h3>

      {description && (
        <p className="mt-2 font-sans text-[13px] text-ink-mute leading-relaxed line-clamp-2">
          {description}
        </p>
      )}

      <div className="mt-3 font-display text-[15px] font-medium text-primary-deep tracking-tight">
        {formatPriceSEK(product.price.toString())}
      </div>
    </Link>
  );
}
