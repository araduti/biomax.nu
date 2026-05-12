import Link from "next/link";
import { Display, Eyebrow, Accent } from "@/components/ui/typography";

/**
 * Phase 1 placeholder — three article teasers. The actual articles will be
 * authored in Phase 6 (six botanical monographs at launch). For now the cards
 * preview the planned editorial direction.
 */
const ARTICLES = [
  {
    href: "/kunskap/beta-glukan-immunmodulering",
    category: "Forskning",
    title: "Beta-glukan och immunmodulering — vad säger studierna?",
    readingTime: "8 min läsning",
  },
  {
    href: "/kunskap/xylitol-urinvagsinfektion",
    category: "Ingrediens",
    title: "Xylitol från björk: glykemiskt index, tandhälsa och tarmflora",
    readingTime: "6 min läsning",
  },
  {
    href: "/kunskap/adaptogener-stress-balans",
    category: "Guide",
    title: "Adaptogener vid stress — så väljer du rätt formulering",
    readingTime: "10 min läsning",
  },
];

export function KnowledgeTeaser() {
  return (
    <section className="bg-surface py-24 md:py-28 px-6 md:px-8">
      <div className="max-w-[1240px] mx-auto">
        <div className="flex flex-wrap justify-between items-end gap-6 mb-12">
          <div>
            <Eyebrow>Kunskap</Eyebrow>
            <Display size="xl" className="mt-3">
              Forskning, <Accent>förklarad</Accent>
            </Display>
          </div>
          <Link
            href="/kunskap"
            className="font-sans text-sm font-semibold text-primary border-b border-primary pb-0.5 hover:text-primary-deep hover:border-primary-deep transition-colors"
          >
            Alla artiklar →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {ARTICLES.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex flex-col group"
            >
              <div className="aspect-[16/10] rounded-2xl bg-gradient-to-br from-surface-warm to-surface border border-border mb-5 group-hover:border-primary/30 transition-colors" />
              <Eyebrow className="text-accent-deep">{a.category}</Eyebrow>
              <Display size="sm" className="mt-2.5">
                {a.title}
              </Display>
              <p className="font-sans text-[13px] text-ink-mute mt-3 tracking-wide">
                {a.readingTime}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
