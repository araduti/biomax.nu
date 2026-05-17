import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { TopBar } from "@/components/site/top-bar";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Display, Eyebrow } from "@/components/ui/typography";
import { formatPriceSEK } from "@/lib/format";
import { search } from "@/lib/search/query";
import { SearchInput } from "@/components/search/search-input";

export const metadata: Metadata = {
  title: "Sök",
  description: "Sök bland produkter, ingredienser och behovsområden.",
  alternates: { canonical: "/sok" },
  // Internal search results are thin/duplicate — keep them out of the
  // index (crawl-budget) but let crawlers follow through to products.
  robots: { index: false, follow: true },
};

type RouteParams = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: RouteParams) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const results = q.length >= 2
    ? await search(q)
    : { products: [], ingredients: [], behov: [] };

  const total =
    results.products.length + results.ingredients.length + results.behov.length;

  const crumbs = [
    { label: "Hem", href: "/" },
    { label: "Sök", href: "/sok" },
  ];

  return (
    <>
      <TopBar />
      <Header />
      <main>
        <div className="max-w-[1240px] mx-auto px-6 md:px-8 pt-8 pb-4">
          <Breadcrumb crumbs={crumbs} />
        </div>

        <section className="bg-surface-warm py-12 md:py-16 px-6 md:px-8">
          <div className="max-w-[680px] mx-auto">
            <Eyebrow className="mb-3">Sök</Eyebrow>
            <Display as="h1" size="xl" className="mb-6">
              Hitta det du letar efter
            </Display>
            <SearchInput initialQuery={q} />
          </div>
        </section>

        <section className="max-w-[1240px] mx-auto px-6 md:px-8 py-10 md:py-16">
          {q.length < 2 ? (
            <p className="font-sans text-[14.5px] text-ink-mute italic">
              Skriv minst två tecken.
            </p>
          ) : total === 0 ? (
            <div>
              <p className="font-sans text-base text-ink-body mb-2">
                Inga träffar på &quot;<strong>{q}</strong>&quot;.
              </p>
              <p className="font-sans text-[14px] text-ink-mute">
                Försök ett kortare ord, eller bläddra i{" "}
                <Link
                  href="/produkter"
                  className="text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent"
                >
                  alla produkter
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="space-y-12">
              {results.products.length > 0 && (
                <div>
                  <h2 className="font-display text-2xl font-medium text-primary-deep tracking-tight mb-5">
                    Produkter ({results.products.length})
                  </h2>
                  <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {results.products.map((p) => (
                      <li key={p.slug}>
                        <Link
                          href={`/produkter/${p.slug}`}
                          className="flex gap-4 bg-surface-alt border border-border rounded-2xl p-4 hover:border-border-soft transition-colors"
                        >
                          <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-surface-warm">
                            <Image
                              src={p.imageUrl || "/products/_placeholder.svg"}
                              alt={p.name}
                              fill
                              sizes="80px"
                              className="object-contain mix-blend-darken p-1.5"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-display text-[15px] font-medium text-primary-deep leading-tight line-clamp-2">
                              {p.name}
                            </p>
                            <p className="mt-1 font-sans text-[12.5px] text-ink-mute line-clamp-2">
                              {p.shortDescription.slice(0, 80)}
                            </p>
                            <p className="mt-1.5 font-sans text-[13px] text-primary-deep tabular-nums font-semibold">
                              {formatPriceSEK(p.price)}
                            </p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {results.behov.length > 0 && (
                <div>
                  <h2 className="font-display text-2xl font-medium text-primary-deep tracking-tight mb-5">
                    Efter behov ({results.behov.length})
                  </h2>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {results.behov.map((b) => (
                      <li key={b.slug}>
                        <Link
                          href={`/hjalp/${b.slug}`}
                          className="block bg-surface-alt border border-border rounded-2xl p-5 hover:border-border-soft transition-colors"
                        >
                          <p className="font-display text-lg font-medium text-primary-deep tracking-tight">
                            {b.label} →
                          </p>
                          <p className="mt-1.5 font-sans text-[13.5px] text-ink-mute leading-relaxed line-clamp-2">
                            {b.summary}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {results.ingredients.length > 0 && (
                <div>
                  <h2 className="font-display text-2xl font-medium text-primary-deep tracking-tight mb-5">
                    Ingredienser ({results.ingredients.length})
                  </h2>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {results.ingredients.map((i) => (
                      <li key={i.slug}>
                        <Link
                          href={`/kunskap/ingredienser/${i.slug}`}
                          className="block bg-surface-alt border border-border rounded-2xl p-5 hover:border-border-soft transition-colors"
                        >
                          <p className="font-display text-lg font-medium text-primary-deep tracking-tight">
                            {i.name} →
                          </p>
                          <p className="mt-1.5 font-sans text-[13.5px] text-ink-mute leading-relaxed line-clamp-2">
                            {i.summary}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
