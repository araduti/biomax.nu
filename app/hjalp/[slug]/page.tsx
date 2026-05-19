import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { TopBar } from "@/components/site/top-bar";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Display, Eyebrow, Accent } from "@/components/ui/typography";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbLd, faqLd } from "@/lib/jsonld";
import { ProductCard } from "@/components/product/product-card";
import { hostTenantScope } from "@/lib/tenant/db";
import { publicProductWhere } from "@/lib/products/availability";
import {
  getRatingsByProductIds,
  getGoalReviewsForProducts,
} from "@/lib/reviews/queries";
import { getSymptom, getAllSymptoms } from "@/lib/symptoms/registry";
import { getIngredient } from "@/lib/knowledge/ingredients";
import { DEFAULT_SUBSCRIPTION_DISCOUNT_PERCENT } from "@/lib/subscriptions/constants";

const dateFmt = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const SITE = "https://www.biomax.nu";

// Multi-tenant (ADR 0032 D4): path-keyed route ISR would serve one
// tenant's HTML to another (route cache keyed by URL, not Host).
export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return getAllSymptoms().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const s = getSymptom(slug);
  if (!s) return {};
  return {
    title: s.seoTitle,
    description: s.seoDescription,
    alternates: { canonical: `/hjalp/${s.slug}` },
    openGraph: {
      title: s.seoTitle,
      description: s.seoDescription,
      url: `${SITE}/hjalp/${s.slug}`,
      type: "article",
    },
  };
}

export default async function SymptomLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sym = getSymptom(slug);
  if (!sym) notFound();

  // Resolve curated products in their declared order. If the curated list
  // is empty or matches turn up nothing, fall back to category-based pick
  // so the page always has at least a handful of products to point at.
  const curated =
    sym.productSlugs.length > 0
      ? await hostTenantScope((tx) =>
          tx.product.findMany({
            where: {
              ...publicProductWhere(),
              slug: { in: sym.productSlugs },
              price: { gt: 0 },
            },
            include: { categories: { select: { name: true }, take: 1 } },
          })
        )
      : [];
  const orderBySlug = new Map(sym.productSlugs.map((s, i) => [s, i]));
  curated.sort(
    (a, b) =>
      (orderBySlug.get(a.slug) ?? 999) - (orderBySlug.get(b.slug) ?? 999)
  );

  let products = curated;
  if (products.length === 0) {
    products = await hostTenantScope((tx) =>
      tx.product.findMany({
        where: {
          ...publicProductWhere(),
          price: { gt: 0 },
          categories: { some: { slug: sym.categorySlug } },
        },
        include: { categories: { select: { name: true }, take: 1 } },
        orderBy: { totalSales: "desc" },
        take: 3,
      })
    );
  }

  const ratings = await getRatingsByProductIds(products.map((p) => p.id));

  // Voices from customers who tagged this same goal on their review.
  // Empty array is fine — the block just doesn't render.
  const goalReviews = await getGoalReviewsForProducts(
    products.map((p) => p.id),
    sym.slug,
    4
  );

  // First curated product is the "primary" subscription hook — the page's
  // curated order is editorially chosen ("Balans first for Sömn"), so we
  // trust productSlugs[0] / products[0]. Falls back gracefully when the
  // page has no curated products (auto-pick fallback).
  const subscriptionProduct = products[0] ?? null;

  // Pull monograph stubs for cross-links. Missing slugs are dropped silently
  // — the page still works without every ingredient resolving.
  const ingredients = sym.ingredientSlugs
    .map((s) => getIngredient(s))
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  const crumbs = [
    { label: "Hem", href: "/" },
    { label: "Hjälp", href: "/hjalp" },
    { label: sym.shortTitle, href: `/hjalp/${sym.slug}` },
  ];

  return (
    <>
      <TopBar />
      <Header />
      <JsonLd data={breadcrumbLd(crumbs)} />
      {sym.faq.length >= 2 && <JsonLd data={faqLd(sym.faq)} />}

      <main>
        <div className="max-w-[1240px] mx-auto px-6 md:px-8 pt-8 pb-4">
          <Breadcrumb crumbs={crumbs} />
        </div>

        {/* Hero */}
        <section className="bg-surface-warm py-14 md:py-20 px-6 md:px-8">
          <div className="max-w-[820px] mx-auto">
            <Eyebrow className="mb-3">{sym.shortTitle}</Eyebrow>
            <Display as="h1" size="xl">
              {sym.title}
            </Display>
            <div className="mt-8 space-y-5 max-w-[640px]">
              {sym.intro.map((p, i) => (
                <p
                  key={i}
                  className="font-sans text-lead md:text-lead leading-relaxed text-ink-body"
                >
                  {p}
                </p>
              ))}
            </div>
          </div>
        </section>

        {/* Approach */}
        <section className="max-w-[820px] mx-auto px-6 md:px-8 py-14 md:py-20">
          <h2 className="font-display text-2xl md:text-3xl font-medium tracking-tight text-primary-deep mb-6">
            Traditionella <Accent>vägar</Accent>
          </h2>
          <div className="space-y-5">
            {sym.approach.map((p, i) => (
              <p
                key={i}
                className="font-sans text-body-lg md:text-lead leading-relaxed text-ink-body"
              >
                {p}
              </p>
            ))}
          </div>
        </section>

        {/* Products */}
        {products.length > 0 && (
          <section className="bg-surface-warm py-14 md:py-20 px-6 md:px-8">
            <div className="max-w-[1240px] mx-auto">
              <h2 className="font-display text-2xl md:text-3xl font-medium tracking-tight text-primary-deep mb-2">
                Produkter som ofta används
              </h2>
              <p className="font-sans text-body text-ink-mute mb-10 max-w-[640px] leading-relaxed">
                Ett urval ur sortimentet som ligger nära det här området.
                Det är inget medicinskt påstående — det är helt enkelt
                produkter som innehåller de ingredienser sidan beskriver.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 md:gap-x-12 gap-y-14">
                {products.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={{ ...p, rating: ratings.get(p.id) }}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Customer voices — same goal */}
        {goalReviews.length > 0 && (
          <section className="max-w-[1240px] mx-auto px-6 md:px-8 py-14 md:py-20">
            <div className="max-w-[820px] mb-10">
              <p className="font-sans text-micro uppercase tracking-[0.22em] font-semibold text-ink-soft mb-3">
                Andra med samma besvär
              </p>
              <h2 className="font-display text-2xl md:text-3xl font-medium tracking-tight text-primary-deep mb-3">
                Vad <Accent>kunder</Accent> berättar
              </h2>
              <p className="font-sans text-body text-ink-mute leading-relaxed max-w-[640px]">
                Recensioner från kunder som köpt produkterna för just{" "}
                {sym.shortTitle.toLowerCase()}. Vi visar bara godkända recensioner
                — och svarar inte själva på vad som har hjälpt vem.
              </p>
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
              {goalReviews.map((r) => (
                <li
                  key={r.id}
                  className="bg-surface-alt border border-border rounded-2xl p-6 md:p-7 flex flex-col"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      aria-label={`${r.rating} av 5 stjärnor`}
                      className="font-sans text-small font-semibold text-accent-deep tabular-nums"
                    >
                      {"★".repeat(r.rating)}
                      <span className="text-ink-soft">
                        {"★".repeat(5 - r.rating)}
                      </span>
                    </span>
                    {r.verified && (
                      <span className="font-sans text-micro uppercase tracking-[0.18em] font-semibold text-accent-deep">
                        ✓ Verifierat köp
                      </span>
                    )}
                  </div>
                  {r.title && (
                    <p className="font-display text-lead font-medium tracking-tight text-primary-deep mb-2">
                      {r.title}
                    </p>
                  )}
                  <p className="font-sans text-body-lg text-ink-body leading-relaxed line-clamp-6 mb-4">
                    {r.body}
                  </p>
                  <div className="mt-auto pt-4 border-t border-border-soft flex items-baseline justify-between gap-3 flex-wrap">
                    <p className="font-sans text-caption text-ink-mute">
                      {r.authorDisplay} · {dateFmt.format(r.createdAt)}
                    </p>
                    <Link
                      href={`/produkter/${r.productSlug}#recensioner`}
                      className="font-sans text-small font-semibold text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent"
                    >
                      {r.productName} →
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Subscription cross-sell — anchored to the page's primary product.
            Goal pages overwhelmingly serve recurring needs (sömn, oro,
            urinvägar, mage). Subscription is the highest-LTV outcome here
            and the PDP-only surface was missing the contextual moment. */}
        {subscriptionProduct && (
          <section className="bg-surface-warm py-14 md:py-20 px-6 md:px-8">
            <div className="max-w-[820px] mx-auto">
              <div className="bg-surface-alt border border-border rounded-2xl p-7 md:p-10">
                <p className="font-sans text-micro uppercase tracking-[0.22em] font-semibold text-accent-deep mb-3">
                  Återkommande besvär?
                </p>
                <h2 className="font-display text-2xl md:text-[28px] font-medium tracking-tight text-primary-deep mb-4">
                  Ha alltid {subscriptionProduct.name} hemma
                </h2>
                <p className="font-sans text-body-lg md:text-lead text-ink-body leading-relaxed mb-6 max-w-[620px]">
                  Med prenumeration får du{" "}
                  <strong className="font-semibold text-primary-deep">
                    {DEFAULT_SUBSCRIPTION_DISCOUNT_PERCENT} % rabatt
                  </strong>{" "}
                  på varje leverans, och du väljer själv hur ofta — varje
                  månad, varannan månad, var tredje. Pausa eller avsluta när
                  du vill, utan bindningstid.
                </p>
                <ul className="font-sans text-body text-ink-body leading-relaxed space-y-2 mb-7">
                  <li className="flex items-start gap-2.5">
                    <span aria-hidden className="text-accent-deep mt-0.5">
                      ✓
                    </span>{" "}
                    Slipp att det är slut precis när du behöver det
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span aria-hidden className="text-accent-deep mt-0.5">
                      ✓
                    </span>{" "}
                    {DEFAULT_SUBSCRIPTION_DISCOUNT_PERCENT} % alltid, även
                    utanför kampanj
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span aria-hidden className="text-accent-deep mt-0.5">
                      ✓
                    </span>{" "}
                    Pausa eller säg upp när du vill — inga bindningstider
                  </li>
                </ul>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/produkter/${subscriptionProduct.slug}#buy-panel`}
                    className="inline-flex items-center justify-center h-12 px-6 rounded-lg bg-primary-deep text-surface font-sans text-body-lg font-semibold hover:bg-primary transition-colors"
                  >
                    Starta prenumeration →
                  </Link>
                  <Link
                    href={`/produkter/${subscriptionProduct.slug}`}
                    className="inline-flex items-center justify-center h-12 px-6 rounded-lg border border-border bg-surface font-sans text-body-lg font-semibold text-primary-deep hover:bg-surface-warm transition-colors"
                  >
                    Läs om produkten
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Ingredient monographs */}
        {ingredients.length > 0 && (
          <section className="max-w-[820px] mx-auto px-6 md:px-8 py-14 md:py-20">
            <h2 className="font-display text-2xl md:text-3xl font-medium tracking-tight text-primary-deep mb-6">
              Läs vidare om <Accent>ingredienserna</Accent>
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ingredients.map((ing) => (
                <li key={ing.slug}>
                  <Link
                    href={`/kunskap/ingredienser/${ing.slug}`}
                    className="block bg-surface-alt border border-border rounded-xl p-5 hover:border-border-soft transition-colors group"
                  >
                    <p className="font-display text-lead font-medium text-primary-deep tracking-tight mb-1 group-hover:text-primary-deep/80">
                      {ing.name}
                    </p>
                    <p className="font-sans text-small text-ink-mute leading-relaxed line-clamp-3">
                      {ing.summary}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* FAQ */}
        {sym.faq.length > 0 && (
          <section className="bg-surface-warm py-14 md:py-20 px-6 md:px-8">
            <div className="max-w-[820px] mx-auto">
              <h2 className="font-display text-2xl md:text-3xl font-medium tracking-tight text-primary-deep mb-8">
                Vanliga frågor
              </h2>
              <ul className="space-y-7">
                {sym.faq.map((f, i) => (
                  <li
                    key={i}
                    className="pb-7 border-b border-border-soft last:border-b-0 last:pb-0"
                  >
                    <h3 className="font-display text-[18px] font-medium tracking-tight text-primary-deep mb-2">
                      {f.question}
                    </h3>
                    <p className="font-sans text-body-lg text-ink-body leading-relaxed">
                      {f.answer}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* CTA back to /hjalp */}
        <section className="max-w-[820px] mx-auto px-6 md:px-8 py-14 md:py-20 text-center">
          <p className="font-sans text-small uppercase tracking-[0.22em] font-semibold text-ink-soft mb-3">
            Andra områden
          </p>
          <Link
            href="/hjalp"
            className="font-display text-xl md:text-2xl text-primary-deep underline decoration-accent/40 underline-offset-[4px] hover:decoration-accent transition-colors"
          >
            Se alla orienteringar →
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
