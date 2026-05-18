import Image from "next/image";
import type { Product, Category, ProductVariant } from "@prisma/client";
import { resolveVariants } from "@/lib/products/variants";
import { VariantSelector } from "@/components/product/variant-selector";
import { Display, Eyebrow } from "@/components/ui/typography";
import { ButtonLink } from "@/components/ui/button";
import { BuyOptionsPanel } from "@/components/product/buy-options-panel";
import { sanitizeRichText } from "@/lib/sanitize";
import { formatPriceSEK } from "@/lib/format";
import { StarRating } from "@/components/reviews/star-rating";
import { NotifyMeButton } from "@/components/product/notify-me-button";
import { KlarnaInstallment } from "@/components/product/klarna-installment";
import { getShippingRules } from "@/lib/site/settings";

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
    variants: ProductVariant[];
  };
  rating?: { count: number; average: number };
  /** Whether the viewer has a session — gates the subscribe-toggle CTA. */
  loggedIn?: boolean;
  /** Whether the viewer already has this product in their saved routine. */
  inRoutine?: boolean;
};

export async function ProductHero({
  product,
  rating,
  loggedIn = false,
  inRoutine = false,
}: Props) {
  const cat = product.categories[0];
  const resolved = resolveVariants(product.variants);
  const inStock = resolved.hasVariants
    ? resolved.variants.some((v) => v.inStock)
    : !product.manageStock || product.stock > 0;
  const { freeThresholdSek } = await getShippingRules();
  const freeShipLabel =
    freeThresholdSek !== null
      ? `Fri frakt över ${formatPriceSEK(freeThresholdSek)}`
      : null;
  const onSale =
    product.compareAtPrice &&
    product.compareAtPrice.toString() !== product.price.toString();
  const summary = sanitizeRichText(product.shortDescription);

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
              // Container is aspect-square with inset-[10%] → ~80 % of the
              // hero column. The column itself is 1fr-of-2.1fr inside a
              // max-w-[1240px] grid (~570 px on desktop, ~80 vw on mobile).
              // Serving 100 vw on mobile fetched ~1000 px for a ~370 px
              // display — net 2× over-fetch on the LCP image.
              sizes="(max-width: 768px) 80vw, (max-width: 1024px) 60vw, 480px"
              priority
              quality={82}
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

          {rating && rating.count > 0 && (
            <a
              href="#recensioner"
              className="mt-3 inline-flex items-center gap-2 text-accent-deep hover:opacity-80 transition-opacity"
              aria-label={`${rating.average} av 5 stjärnor baserat på ${rating.count} recensioner — läs recensionerna`}
            >
              <StarRating value={rating.average} size={16} />
              <span className="font-sans text-small text-ink-mute">
                {rating.average.toFixed(1)} ·{" "}
                <span className="underline decoration-accent/30 underline-offset-2">
                  {rating.count}{" "}
                  {rating.count === 1 ? "recension" : "recensioner"}
                </span>
              </span>
            </a>
          )}

          {summary && (
            <div
              className="prose-biomax mt-5 font-sans text-base md:text-lg leading-relaxed text-ink-mute max-w-[560px]"
              dangerouslySetInnerHTML={{ __html: summary }}
            />
          )}

          {resolved.hasVariants ? (
            // Multi-variant path — the client component owns the selector,
            // the displayed price/stock, and the add-to-cart button.
            <VariantSelector
              productId={product.id}
              productSlug={product.slug}
              productName={product.name}
              productImageUrl={product.imageUrl}
              variants={resolved.variants}
              defaultVariantId={resolved.defaultVariant.id}
              freeShipLabel={freeShipLabel}
              loggedIn={loggedIn}
              inRoutine={inRoutine}
            />
          ) : (
            <>
              {/* Single-SKU path — parent Product price + stock. */}
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
              <p className="mt-2 font-sans text-small text-ink-mute">
                Inkl. moms{freeShipLabel ? ` · ${freeShipLabel}` : ""}
              </p>

              <KlarnaInstallment
                priceSek={parseFloat(product.price.toString())}
              />

              <p
                className={`mt-3 font-sans text-small flex items-center gap-2 ${
                  inStock ? "text-accent-deep" : "text-ink-soft"
                }`}
              >
                <span
                  aria-hidden
                  className={`w-1.5 h-1.5 rounded-full ${
                    inStock ? "bg-accent" : "bg-ink-soft"
                  }`}
                />
                {inStock
                  ? "I lager · Skickas inom 1–2 arbetsdagar"
                  : "Tillfälligt slut"}
              </p>

              <div className="mt-8">
                {inStock ? (
                  <BuyOptionsPanel
                    product={{
                      id: product.id,
                      slug: product.slug,
                      name: product.name,
                      imageUrl: product.imageUrl,
                    }}
                    variantId={null}
                    variantLabel={null}
                    unitPrice={product.price.toString()}
                    loggedIn={loggedIn}
                    inRoutine={inRoutine}
                  />
                ) : (
                  <NotifyMeButton productSlug={product.slug} />
                )}
              </div>
            </>
          )}

          {/* Trust strip — small */}
          <ul className="mt-9 grid grid-cols-2 gap-x-6 gap-y-3 font-sans text-small text-ink-mute">
            {freeShipLabel && (
              <li className="flex items-start gap-2">
                <span aria-hidden className="text-accent-deep mt-0.5">
                  ✓
                </span>
                {freeShipLabel}
              </li>
            )}
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

          <p className="mt-8 font-sans text-caption text-ink-soft">
            Art.nr: {product.sku}
          </p>
        </div>
      </div>
    </section>
  );
}
