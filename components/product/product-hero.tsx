import Image from "next/image";
import type { Product, Category } from "@prisma/client";
import { Display, Eyebrow } from "@/components/ui/typography";
import { ButtonLink } from "@/components/ui/button";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { stripHtml } from "@/lib/sanitize";
import { formatPriceSEK } from "@/lib/format";

type Props = {
  product: Pick<
    Product,
    | "id"
    | "name"
    | "slug"
    | "sku"
    | "shortDescription"
    | "imageUrl"
    | "price"
    | "compareAtPrice"
    | "stock"
    | "manageStock"
  > & {
    categories: Pick<Category, "name" | "slug">[];
  };
};

export function ProductHero({ product }: Props) {
  const cat = product.categories[0];
  const inStock = !product.manageStock || product.stock > 0;
  const onSale =
    product.compareAtPrice &&
    product.compareAtPrice.toString() !== product.price.toString();
  const summary = stripHtml(product.shortDescription, 240);

  return (
    <section className="bg-surface-warm py-12 md:py-20 px-6 md:px-8">
      <div className="max-w-[1240px] mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 md:gap-16 items-start">
        {/* Normalized to 1000×1000 with white padding; mix-blend-darken
            against the brand warm-cream container neutralizes the photo's
            white background to invisible cream while preserving bottle
            colors at full saturation. Inset wrapper gives breathing room. */}
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-surface-warm">
          <div className="absolute inset-[10%]">
            <Image
              src={product.imageUrl || "/products/_placeholder.svg"}
              alt={product.name}
              fill
              sizes="(max-width: 1024px) 100vw, 600px"
              priority
              quality={90}
              className="object-contain mix-blend-darken"
            />
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-col">
          {cat && (
            <Eyebrow className="mb-3">
              <a
                href={`/kategorier/${cat.slug}`}
                className="hover:text-primary transition-colors"
              >
                {cat.name}
              </a>
            </Eyebrow>
          )}

          <Display as="h1" size="xl">
            {product.name}
          </Display>

          {summary && (
            <p className="mt-5 font-sans text-base md:text-lg leading-relaxed text-ink-mute max-w-[560px]">
              {summary}
            </p>
          )}

          {/* Price block */}
          <div className="mt-8 flex items-baseline gap-4">
            <span className="font-display text-4xl font-medium tracking-tight text-primary-deep">
              {formatPriceSEK(product.price.toString())}
            </span>
            {onSale && product.compareAtPrice && (
              <span className="font-sans text-base text-ink-soft line-through">
                {formatPriceSEK(product.compareAtPrice.toString())}
              </span>
            )}
          </div>
          <p className="mt-2 font-sans text-[13px] text-ink-mute">
            Inkl. moms · Fri frakt över 499 kr
          </p>

          {/* Stock signal */}
          <p
            className={`mt-3 font-sans text-[13px] flex items-center gap-2 ${
              inStock ? "text-accent-deep" : "text-ink-soft"
            }`}
          >
            <span
              aria-hidden
              className={`w-1.5 h-1.5 rounded-full ${
                inStock ? "bg-accent" : "bg-ink-soft"
              }`}
            />
            {inStock ? "I lager · Skickas inom 1–2 arbetsdagar" : "Tillfälligt slut"}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <AddToCartButton
              product={{
                id: product.id,
                slug: product.slug,
                name: product.name,
                imageUrl: product.imageUrl,
                price: product.price.toString(),
              }}
              size="lg"
              className="min-w-[220px]"
            />
            <ButtonLink href="#" variant="outline" size="lg">
              Lägg till i favoriter
            </ButtonLink>
          </div>

          {/* Trust strip — small */}
          <ul className="mt-9 grid grid-cols-2 gap-x-6 gap-y-3 font-sans text-[13px] text-ink-mute">
            <li className="flex items-start gap-2">
              <span aria-hidden className="text-accent-deep mt-0.5">
                ✓
              </span>
              Fri frakt över 499 kr
            </li>
            <li className="flex items-start gap-2">
              <span aria-hidden className="text-accent-deep mt-0.5">
                ✓
              </span>
              Klarna · Faktura 30 dagar
            </li>
            <li className="flex items-start gap-2">
              <span aria-hidden className="text-accent-deep mt-0.5">
                ✓
              </span>
              30 dagars öppet köp
            </li>
            <li className="flex items-start gap-2">
              <span aria-hidden className="text-accent-deep mt-0.5">
                ✓
              </span>
              Familjeägt sedan 2001
            </li>
          </ul>

          <p className="mt-8 font-sans text-[12px] text-ink-soft">
            Art.nr: {product.sku}
          </p>
        </div>
      </div>
    </section>
  );
}
