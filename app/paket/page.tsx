import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { TopBar } from "@/components/site/top-bar";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Display, Eyebrow, Accent } from "@/components/ui/typography";
import { formatPriceSEK } from "@/lib/format";
import { getActiveBundles } from "@/lib/bundles/queries";
import { AddBundleButton } from "@/components/cart/add-bundle-button";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Paket — köp tillsammans, spara",
  description:
    "Utvalda kombinationer av produkter som ofta används ihop. Köp tillsammans så blir det billigare än att köpa dem var för sig.",
  alternates: { canonical: "/paket" },
};

export default async function BundlesIndexPage() {
  const bundles = await getActiveBundles();
  const crumbs = [
    { label: "Hem", href: "/" },
    { label: "Paket", href: "/paket" },
  ];

  return (
    <>
      <TopBar />
      <Header />
      <main>
        <div className="max-w-[1240px] mx-auto px-6 md:px-8 pt-8 pb-4">
          <Breadcrumb crumbs={crumbs} />
        </div>

        <section className="bg-surface-warm py-14 md:py-20 px-6 md:px-8">
          <div className="max-w-[820px] mx-auto">
            <Eyebrow className="mb-3">Paket</Eyebrow>
            <Display as="h1" size="xl">
              Köp tillsammans, <Accent>spara</Accent>
            </Display>
            <p className="mt-6 font-sans text-base md:text-lg leading-relaxed text-ink-mute max-w-[640px]">
              Utvalda kombinationer som ofta används ihop. Vi har satt
              ihop dem för att produkterna kompletterar varandra — och
              eftersom du köper flera samtidigt sänker vi priset.
            </p>
          </div>
        </section>

        <section className="max-w-[1240px] mx-auto px-6 md:px-8 py-14 md:py-20">
          {bundles.length === 0 ? (
            <p className="font-sans text-body-lg text-ink-mute italic text-center">
              Inga aktiva paket just nu — kom tillbaka snart.
            </p>
          ) : (
            <ul className="space-y-10">
              {bundles.map((b) => (
                <li
                  key={b.id}
                  className="bg-surface-alt border border-border rounded-2xl overflow-hidden"
                >
                  <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-0">
                    <div className="p-6 md:p-8 grid grid-cols-3 gap-3 bg-surface-warm">
                      {b.items.map((it) => (
                        <Link
                          key={it.slug}
                          href={`/produkter/${it.slug}`}
                          className="block aspect-square rounded-xl overflow-hidden bg-surface relative group"
                        >
                          <Image
                            src={it.imageUrl}
                            alt={it.name}
                            fill
                            sizes="(max-width: 768px) 33vw, 200px"
                            className="object-contain mix-blend-darken p-3 group-hover:scale-105 transition-transform"
                          />
                        </Link>
                      ))}
                    </div>
                    <div className="p-6 md:p-8 flex flex-col">
                      <h2 className="font-display text-2xl md:text-3xl font-medium tracking-tight text-primary-deep">
                        {b.name}
                      </h2>
                      {b.description && (
                        <p className="mt-3 font-sans text-body text-ink-mute leading-relaxed">
                          {b.description}
                        </p>
                      )}
                      <ul className="mt-5 space-y-1.5 font-sans text-small text-ink-body">
                        {b.items.map((it) => (
                          <li key={it.slug} className="flex items-baseline justify-between gap-3">
                            <Link
                              href={`/produkter/${it.slug}`}
                              className="hover:text-primary-deep underline decoration-accent/30 underline-offset-[3px] hover:decoration-accent"
                            >
                              {it.name}
                            </Link>
                            <span className="text-ink-soft tabular-nums">
                              {formatPriceSEK(it.listPriceSek.toString())}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-auto pt-6">
                        <div className="flex items-baseline gap-3">
                          <span className="font-display text-3xl font-medium text-primary-deep tabular-nums">
                            {formatPriceSEK(b.bundlePriceSek.toString())}
                          </span>
                          {b.savingsSek > 0 && (
                            <span className="font-sans text-body text-ink-soft line-through tabular-nums">
                              {formatPriceSEK(b.listTotalSek.toString())}
                            </span>
                          )}
                        </div>
                        {b.savingsSek > 0 && (
                          <p className="mt-1 font-sans text-caption text-accent-deep font-semibold">
                            Du sparar {formatPriceSEK(b.savingsSek.toString())} jämfört med att köpa dem var för sig ({b.discountPercent} % rabatt)
                          </p>
                        )}
                        <div className="mt-5">
                          <AddBundleButton
                            bundle={{
                              id: b.id,
                              slug: b.slug,
                              name: b.name,
                              discountPercent: b.discountPercent,
                              items: b.items.map((it) => ({
                                productId: it.productId,
                                slug: it.slug,
                                name: it.name,
                                imageUrl: it.imageUrl,
                                price: it.listPriceSek.toString(),
                              })),
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
