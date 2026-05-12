import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/site/top-bar";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Display, Eyebrow } from "@/components/ui/typography";
import { getAllIngredients } from "@/lib/knowledge/ingredients";

export const metadata: Metadata = {
  title: "Kunskap — Biomax",
  description:
    "Vetenskaplig översikt över ingredienser, behandlingar och studier från Biomax — familjeföretaget som drivit svensk kosttillskottsforskning sedan 2001.",
  alternates: { canonical: "/kunskap" },
};

export default function KunskapPage() {
  const ingredientCount = getAllIngredients().length;

  const sections = [
    {
      slug: "ingredienser",
      eyebrow: "Råvarorna",
      title: "Ingredienser",
      blurb:
        "Vetenskaplig översikt över de vitaminer, mineraler, aminosyror och växtbaserade extrakt vi använder. Vad de är, var de kommer ifrån och vad forskningen säger.",
      cta: "Utforska bibliotek",
      meta: `${ingredientCount} monografier`,
      href: "/kunskap/ingredienser",
      live: true,
    },
    {
      slug: "monografier",
      eyebrow: "Botaniken",
      title: "Växtmonografier",
      blurb:
        "Djupdykningar i de medicinalväxter vi arbetar med — botanik, etnomedicinsk historia och den moderna forskningens nuläge.",
      cta: "Kommer snart",
      meta: "Phase 6",
      live: false,
    },
    {
      slug: "studier",
      eyebrow: "Forskningen",
      title: "Studier & rapporter",
      blurb:
        "Sammanfattningar av kliniska studier som ligger till grund för våra produkter, översatta till klarspråk utan att förlora nyansen.",
      cta: "Kommer snart",
      meta: "Phase 6",
      live: false,
    },
    {
      slug: "vagledning",
      eyebrow: "Vägledning",
      title: "Frågor & svar",
      blurb:
        "Stöd kring sömn, magfunktion, immunförsvar och vardagsbalans — formulerat tillsammans med våra terapeuter.",
      cta: "Kommer snart",
      meta: "Phase 6",
      live: false,
    },
  ];

  const crumbs = [
    { label: "Hem", href: "/" },
    { label: "Kunskap", href: "/kunskap" },
  ];

  return (
    <>
      <TopBar />
      <Header />
      <main>
        <div className="max-w-[1100px] mx-auto px-6 md:px-8 pt-8 pb-4">
          <Breadcrumb crumbs={crumbs} />
        </div>

        <section className="max-w-[1100px] mx-auto px-6 md:px-8 pt-6 pb-10">
          <header className="max-w-[760px] mb-14 md:mb-16">
            <Eyebrow>Kunskapsbank</Eyebrow>
            <Display as="h1" size="hero" className="mt-3">
              Vetenskap som
              <br />
              klarspråk.
            </Display>
            <p className="mt-6 font-display italic text-xl md:text-2xl text-ink-mute leading-snug max-w-[640px]">
              Familjen Raduti grundade Biomax 2001 — och har sedan dess satt
              forskningen först. Vi översätter den hellre än gömmer den bakom
              marknadsföring.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
            {sections.map((s) =>
              s.live ? (
                <Link
                  key={s.slug}
                  href={s.href!}
                  className="group block bg-surface-alt border border-border rounded-2xl p-7 md:p-8 hover:border-accent hover:bg-surface transition-colors"
                >
                  <SectionCard {...s} />
                </Link>
              ) : (
                <div
                  key={s.slug}
                  className="bg-surface-alt/60 border border-border-soft rounded-2xl p-7 md:p-8 opacity-75"
                >
                  <SectionCard {...s} />
                </div>
              )
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function SectionCard({
  eyebrow,
  title,
  blurb,
  cta,
  meta,
  live,
}: {
  eyebrow: string;
  title: string;
  blurb: string;
  cta: string;
  meta: string;
  live: boolean;
}) {
  return (
    <>
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <p className="font-sans text-[11px] uppercase tracking-[0.22em] font-semibold text-accent-deep">
          {eyebrow}
        </p>
        <p className="font-sans text-[11px] uppercase tracking-[0.18em] font-medium text-ink-soft">
          {meta}
        </p>
      </div>
      <h2 className="font-display text-3xl md:text-[34px] font-medium tracking-tight text-primary-deep mb-3 group-hover:text-accent-deep transition-colors">
        {title}
      </h2>
      <p className="font-sans text-[15.5px] text-ink-body leading-[1.65] max-w-[480px]">
        {blurb}
      </p>
      <p
        className={`mt-5 font-sans text-[12.5px] uppercase tracking-[0.2em] font-semibold ${
          live ? "text-accent-deep" : "text-ink-soft"
        }`}
      >
        {cta} {live && "→"}
      </p>
    </>
  );
}
