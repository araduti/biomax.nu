import Image from "next/image";
import Link from "next/link";
import type { Product } from "@prisma/client";
import { type Season, type SeasonMeta, seasons } from "@/lib/seasons";
import { ButtonLink } from "@/components/ui/button";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { formatPriceSEK } from "@/lib/format";

type Props = {
  season: Season;
  /**
   * Optional resolved hero metadata from the editor-managed
   * `HomepageHero` table. When NULL, falls back to the hardcoded
   * `seasons[season]` map so the component remains drop-in usable.
   */
  meta?: SeasonMeta | null;
  /** "Säsongens favorit" — fetched server-side, passed in. Optional. */
  featured?: Pick<Product, "id" | "slug" | "name" | "price" | "imageUrl"> | null;
};

export function Hero({ season, meta, featured }: Props) {
  const s = meta ?? seasons[season];
  return (
    <section className="relative bg-primary-deep overflow-hidden">
      <div className="relative h-[62svh] min-h-[560px] max-h-[780px]">
        <Image
          src={s.photoUrl}
          alt={s.photoAlt}
          fill
          sizes="100vw"
          quality={85}
          priority
          className="object-cover"
        />

        {/* Left-side darkening gradient for headline legibility */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, rgba(15,36,64,0.78) 0%, rgba(15,36,64,0.5) 38%, rgba(15,36,64,0) 70%)",
          }}
        />

        {/* Subtle bottom-vignette */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(15,36,64,0) 65%, rgba(15,36,64,0.35) 100%)",
          }}
        />

        {/* Content overlay */}
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-[1240px] mx-auto px-6 md:px-8 w-full">
            <div className="max-w-[640px]">
              <h1
                className="font-display font-medium tracking-tight leading-[1.02] text-surface m-0"
                style={{ fontSize: "clamp(56px, 8vw, 112px)" }}
              >
                Livskvalitet,{" "}
                <em
                  className="not-italic"
                  style={{ fontStyle: "italic", color: s.accent, fontWeight: 400 }}
                >
                  i fokus.
                </em>
              </h1>
              <p className="mt-6 text-lg md:text-xl leading-snug text-surface/90 max-w-[540px]">
                Vetenskapligt baserade naturpreparat. Kliniskt dokumenterade
                ingredienser. Tydligt deklarerat innehåll. Det är så vi har gjort
                det i tjugofem år.
              </p>
              <div className="mt-9 flex gap-3 flex-wrap">
                <ButtonLink href="/produkter" variant="inverted">
                  Utforska produkter
                </ButtonLink>
                <ButtonLink href="/om-oss" variant="inverted-outline">
                  Vår berättelse
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>

        {/* Featured product — bottom-right glass card */}
        {featured && (
          <div className="hidden md:flex absolute bottom-8 right-8 w-[360px] gap-4 items-center p-[18px] rounded-2xl border border-surface/40 bg-surface/95 backdrop-blur-xl shadow-[0_12px_40px_rgba(15,36,64,0.25)]">
            <Link
              href={`/produkter/${featured.slug}`}
              aria-label={`Visa produkt: ${featured.name}`}
              className="relative w-[84px] h-[84px] rounded-[10px] overflow-hidden bg-surface-warm flex-shrink-0 group"
            >
              <Image
                src={featured.imageUrl || "/products/_placeholder.svg"}
                alt={featured.name}
                fill
                sizes="84px"
                quality={85}
                className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
              />
            </Link>
            <div className="flex-1 min-w-0">
              <span className="font-sans text-[9px] font-bold uppercase tracking-[0.22em] text-accent-deep flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                Säsongens favorit
              </span>
              <Link
                href={`/produkter/${featured.slug}`}
                className="block font-display text-xl font-medium tracking-tight text-primary-deep mt-1 mb-1.5 leading-[1.1] hover:text-primary transition-colors"
              >
                {featured.name}
              </Link>
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-lg font-medium text-primary-deep tracking-tight">
                  {formatPriceSEK(featured.price.toString())}
                </span>
                <AddToCartButton
                  product={{
                    id: featured.id,
                    slug: featured.slug,
                    name: featured.name,
                    imageUrl: featured.imageUrl,
                    price: featured.price.toString(),
                  }}
                  size="sm"
                  label="Lägg i varukorg"
                  className="min-w-0 px-3.5 h-9 text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* Motif caption — bottom-left */}
        <div className="absolute bottom-8 left-6 md:left-8 font-display italic text-sm text-surface/70 pointer-events-none">
          {s.motif}
        </div>
      </div>
    </section>
  );
}
