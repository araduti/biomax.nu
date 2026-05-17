import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { EditorAnchorRail } from "@/components/admin/editor-anchor-rail";
import { AdminSummaryStrip } from "@/components/admin/admin-summary-strip";
import { AdminSection } from "@/components/admin/admin-section";
import {
  getMonographsMissingSources,
  getUnmatchedIngredients,
  getThinFaqProducts,
  getOrphanMonographs,
} from "@/lib/admin/content-backlog";

export const metadata = { title: "Innehåll" };
export const dynamic = "force-dynamic";

// Anchor-rail entries — same component the product editor uses, so the
// "AVSNITT"-rail feels identical between pages. IDs match the
// `<section id="…">` markers on each Card below.
const SECTIONS = [
  { id: "kallor-saknas", label: "Källor saknas" },
  { id: "ravaror", label: "Råvaror utan monografi" },
  { id: "tunn-faq", label: "Tunn FAQ" },
  { id: "oanvant", label: "Oanvända monografier" },
] as const;

export default async function AdminInnehallPage() {
  const [missingSources, unmatched, thinFaq, orphans] = await Promise.all([
    Promise.resolve(getMonographsMissingSources()),
    getUnmatchedIngredients(),
    getThinFaqProducts(),
    getOrphanMonographs(),
  ]);

  const totalBacklog =
    missingSources.length + unmatched.length + thinFaq.length + orphans.length;

  return (
    <>
      <AdminPageHeader
        eyebrow="Innehåll & SEO"
        title="Redaktionell backlog"
        subtitle="Allt som behöver redaktionellt arbete: monografier utan källor, råvaror utan monografi, produkter med tunn FAQ, och monografier utan produkter. Beräknat live från katalogen och kunskapsbanken."
        crumbs={[
          { label: "Innehåll & SEO", href: "/admin" },
          { label: "Innehåll" },
        ]}
      />

      <AdminSummaryStrip
        className="mb-10"
        stats={[
          {
            label: "Saknar källor",
            value: missingSources.length,
            accent: missingSources.length > 0 ? "warn" : "ok",
          },
          {
            label: "Råvaror utan monografi",
            value: unmatched.length,
            accent: unmatched.length > 0 ? "warn" : "ok",
          },
          {
            label: "Tunn FAQ",
            value: thinFaq.length,
            accent: thinFaq.length > 0 ? "warn" : "ok",
          },
          {
            label: "Oanvända monografier",
            value: orphans.length,
            accent: orphans.length > 0 ? "muted" : "ok",
          },
        ]}
      />

      {totalBacklog === 0 && (
        <div className="rounded-xl border border-accent/30 bg-accent/[0.06] px-6 py-5">
          <p className="font-sans text-[15px] font-semibold text-primary-deep mb-1">
            Allt rent — inga gap upptäckta.
          </p>
          <p className="font-sans text-[13.5px] text-ink-mute">
            Varje publicerad produkt har FAQ-data, varje råvara matchas mot en
            monografi, och varje monografi används av minst en produkt.
          </p>
        </div>
      )}

      {/* Sticky anchor-rail on the left + single-column section flow on
          the right. Same shape as the product editor — keeps editors in
          one mental model. A 2-col grid here previously stretched each
          row's right cell to match the left's height, creating big voids
          when one section was 19 items and its pair was empty. Stacking
          removes that; empty sections render as a single italic line
          (see Card) so they don't carry their own weight visually. */}
      <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr] gap-8 lg:gap-10 pb-24">
        <EditorAnchorRail sections={[...SECTIONS]} />
        <div className="flex flex-col gap-10 max-w-[920px]">
        <AdminSection
          id="kallor-saknas"
          eyebrow="Källor saknas"
          title="Monografier utan källor"
          count={missingSources.length}
          description={
            <>
              Per ADR 0011: monografier som har en bra brödtext men inga
              kuraterade vetenskapliga referenser. Lägg till 1–2 källor (PubMed,
              Cochrane, EFSA eller Livsmedelsverket per ADR 0012) i{" "}
              <code className="px-1 rounded bg-surface-warm font-mono text-[12px]">
                lib/knowledge/ingredients.ts
              </code>
              .
            </>
          }
          empty="Alla monografier har minst en källa."
        >
          <ul className="divide-y divide-border-soft -mx-1">
            {missingSources.map((m) => (
              <li
                key={m.slug}
                className="px-1 py-2 flex items-baseline justify-between gap-3"
              >
                <Link
                  href={`/kunskap/ingredienser/${m.slug}`}
                  target="_blank"
                  className="font-sans text-[13.5px] text-primary-deep hover:text-primary truncate"
                >
                  {m.name}
                </Link>
                <span className="font-sans text-[10.5px] uppercase tracking-[0.16em] font-semibold text-ink-soft whitespace-nowrap">
                  {m.category}
                </span>
              </li>
            ))}
          </ul>
        </AdminSection>

        <AdminSection
          id="ravaror"
          eyebrow="Råvaror"
          title="Utan monografi"
          count={unmatched.length}
          description={
            <>
              Råvarunamn som dyker upp i produkternas innehållsförteckningar
              men som inte matchar någon post i registret. Lägg till nya
              monografier eller utöka{" "}
              <code className="px-1 rounded bg-surface-warm font-mono text-[12px]">
                aliases
              </code>{" "}
              på en befintlig entry.
            </>
          }
          empty="Varje råvara matchas mot en registrerad monografi."
        >
          <ul className="divide-y divide-border-soft -mx-1">
            {unmatched.map((u) => (
              <li key={u.rowName} className="px-1 py-2.5">
                <p className="font-sans text-[13.5px] font-medium text-primary-deep truncate">
                  {u.rowName}
                </p>
                <p className="font-sans text-[12px] text-ink-mute mt-0.5 truncate">
                  i {u.products.length}{" "}
                  {u.products.length === 1 ? "produkt" : "produkter"}:{" "}
                  {u.products.slice(0, 3).map((p, i) => (
                    <span key={p.slug}>
                      <Link
                        href={`/admin/produkter/${p.slug}`}
                        className="hover:text-primary-deep transition-colors underline decoration-transparent hover:decoration-accent/40 underline-offset-[3px]"
                      >
                        {p.name}
                      </Link>
                      {i < Math.min(2, u.products.length - 1) ? ", " : ""}
                    </span>
                  ))}
                  {u.products.length > 3 ? `, +${u.products.length - 3}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </AdminSection>

        <AdminSection
          id="tunn-faq"
          eyebrow="FAQ"
          title="Produkter med tunn FAQ"
          count={thinFaq.length}
          description={
            <>
              FAQPage-strukturerad data emitter bara när minst två frågor kan
              byggas från fälten Dosering, Innehållsförteckning eller Observera.
              Produkterna nedan har färre — Googles rich result blir tyst.
            </>
          }
          empty="Alla produkter genererar minst 2 FAQ-frågor."
        >
          <ul className="divide-y divide-border-soft -mx-1">
            {thinFaq.map((p) => (
              <li key={p.slug} className="px-1 py-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <Link
                    href={`/admin/produkter/${p.slug}`}
                    className="font-sans text-[13.5px] font-semibold text-primary-deep hover:text-primary truncate"
                  >
                    {p.name}
                  </Link>
                  <span className="font-sans text-[11.5px] text-status-error tabular-nums whitespace-nowrap">
                    {p.faqCount}/2 frågor
                  </span>
                </div>
                <p className="font-sans text-[12px] text-ink-mute mt-0.5">
                  Saknar: {p.missing.join(", ")}
                </p>
              </li>
            ))}
          </ul>
        </AdminSection>

        <AdminSection
          id="oanvant"
          eyebrow="Oanvänt"
          title="Monografier utan produkter"
          count={orphans.length}
          description="Monografier i registret som inte refereras av någon publicerad produkt. Ibland är det medvetet (kommande produkter, historisk täckning); ibland indikerar det att en alias saknas."
          empty="Varje monografi används i minst en produkt."
        >
          <ul className="divide-y divide-border-soft -mx-1">
            {orphans.map((m) => (
              <li
                key={m.slug}
                className="px-1 py-2 flex items-baseline justify-between gap-3"
              >
                <Link
                  href={`/kunskap/ingredienser/${m.slug}`}
                  target="_blank"
                  className="font-sans text-[13.5px] text-primary-deep hover:text-primary truncate"
                >
                  {m.name}
                </Link>
                <span className="font-sans text-[10.5px] uppercase tracking-[0.16em] font-semibold text-ink-soft whitespace-nowrap">
                  {m.category}
                </span>
              </li>
            ))}
          </ul>
        </AdminSection>
        </div>
      </div>
    </>
  );
}
