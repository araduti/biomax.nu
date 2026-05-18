import Link from "next/link";
import Image from "next/image";
import { formatPriceSEK } from "@/lib/format";
import { Display, Eyebrow } from "@/components/ui/typography";
import type { BundleSummary } from "@/lib/bundles/queries";
import { Section } from "@/components/ui/section";

/**
 * Homepage strip of active bundles. Hidden when no bundles exist, so the
 * block doesn't surface as an empty section before any have been curated.
 * Activated from the admin /admin/startsida — disabled by default.
 */
export function BundleRail({ bundles }: { bundles: BundleSummary[] }) {
  if (bundles.length === 0) return null;
  const top = bundles.slice(0, 3);

  return (
    <Section tone="warm" padding="tight">
      <>
        <div className="flex items-end justify-between mb-10 gap-6 flex-wrap">
          <div>
            <Eyebrow className="mb-3">Paket</Eyebrow>
            <Display as="h2" size="lg">
              Köp tillsammans, spara
            </Display>
          </div>
          <Link
            href="/paket"
            className="font-sans text-body font-semibold text-primary-deep underline decoration-accent/40 underline-offset-[4px] hover:decoration-accent transition-colors"
          >
            Visa alla paket →
          </Link>
        </div>

        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {top.map((b) => (
            <li
              key={b.id}
              className="bg-surface-alt border border-border rounded-2xl overflow-hidden flex flex-col"
            >
              <Link
                href={`/paket/${b.slug}`}
                className="block group"
                aria-label={`Visa paket ${b.name}`}
              >
                <div className="grid grid-cols-3 gap-2 p-4 bg-surface">
                  {b.items.slice(0, 3).map((it) => (
                    <div
                      key={it.slug}
                      className="aspect-square rounded-lg overflow-hidden bg-surface-warm relative"
                    >
                      <Image
                        src={it.imageUrl}
                        alt={it.name}
                        fill
                        sizes="(max-width: 768px) 30vw, 140px"
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
              </div>
            </li>
          ))}
        </ul>
      </>
    </Section>
  );
}
