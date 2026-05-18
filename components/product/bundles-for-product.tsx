import Link from "next/link";
import Image from "next/image";
import { formatPriceSEK } from "@/lib/format";
import { Eyebrow, Display } from "@/components/ui/typography";
import type { BundleSummary } from "@/lib/bundles/queries";

/**
 * Compact bundle strip rendered on the product page between content and
 * related products. Highlights "buy this with X, save Y" — the same data
 * shape `/paket` uses, in a narrower layout.
 *
 * Hidden when no bundles include the product (so PDPs without bundles
 * stay clean — no empty section, no "kommer snart" placeholder).
 */
export function BundlesForProduct({
  bundles,
  currentProductName,
}: {
  bundles: BundleSummary[];
  currentProductName: string;
}) {
  if (bundles.length === 0) return null;

  return (
    <section className="bg-surface-warm border-y border-border">
      <div className="max-w-[1240px] mx-auto px-6 md:px-8 py-14 md:py-20">
        <div className="max-w-[680px] mb-10">
          <Eyebrow className="mb-3">Paket</Eyebrow>
          <Display as="h2" size="md">
            Köp {currentProductName} tillsammans med…
          </Display>
          <p className="mt-4 font-sans text-body-lg text-ink-mute leading-relaxed">
            Utvalda kombinationer där {currentProductName} ingår — och där
            slutpriset är lägre än om du köper dem var för sig.
          </p>
        </div>

        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {bundles.map((b) => (
            <li
              key={b.id}
              className="bg-surface-alt border border-border rounded-2xl overflow-hidden flex flex-col"
            >
              <Link
                href={`/paket/${b.slug}`}
                className="block group"
                aria-label={`Visa paket ${b.name}`}
              >
                <div className="grid grid-cols-3 gap-2 p-4 bg-surface-warm">
                  {b.items.slice(0, 3).map((it) => (
                    <div
                      key={it.slug}
                      className="aspect-square rounded-lg overflow-hidden bg-surface relative"
                    >
                      <Image
                        src={it.imageUrl}
                        alt={it.name}
                        fill
                        sizes="(max-width: 768px) 30vw, 130px"
                        className="object-contain mix-blend-darken p-2 group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  ))}
                </div>
              </Link>
              <div className="p-5 flex flex-col flex-1">
                <Link
                  href={`/paket/${b.slug}`}
                  className="font-display text-lg md:text-xl font-medium tracking-tight text-primary-deep hover:text-primary transition-colors"
                >
                  {b.name}
                </Link>
                <p className="mt-2 font-sans text-caption text-ink-mute">
                  {b.items.length} produkter · {b.discountPercent} % rabatt
                </p>
                <div className="mt-auto pt-5 flex items-baseline gap-3">
                  <span className="font-display text-2xl font-medium text-primary-deep tabular-nums">
                    {formatPriceSEK(b.bundlePriceSek.toString())}
                  </span>
                  {b.savingsSek > 0 && (
                    <span className="font-sans text-small text-ink-soft line-through tabular-nums">
                      {formatPriceSEK(b.listTotalSek.toString())}
                    </span>
                  )}
                </div>
                {b.savingsSek > 0 && (
                  <p className="mt-1 font-sans text-caption text-accent-deep font-semibold">
                    Du sparar {formatPriceSEK(b.savingsSek.toString())}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
