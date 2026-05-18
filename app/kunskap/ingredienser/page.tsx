import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/site/top-bar";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Display, Eyebrow } from "@/components/ui/typography";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbLd, collectionPageLd, itemListLd } from "@/lib/jsonld";
import {
  getAllIngredients,
  type IngredientCategory,
  type IngredientMeta,
} from "@/lib/knowledge/ingredients";

export const metadata: Metadata = {
  title: "Ingredienser — kunskapsbank",
  description:
    "Vetenskaplig översikt över de vitaminer, mineraler, aminosyror och växtbaserade extrakt vi använder i våra produkter.",
  alternates: { canonical: "/kunskap/ingredienser" },
};

const CATEGORY_LABEL: Record<IngredientCategory, string> = {
  vitamin: "Vitaminer",
  mineral: "Mineraler",
  amino: "Aminosyror",
  botanical: "Växtbaserat",
  lipid: "Lipider",
  fiber: "Fibrer",
  other: "Övrigt",
};
const CATEGORY_ORDER: IngredientCategory[] = [
  "vitamin",
  "mineral",
  "amino",
  "botanical",
  "lipid",
  "fiber",
  "other",
];

export default function IngredientIndexPage() {
  const all = getAllIngredients();
  const grouped = new Map<IngredientCategory, IngredientMeta[]>();
  for (const ing of all) {
    if (!grouped.has(ing.category)) grouped.set(ing.category, []);
    grouped.get(ing.category)!.push(ing);
  }

  const crumbs = [
    { label: "Hem", href: "/" },
    { label: "Kunskap", href: "/kunskap" },
    { label: "Ingredienser", href: "/kunskap/ingredienser" },
  ];

  return (
    <>
      <TopBar />
      <Header />
      <JsonLd data={breadcrumbLd(crumbs)} />
      <JsonLd
        data={collectionPageLd({
          name: "Biomax kunskapsbank — Ingredienser",
          description:
            "Vetenskaplig översikt över de vitaminer, mineraler, aminosyror och växtbaserade extrakt vi använder i våra produkter.",
          url: "/kunskap/ingredienser",
        })}
      />
      <JsonLd
        data={itemListLd({
          name: "Biomax kunskapsbank — Ingredienser",
          url: "/kunskap/ingredienser",
          items: all.map((ing) => ({
            name: ing.name,
            href: `/kunskap/ingredienser/${ing.slug}`,
          })),
        })}
      />
      <main>
        <div className="max-w-[1100px] mx-auto px-6 md:px-8 pt-8 pb-4">
          <Breadcrumb crumbs={crumbs} />
        </div>

        <section className="max-w-[1100px] mx-auto px-6 md:px-8 pt-6 pb-16">
          <header className="mb-12 md:mb-14 max-w-[760px]">
            <Eyebrow>Kunskapsbank</Eyebrow>
            <Display as="h1" size="xl" className="mt-3">
              Ingredienser
            </Display>
            <p className="mt-5 font-display italic text-xl md:text-2xl text-ink-mute leading-snug">
              Vetenskaplig översikt över råvarorna i våra produkter — vad de är,
              var de kommer ifrån och vad forskningen säger.
            </p>
          </header>

          <div className="space-y-12 md:space-y-14">
            {CATEGORY_ORDER.filter((c) => grouped.has(c)).map((cat) => (
              <section key={cat}>
                <h2 className="font-display text-2xl md:text-[28px] font-medium tracking-tight text-primary-deep mb-5 md:mb-6 pb-3 border-b border-border-soft">
                  {CATEGORY_LABEL[cat]}
                </h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                  {grouped.get(cat)!.map((ing) => (
                    <li key={ing.slug}>
                      <Link
                        href={`/kunskap/ingredienser/${ing.slug}`}
                        className="block h-full bg-surface-alt border border-border rounded-2xl p-6 hover:border-accent hover:bg-surface transition-colors"
                      >
                        <h3 className="font-display text-xl font-medium tracking-tight text-primary-deep mb-2">
                          {ing.name}
                        </h3>
                        <p className="font-sans text-body text-ink-body leading-[1.6] line-clamp-3">
                          {ing.summary}
                        </p>
                        <span className="mt-3 inline-block font-sans text-micro text-accent-deep uppercase tracking-[0.2em] font-semibold">
                          Läs mer →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
