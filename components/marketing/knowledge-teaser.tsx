import Link from "next/link";
import { Display, Eyebrow, Accent } from "@/components/ui/typography";
import { getIngredient } from "@/lib/knowledge/ingredients";
import { Section } from "@/components/ui/section";

/**
 * "Forskning, förklarad" — three featured ingredient monographs on the
 * homepage. Curated by slug below; if a slug doesn't resolve we silently
 * skip it so a typo doesn't break the homepage.
 *
 * Slugs chosen across categories so the row reads as a sampler of the
 * knowledge base rather than three variants of the same theme.
 */
const FEATURED_SLUGS = [
  "koenzym-q10", // hjärt-kärl / energi — top bestseller
  "probiotika", // mage-tarm — broad relevance
  "alfa-liponsyra", // antioxidant / åldrande — deep + cited
] as const;

const CATEGORY_LABEL: Record<string, string> = {
  vitamin: "Vitamin",
  mineral: "Mineral",
  amino: "Aminosyra",
  botanical: "Växt",
  lipid: "Lipid",
  fiber: "Fiber",
  other: "Ingrediens",
};

/** Crude reading-time estimate: ~180 wpm Swedish prose. */
function readingTime(meta: ReturnType<typeof getIngredient>): string {
  if (!meta) return "";
  const words = [meta.summary, ...meta.body].join(" ").trim().split(/\s+/).length;
  const minutes = Math.max(2, Math.round(words / 180));
  return `${minutes} min läsning`;
}

export function KnowledgeTeaser() {
  const articles = FEATURED_SLUGS.map((slug) => {
    const meta = getIngredient(slug);
    if (!meta) return null;
    return {
      href: `/kunskap/ingredienser/${meta.slug}`,
      category: CATEGORY_LABEL[meta.category] ?? "Ingrediens",
      title: meta.name,
      summary: meta.summary,
      readingTime: readingTime(meta),
    };
  }).filter((a): a is NonNullable<typeof a> => a !== null);

  // If somehow nothing resolves (shouldn't happen — slugs are curated)
  // hide the entire section rather than render an empty grid.
  if (articles.length === 0) return null;

  return (
    <Section>
      <>
        <div className="flex flex-wrap justify-between items-end gap-6 mb-12">
          <div>
            <Eyebrow>Kunskap</Eyebrow>
            <Display size="xl" className="mt-3">
              Forskning, <Accent>förklarad</Accent>
            </Display>
          </div>
          <Link
            href="/kunskap/ingredienser"
            className="font-sans text-sm font-semibold text-primary border-b border-primary pb-0.5 hover:text-primary-deep hover:border-primary-deep transition-colors"
          >
            Alla ingredienser →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {articles.map((a) => (
            <Link key={a.href} href={a.href} className="flex flex-col group">
              <div className="aspect-[16/10] rounded-2xl bg-gradient-to-br from-surface-warm to-surface border border-border mb-5 group-hover:border-primary/30 transition-colors" />
              <Eyebrow className="text-accent-deep">{a.category}</Eyebrow>
              <Display size="sm" className="mt-2.5">
                {a.title}
              </Display>
              <p className="font-sans text-body text-ink-mute leading-relaxed mt-3 line-clamp-3">
                {a.summary}
              </p>
              <p className="font-sans text-caption text-ink-soft mt-3 tracking-wide">
                {a.readingTime}
              </p>
            </Link>
          ))}
        </div>
      </>
    </Section>
  );
}
