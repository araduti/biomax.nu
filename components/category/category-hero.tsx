import Image from "next/image";
import type { CategoryMeta } from "@/lib/categories";
import { Display, Eyebrow, Accent } from "@/components/ui/typography";

export function CategoryHero({
  name,
  meta,
  productCount,
}: {
  /** Display name from the database (preserves diacritics like "Sömn & Oro"). */
  name: string;
  meta: CategoryMeta;
  productCount: number;
}) {
  return (
    <section className="bg-surface-warm py-14 md:py-20 px-6 md:px-8">
      <div className="max-w-[1240px] mx-auto grid grid-cols-1 md:grid-cols-[1fr_1.3fr] gap-10 md:gap-14 items-center">
        <div className="relative aspect-[4/5] md:aspect-[3/4] rounded-3xl overflow-hidden border border-border">
          <Image
            src={meta.photoUrl}
            alt={meta.alt}
            fill
            sizes="(max-width: 768px) 100vw, 480px"
            priority
            quality={85}
            className="object-cover"
          />
        </div>
        <div>
          <Eyebrow>
            Hälsoområde · {productCount} {productCount === 1 ? "produkt" : "produkter"}
          </Eyebrow>
          <p className="mt-3 font-display italic text-base md:text-lg text-accent-deep">
            {meta.latin}
          </p>
          <Display as="h1" size="xl" className="mt-1 mb-5">
            {name}
          </Display>
          <p className="mt-3 font-sans text-base md:text-lg leading-relaxed text-ink-body max-w-[600px]">
            {meta.description}
          </p>
          <p className="mt-6 font-sans italic text-body-lg text-ink-mute">
            Signaturväxt: <Accent>{meta.signature}</Accent>
          </p>
        </div>
      </div>
    </section>
  );
}
