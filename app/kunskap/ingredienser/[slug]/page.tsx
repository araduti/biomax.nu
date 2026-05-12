import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/site/top-bar";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Display, Eyebrow } from "@/components/ui/typography";
import {
  getIngredient,
  getAllIngredients,
  getRelated,
  type IngredientCategory,
  type ReferenceKind,
} from "@/lib/knowledge/ingredients";
import { prisma } from "@/lib/prisma";
import { publicProductWhere } from "@/lib/products/availability";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbLd, definedTermLd } from "@/lib/jsonld";

type RouteParams = Promise<{ slug: string }>;

const CATEGORY_LABEL: Record<IngredientCategory, string> = {
  vitamin: "Vitamin",
  mineral: "Mineral",
  amino: "Aminosyra",
  botanical: "Växtbaserad",
  lipid: "Lipid",
  fiber: "Fiber",
  other: "Övrigt",
};

export async function generateStaticParams() {
  return getAllIngredients().map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: RouteParams;
}): Promise<Metadata> {
  const { slug } = await params;
  const ing = getIngredient(slug);
  if (!ing) return { title: "Ingrediens hittades inte" };
  return {
    title: `${ing.name} — Biomax kunskapsbank`,
    description: ing.summary,
    alternates: { canonical: `/kunskap/ingredienser/${ing.slug}` },
  };
}

export default async function IngredientPage({
  params,
}: {
  params: RouteParams;
}) {
  const { slug } = await params;
  const ing = getIngredient(slug);
  if (!ing) notFound();

  // Find products that mention this ingredient (or its aliases) in their list.
  // Cheap server-side filter — the row name was already used to slug-match
  // upstream so we replicate that logic with a JSONB containment query.
  const allProducts = await prisma.product.findMany({
    where: publicProductWhere(),
    select: { slug: true, name: true, ingredientList: true, imageUrl: true },
  });
  const matchTerms = [ing.name.toLowerCase(), ...(ing.aliases ?? []).map((a) => a.toLowerCase())];
  const products = allProducts.filter((p) => {
    const list = p.ingredientList as { rows?: { name: string }[] } | null;
    if (!list?.rows) return false;
    return list.rows.some((r) => {
      const n = r.name.toLowerCase();
      return matchTerms.some((m) => n.includes(m));
    });
  });

  const crumbs = [
    { label: "Hem", href: "/" },
    { label: "Kunskap", href: "/kunskap" },
    { label: "Ingredienser", href: "/kunskap/ingredienser" },
    { label: ing.name, href: `/kunskap/ingredienser/${ing.slug}` },
  ];

  return (
    <>
      <TopBar />
      <Header />
      <JsonLd data={breadcrumbLd(crumbs)} />
      <JsonLd
        data={definedTermLd({
          name: ing.name,
          slug: ing.slug,
          description: ing.summary,
          url: `/kunskap/ingredienser/${ing.slug}`,
          alternateNames: ing.aliases,
          references: ing.references,
        })}
      />
      <main>
        <div className="max-w-[920px] mx-auto px-6 md:px-8 pt-8 pb-4">
          <Breadcrumb crumbs={crumbs} />
        </div>

        <article className="max-w-[760px] mx-auto px-6 md:px-8 pt-6 pb-20">
          <header className="mb-10 md:mb-12">
            <Eyebrow>{CATEGORY_LABEL[ing.category]}</Eyebrow>
            <Display as="h1" size="xl" className="mt-3">
              {ing.name}
            </Display>
            <p className="mt-5 font-display italic text-xl md:text-2xl text-ink-mute leading-snug max-w-[640px]">
              {ing.summary}
            </p>
          </header>

          <div className="prose-biomax font-sans text-[16.5px] md:text-[17px] leading-[1.75] text-ink-body space-y-5">
            {ing.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {ing.benefits && ing.benefits.length > 0 && (
            <section className="mt-12 md:mt-14 border-t border-border-soft pt-8">
              <h2 className="font-display text-2xl md:text-[26px] font-medium tracking-tight text-primary-deep mb-4">
                Vad används det för?
              </h2>
              <ul className="space-y-2">
                {ing.benefits.map((b, i) => (
                  <li key={i} className="flex gap-3 items-baseline font-sans text-[15.5px] text-ink-body">
                    <span aria-hidden className="text-accent-deep flex-shrink-0">
                      ▸
                    </span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {products.length > 0 && (
            <section className="mt-12 md:mt-14 border-t border-border-soft pt-8">
              <div className="flex items-baseline justify-between gap-6 mb-5">
                <div>
                  <Eyebrow>Finns i</Eyebrow>
                  <h2 className="mt-2 font-display text-2xl md:text-[26px] font-medium tracking-tight text-primary-deep">
                    Produkter med {ing.name}
                  </h2>
                </div>
                <Link
                  href={`/kop/${ing.slug}`}
                  className="hidden sm:inline-flex items-center gap-1.5 font-sans text-[13px] font-semibold text-accent-deep hover:text-primary-deep transition-colors whitespace-nowrap"
                >
                  Köp {ing.name} <span aria-hidden>→</span>
                </Link>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {products.map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={`/produkter/${p.slug}`}
                      className="block bg-surface-alt border border-border rounded-xl px-5 py-4 hover:border-accent transition-colors"
                    >
                      <span className="font-display text-lg font-medium text-primary-deep block">
                        {p.name}
                      </span>
                      <span className="mt-1 font-sans text-[12.5px] text-accent-deep uppercase tracking-[0.18em] font-semibold">
                        Visa produkt →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {ing.references && ing.references.length > 0 && (
            <section className="mt-12 md:mt-14 border-t border-border-soft pt-8">
              <Eyebrow>Källor</Eyebrow>
              <h2 className="mt-2 font-display text-2xl md:text-[26px] font-medium tracking-tight text-primary-deep mb-5">
                Vetenskapliga referenser
              </h2>
              <ol className="space-y-3 list-none">
                {ing.references.map((r, i) => (
                  <li
                    key={i}
                    className="flex gap-4 items-baseline font-sans text-[14.5px] text-ink-body leading-[1.6]"
                  >
                    <ReferenceBadge kind={r.kind} />
                    <span className="flex-1 min-w-0">
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-deep underline decoration-accent/40 decoration-from-font underline-offset-[3px] hover:decoration-accent transition-colors"
                      >
                        {r.title}
                      </a>
                      {r.cite && (
                        <span className="block mt-0.5 font-sans text-[13px] text-ink-mute italic">
                          {r.cite}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {(() => {
            const related = getRelated(ing, 3);
            if (related.length === 0) return null;
            return (
              <section className="mt-12 md:mt-14 border-t border-border-soft pt-8">
                <Eyebrow>Relaterade ämnen</Eyebrow>
                <h2 className="mt-2 font-display text-2xl md:text-[26px] font-medium tracking-tight text-primary-deep mb-5">
                  Läs vidare
                </h2>
                <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            );
          })()}

          <p className="mt-14 font-sans text-[12.5px] text-ink-soft italic max-w-[560px]">
            Innehållet är allmän information och inte avsett att ersätta medicinsk
            rådgivning. Rådgör alltid med läkare vid medicinering eller sjukdom.
          </p>
        </article>
      </main>
      <Footer />
    </>
  );
}

const KIND_LABEL: Record<ReferenceKind, string> = {
  pubmed: "Studie",
  review: "Översikt",
  book: "Bok",
  web: "Webb",
};

function ReferenceBadge({ kind }: { kind: ReferenceKind }) {
  return (
    <span className="inline-flex items-center justify-center min-w-[68px] flex-shrink-0 rounded-full border border-accent/30 bg-accent/10 text-accent-deep font-sans text-[10.5px] uppercase tracking-[0.16em] font-semibold px-2.5 py-1">
      {KIND_LABEL[kind]}
    </span>
  );
}
