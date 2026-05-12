import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  getMonographsMissingSources,
  getUnmatchedIngredients,
  getThinFaqProducts,
  getOrphanMonographs,
} from "@/lib/admin/content-backlog";

export const metadata = { title: "Innehåll" };
export const dynamic = "force-dynamic";

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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <SummaryTile
          label="Saknar källor"
          value={missingSources.length}
          accent={missingSources.length > 0 ? "warn" : "ok"}
        />
        <SummaryTile
          label="Råvaror utan monografi"
          value={unmatched.length}
          accent={unmatched.length > 0 ? "warn" : "ok"}
        />
        <SummaryTile
          label="Tunn FAQ"
          value={thinFaq.length}
          accent={thinFaq.length > 0 ? "warn" : "ok"}
        />
        <SummaryTile
          label="Oanvända monografier"
          value={orphans.length}
          accent={orphans.length > 0 ? "muted" : "ok"}
        />
      </div>

      {totalBacklog === 0 && (
        <div className="rounded-2xl border border-accent/30 bg-accent/[0.06] px-6 py-5">
          <p className="font-display text-xl font-medium text-primary-deep mb-1">
            Allt rent — inga gap upptäckta.
          </p>
          <p className="font-sans text-[13.5px] text-ink-mute">
            Varje publicerad produkt har FAQ-data, varje råvara matchas mot en
            monografi, och varje monografi används av minst en produkt.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
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
        </Card>

        <Card
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
                <p className="font-display text-[14px] font-medium text-primary-deep truncate">
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
        </Card>

        <Card
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
                  <span className="font-sans text-[11.5px] text-[#B5523B] tabular-nums whitespace-nowrap">
                    {p.faqCount}/2 frågor
                  </span>
                </div>
                <p className="font-sans text-[12px] text-ink-mute mt-0.5">
                  Saknar: {p.missing.join(", ")}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <Card
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
        </Card>
      </div>
    </>
  );
}

// ── Primitives ─────────────────────────────────────────────────────

function SummaryTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "ok" | "warn" | "muted";
}) {
  const ring =
    accent === "ok"
      ? "border-accent"
      : accent === "warn"
        ? "border-[#C68A4F]"
        : "border-border";
  const valueColor =
    accent === "ok"
      ? "text-accent-deep"
      : accent === "warn"
        ? "text-[#7A4D2A]"
        : "text-primary-deep";
  return (
    <div className={`bg-surface-alt rounded-2xl p-4 border ${ring}`}>
      <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-ink-mute font-semibold">
        {label}
      </p>
      <p
        className={`mt-1.5 font-display text-2xl md:text-[28px] font-medium tracking-tight tabular-nums ${valueColor}`}
      >
        {value}
      </p>
    </div>
  );
}

function Card({
  eyebrow,
  title,
  count,
  description,
  empty,
  children,
}: {
  eyebrow: string;
  title: string;
  count: number;
  description: React.ReactNode;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-surface-alt border border-border rounded-2xl p-5 md:p-6 h-fit">
      <p className="font-sans text-[10.5px] uppercase tracking-[0.22em] font-semibold text-accent-deep mb-1">
        {eyebrow}
      </p>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h2 className="font-display text-xl font-medium tracking-tight text-primary-deep">
          {title}
        </h2>
        <span className="font-sans text-[12px] tabular-nums text-ink-mute">
          {count}
        </span>
      </div>
      <p className="font-sans text-[13px] text-ink-mute leading-relaxed mb-4">
        {description}
      </p>
      {count === 0 ? (
        <p className="font-sans text-[13.5px] text-accent-deep italic">{empty}</p>
      ) : (
        children
      )}
    </section>
  );
}
