/**
 * Programmatic landing pages — `/kop/[ingredient-slug]`.
 *
 * The intent surface for queries like "köp koenzym q10 sverige": pairs the
 * monograph (trust + clarity) with the actual buyable Biomax products. Pages
 * only generate when an ingredient has at least one matching product —
 * skipping orphans avoids thin-content SEO penalties.
 *
 * Architecture:
 *   - generateStaticParams limits the route to ingredients with products
 *   - JSON-LD: CollectionPage + ItemList of the products
 *   - Editorial body excerpt drives uniqueness; we never just dump a product
 *     grid behind a keyword title
 */
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/site/top-bar";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Display, Eyebrow } from "@/components/ui/typography";
import { JsonLd } from "@/components/seo/json-ld";
import {
  breadcrumbLd,
  collectionPageLd,
  itemListLd,
} from "@/lib/jsonld";
import {
  getIngredient,
  getAllIngredients,
  getRelated,
} from "@/lib/knowledge/ingredients";
import { findProductsForIngredient } from "@/lib/knowledge/ingredient-products";
import { stripHtml } from "@/lib/sanitize";
import { formatPriceSEK } from "@/lib/format";

type RouteParams = Promise<{ slug: string }>;

export const revalidate = 3600;

/**
 * Only generate landing pages for ingredients that actually have products.
 * Cheaper than rendering 19 routes, more honest SEO than a "köp X" page that
 * shows a 0-product grid.
 */
export async function generateStaticParams() {
  const out: { slug: string }[] = [];
  for (const ing of getAllIngredients()) {
    const products = await findProductsForIngredient(ing);
    if (products.length > 0) out.push({ slug: ing.slug });
  }
  return out;
}

export async function generateMetadata({
  params,
}: {
  params: RouteParams;
}): Promise<Metadata> {
  const { slug } = await params;
  const ing = getIngredient(slug);
  if (!ing) return { title: "Hittades inte" };
  return {
    title: `Köp ${ing.name}`,
    description: `${ing.summary} Hitta Biomax-produkter med ${ing.name} — svenskt familjeföretag sedan 2001, fri frakt över 499 kr.`,
    alternates: { canonical: `/kop/${ing.slug}` },
  };
}

export default async function IngredientBuyPage({
  params,
}: {
  params: RouteParams;
}) {
  const { slug } = await params;
  const ing = getIngredient(slug);
  if (!ing) notFound();

  const products = await findProductsForIngredient(ing);
  if (products.length === 0) notFound();

  const related = getRelated(ing, 3);

  const crumbs = [
    { label: "Hem", href: "/" },
    { label: "Produkter", href: "/produkter" },
    { label: `Köp ${ing.name}`, href: `/kop/${ing.slug}` },
  ];

  return (
    <>
      <TopBar />
      <Header />
      <JsonLd data={breadcrumbLd(crumbs)} />
      <JsonLd
        data={collectionPageLd({
          name: `Köp ${ing.name} — Biomax`,
          description: ing.summary,
          url: `/kop/${ing.slug}`,
        })}
      />
      <JsonLd
        data={itemListLd({
          name: `Biomax-produkter med ${ing.name}`,
          url: `/kop/${ing.slug}`,
          items: products.map((p) => ({
            name: p.name,
            href: `/produkter/${p.slug}`,
          })),
        })}
      />

      <main>
        <div className="max-w-[1100px] mx-auto px-6 md:px-8 pt-8 pb-4">
          <Breadcrumb crumbs={crumbs} />
        </div>

        <section className="max-w-[1100px] mx-auto px-6 md:px-8 pt-6 pb-10 md:pb-12">
          <header className="max-w-[760px] mb-10 md:mb-14">
            <Eyebrow>Köp {ing.name}</Eyebrow>
            <Display as="h1" size="hero" className="mt-3">
              {ing.name} från Biomax.
            </Display>
            <p className="mt-6 font-display italic text-xl md:text-2xl text-ink-mute leading-snug max-w-[640px]">
              {ing.summary}
            </p>
          </header>

          <section className="mb-12 md:mb-16">
            <Eyebrow>I sortimentet</Eyebrow>
            <h2 className="mt-2 mb-6 md:mb-8 font-display text-2xl md:text-[28px] font-medium tracking-tight text-primary-deep">
              {products.length === 1
                ? `1 produkt med ${ing.name}`
                : `${products.length} produkter med ${ing.name}`}
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              {products.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/produkter/${p.slug}`}
                    className="group block h-full bg-surface-alt border border-border rounded-2xl overflow-hidden hover:border-accent transition-colors"
                  >
                    <div className="aspect-square bg-surface-warm relative">
                      {p.imageUrl && (
                        <Image
                          src={p.imageUrl}
                          alt={p.name}
                          fill
                          sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
                          className="object-contain p-6 mix-blend-darken"
                        />
                      )}
                    </div>
                    <div className="p-5 md:p-6">
                      <h3 className="font-display text-xl md:text-[22px] font-medium tracking-tight text-primary-deep group-hover:text-accent-deep transition-colors">
                        {p.name}
                      </h3>
                      <p className="mt-2 font-sans text-[14px] text-ink-mute leading-snug line-clamp-2">
                        {stripHtml(p.shortDescription, 120) || ""}
                      </p>
                      <div className="mt-4 flex items-baseline justify-between gap-3">
                        <span className="font-display text-xl text-primary-deep">
                          {formatPriceSEK(p.price)}
                        </span>
                        <span className="font-sans text-[12px] text-accent-deep uppercase tracking-[0.18em] font-semibold">
                          {p.inStock ? "Visa →" : "Slut →"}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="grid md:grid-cols-[1.5fr_1fr] gap-10 md:gap-14 max-w-[920px] mb-12 md:mb-16">
            <div>
              <Eyebrow>Vad är {ing.name}?</Eyebrow>
              <h2 className="mt-2 mb-5 font-display text-2xl md:text-[28px] font-medium tracking-tight text-primary-deep">
                Kort om ämnet
              </h2>
              <div className="font-sans text-[16px] md:text-[16.5px] leading-[1.7] text-ink-body space-y-4">
                {ing.body.slice(0, 2).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              <Link
                href={`/kunskap/ingredienser/${ing.slug}`}
                className="mt-5 inline-flex items-center gap-2 font-sans text-[13px] font-semibold text-accent-deep hover:text-primary-deep transition-colors"
              >
                <span aria-hidden>◇</span>
                Hela monografin om {ing.name}
                <span aria-hidden>→</span>
              </Link>
            </div>
            <aside className="bg-surface-alt border border-border-soft rounded-2xl p-6 md:p-7 h-fit">
              <Eyebrow>Varför Biomax?</Eyebrow>
              <p className="mt-3 font-display text-[20px] leading-snug text-primary-deep">
                Familjeföretag sedan 2001.
              </p>
              <ul className="mt-4 space-y-2 font-sans text-[14px] text-ink-body leading-[1.6]">
                <li>· Receptfritt — köp direkt online</li>
                <li>· Fri frakt över 499 kr i Sverige</li>
                <li>· 30 dagars öppet köp</li>
                <li>· Klarna · faktura, kort eller delbetalning</li>
              </ul>
            </aside>
          </section>

          {related.length > 0 && (
            <section className="border-t border-border-soft pt-10">
              <Eyebrow>Liknande</Eyebrow>
              <h2 className="mt-2 mb-5 font-display text-2xl md:text-[28px] font-medium tracking-tight text-primary-deep">
                Andra ämnen att utforska
              </h2>
              <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-[920px]">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link
                      href={`/kunskap/ingredienser/${r.slug}`}
                      className="block h-full bg-surface-alt border border-border rounded-xl px-5 py-4 hover:border-accent hover:bg-surface transition-colors"
                    >
                      <span className="font-display text-[17px] font-medium text-primary-deep block leading-tight">
                        {r.name}
                      </span>
                      <span className="mt-1.5 block font-sans text-[13px] text-ink-mute leading-snug line-clamp-2">
                        {r.summary}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}

