import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSummaryStrip } from "@/components/admin/admin-summary-strip";
import { AdminSection } from "@/components/admin/admin-section";
import {
  validateSchema,
  detectCannibalisation,
  getKeywordCoverage,
  getContentDepth,
} from "@/lib/admin/seo-analysis";
import {
  isGscConfigured,
  getSiteSummary,
  getTopQueries,
  getTopPages,
  fmtCtr,
  fmtPosition,
} from "@/lib/integrations/gsc";
import {
  getIndexCheckSummary,
  indexBadge,
} from "@/lib/integrations/gsc-index-coverage";
import {
  getPositionAlerts,
  ALERT_LABEL,
  type PositionAlert,
} from "@/lib/admin/position-alerts";
import {
  isLlmConfigured,
  getLatestCitations,
  getCitationSummary,
  type LlmCitationLatest,
} from "@/lib/integrations/llm-citation";
import { LLM_PROMPTS } from "@/lib/llm/prompts";
import { GscEmptyState } from "@/components/admin/gsc-empty-state";

export const metadata = { title: "SEO" };
export const dynamic = "force-dynamic";
export const revalidate = 1800; // GSC API rate limits + data freshness lag = 30 min cache is generous

type Tab = "trafik" | "ai" | "innehall";
const TABS: { id: Tab; label: string; description: string }[] = [
  {
    id: "trafik",
    label: "Trafik & rankning",
    description: "Klick, visningar, position och indexering — Search Console-data.",
  },
  {
    id: "ai",
    label: "AI-sök",
    description: "Citerar Claude/ChatGPT/Perplexity oss när folk frågar?",
  },
  {
    id: "innehall",
    label: "Innehållskvalitet",
    description: "Schema, kannibalisering, nyckelord och innehållsdjup.",
  },
];

export default async function AdminSeoPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: rawTab } = await searchParams;
  const tab: Tab =
    rawTab === "ai" || rawTab === "innehall" ? rawTab : "trafik";
  const activeTab = TABS.find((t) => t.id === tab)!;

  const gscOn = isGscConfigured();
  const [
    schemaReports,
    cannibals,
    coverage,
    depth,
    gscSummary,
    gscQueries,
    gscPages,
    indexSummary,
  ] = await Promise.all([
    validateSchema(),
    detectCannibalisation(),
    getKeywordCoverage(),
    getContentDepth(),
    gscOn ? getSiteSummary() : Promise.resolve(null),
    gscOn ? getTopQueries(20) : Promise.resolve([]),
    gscOn ? getTopPages(15) : Promise.resolve([]),
    getIndexCheckSummary(),
  ]);
  const positionAlerts = await getPositionAlerts(20);
  const llmOn = isLlmConfigured();
  const [llmLatest, llmSummary] = await Promise.all([
    getLatestCitations(),
    getCitationSummary(),
  ]);

  // Roll-ups for the hero summary line.
  const schemaErrors = schemaReports.filter((r) =>
    r.issues.some((i) => i.severity === "error")
  ).length;
  const schemaWarnings = schemaReports.filter((r) =>
    r.issues.some((i) => i.severity === "warning") &&
    !r.issues.some((i) => i.severity === "error")
  ).length;
  const schemaClean = schemaReports.length - schemaErrors - schemaWarnings;

  return (
    <>
      <AdminPageHeader
        eyebrow="Innehåll & SEO"
        title="SEO-överblick"
        subtitle={activeTab.description}
      />

      <div
        role="tablist"
        aria-label="SEO-vyer"
        className="flex flex-wrap gap-1 mb-8 border-b border-border"
      >
        {TABS.map((t) => {
          const isActive = t.id === activeTab.id;
          return (
            <Link
              key={t.id}
              href={`/admin/seo?tab=${t.id}`}
              role="tab"
              aria-selected={isActive}
              className={
                isActive
                  ? "px-4 py-2.5 -mb-px border-b-2 border-primary font-sans text-[13.5px] font-semibold text-primary-deep"
                  : "px-4 py-2.5 -mb-px border-b-2 border-transparent font-sans text-[13.5px] font-medium text-ink-mute hover:text-ink-body transition-colors"
              }
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {/* ── TAB: Trafik & rankning ────────────────────────────────── */}
      {tab === "trafik" && (
        <>
          {gscOn && gscSummary ? (
            <AdminSummaryStrip
              stats={[
                {
                  label: "Klick (28 d)",
                  value: gscSummary.clicks.toLocaleString("sv-SE"),
                  subtle: gscSummary.previous
                    ? deltaLabel(gscSummary.clicks, gscSummary.previous.clicks)
                    : undefined,
                  accent: "ok",
                },
                {
                  label: "Visningar (28 d)",
                  value: gscSummary.impressions.toLocaleString("sv-SE"),
                  subtle: gscSummary.previous
                    ? deltaLabel(gscSummary.impressions, gscSummary.previous.impressions)
                    : undefined,
                  accent: "ok",
                },
                { label: "Snitt-CTR", value: fmtCtr(gscSummary.ctr), accent: "muted" },
                {
                  label: "Snittposition",
                  value: fmtPosition(gscSummary.position),
                  subtle: "lägre = bättre",
                  accent: "muted",
                },
              ]}
            />
          ) : null}

          {/* 2-col grid with `items-start` so cards keep their natural
              heights (no row-height stretching when one pair is taller).
              On trafik tab the pairs balance well: Sökord with Toppsidor
              (both long), Rankning with Indexering (both short). */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-10 items-start mt-6">
            {gscOn ? (
              <>
                <GscQueriesCard rows={gscQueries} />
                <GscPagesCard rows={gscPages} />
                <PositionAlertsCard alerts={positionAlerts} gscOn={gscOn} />
                <IndexCoverageCard summary={indexSummary} gscOn={gscOn} />
              </>
            ) : (
              <GscEmptyState />
            )}
          </div>
        </>
      )}

      {/* ── TAB: AI-sök ─────────────────────────────────────────────── */}
      {tab === "ai" && (
        <div className="flex flex-col gap-10 max-w-[920px]">
          <LlmCitationCard
            latest={llmLatest}
            summary={llmSummary}
            llmOn={llmOn}
          />
        </div>
      )}

      {/* ── TAB: Innehållskvalitet ─────────────────────────────────── */}
      {tab === "innehall" && (
        <>
          <AdminSummaryStrip
            stats={[
              { label: "Schema OK", value: schemaClean.toString(), accent: "ok" },
              { label: "Schema-fel", value: schemaErrors.toString(), accent: schemaErrors > 0 ? "error" : "muted" },
              { label: "Kannibaliseringar", value: cannibals.length.toString(), accent: cannibals.length > 0 ? "warn" : "muted" },
              {
                label: "AI-nyckelord",
                value: coverage.totalKeywords.toString(),
                subtle: `${coverage.productsWithKeywords} / ${coverage.productsTotal} produkter`,
                accent: coverage.orphans.length > 0 ? "warn" : "ok",
              },
            ]}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-10 items-start">
            <SchemaCard reports={schemaReports} />
            <CannibalisationCard items={cannibals} />
            <KeywordCoverageCard coverage={coverage} />
            <ContentDepthCard rows={depth} />
          </div>
        </>
      )}
    </>
  );
}

function deltaLabel(curr: number, prev: number): string {
  if (prev === 0) return curr > 0 ? "ny period" : "ingen data";
  const delta = Math.round(((curr - prev) / prev) * 100);
  const sign = delta >= 0 ? "↑" : "↓";
  return `${sign} ${Math.abs(delta)} % vs föregående`;
}

function GscQueriesCard({
  rows,
}: {
  rows: Awaited<ReturnType<typeof getTopQueries>>;
}) {
  return (
    <AdminSection title="Sökord (28 dagar)" eyebrow="Google Search Console">
      <p className="font-sans text-[13px] text-ink-mute leading-relaxed mb-4">
        Faktiska söktermer som visat oss på Google. Här hittar du intent du
        kanske inte täcker än — lägg till som AI-nyckelord på relevant produkt.
      </p>
      {rows.length === 0 ? (
        <p className="font-sans text-[13.5px] text-ink-mute italic">
          Ingen data ännu — kan ta upp till 48 h efter anslutning.
        </p>
      ) : (
        <ul className="divide-y divide-border-soft -mx-1">
          {rows.map((r, i) => (
            <li key={i} className="px-1 py-2 grid grid-cols-[1fr_auto_auto_auto] items-baseline gap-3">
              <span className="font-sans text-[13.5px] text-ink-body truncate">
                {r.query ?? "—"}
              </span>
              <span className="font-sans text-[12px] tabular-nums text-ink-mute whitespace-nowrap min-w-[44px] text-right">
                {r.clicks} klick
              </span>
              <span className="font-sans text-[12px] tabular-nums text-ink-mute whitespace-nowrap min-w-[60px] text-right">
                {r.impressions.toLocaleString("sv-SE")} v
              </span>
              <span className="font-sans text-[12px] tabular-nums font-semibold text-primary-deep whitespace-nowrap min-w-[48px] text-right">
                pos {fmtPosition(r.position)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </AdminSection>
  );
}

function GscPagesCard({
  rows,
}: {
  rows: Awaited<ReturnType<typeof getTopPages>>;
}) {
  return (
    <AdminSection title="Toppsidor (28 dagar)" eyebrow="Google Search Console">
      <p className="font-sans text-[13px] text-ink-mute leading-relaxed mb-4">
        Sidor som drar mest organisk trafik. Sortera mentalt på &quot;hög
        impressions, låg CTR&quot; — det är där meta-titel/beskrivning kan
        lyfta klickfrekvensen.
      </p>
      {rows.length === 0 ? (
        <p className="font-sans text-[13.5px] text-ink-mute italic">
          Ingen data ännu — kan ta upp till 48 h efter anslutning.
        </p>
      ) : (
        <ul className="divide-y divide-border-soft -mx-1">
          {rows.map((r, i) => {
            // GSC returns full URLs; strip the host for display
            const path = r.page ? new URL(r.page).pathname : "—";
            return (
              <li key={i} className="px-1 py-2 grid grid-cols-[1fr_auto_auto_auto] items-baseline gap-3">
                <Link
                  href={path}
                  target="_blank"
                  className="font-sans text-[13px] text-ink-body hover:text-primary-deep truncate underline decoration-transparent hover:decoration-accent/40 underline-offset-[3px] transition-colors"
                >
                  {path}
                </Link>
                <span className="font-sans text-[12px] tabular-nums text-ink-mute whitespace-nowrap min-w-[44px] text-right">
                  {r.clicks} klick
                </span>
                <span className="font-sans text-[12px] tabular-nums text-ink-mute whitespace-nowrap min-w-[44px] text-right">
                  {fmtCtr(r.ctr)}
                </span>
                <span className="font-sans text-[12px] tabular-nums font-semibold text-primary-deep whitespace-nowrap min-w-[48px] text-right">
                  pos {fmtPosition(r.position)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </AdminSection>
  );
}

// ─── Cards ────────────────────────────────────────────────────────────

function SchemaCard({
  reports,
}: {
  reports: Awaited<ReturnType<typeof validateSchema>>;
}) {
  const issues = reports.filter((r) => r.issues.length > 0);
  return (
    <AdminSection title="Strukturerad data" eyebrow="schema.org-validering">
      <p className="font-sans text-[13px] text-ink-mute leading-relaxed mb-4">
        Strukturkontroll mot vad våra JSON-LD-renderare förväntar sig.
        Lättviktig — täcker fältnärvaro och uppenbara typfel, inte allt
        schema.org rekommenderar. Komplettera med{" "}
        <a
          href="https://validator.schema.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent transition-colors"
        >
          validator.schema.org
        </a>{" "}
        före lansering.
      </p>
      {issues.length === 0 ? (
        <p className="font-sans text-[14px] text-accent-deep italic">
          Inga problem — {reports.length} sidor passerade kontrollen.
        </p>
      ) : (
        <ul className="divide-y divide-border-soft -mx-1">
          {issues.slice(0, 12).map((r, i) => (
            <li key={i} className="px-1 py-3">
              <div className="flex items-baseline justify-between gap-3 mb-1.5">
                <Link
                  href={r.url}
                  target="_blank"
                  className="font-sans text-[13.5px] font-semibold text-primary-deep hover:text-primary truncate"
                >
                  {r.page}
                </Link>
                <span className="font-sans text-[10.5px] uppercase tracking-[0.16em] font-semibold text-ink-soft whitespace-nowrap">
                  {r.type}
                </span>
              </div>
              <ul className="space-y-1">
                {r.issues.map((it, j) => (
                  <li
                    key={j}
                    className={`flex gap-2 items-baseline font-sans text-[12.5px] ${
                      it.severity === "error" ? "text-status-error" : "text-status-warn-text"
                    }`}
                  >
                    <span aria-hidden className="flex-shrink-0">
                      {it.severity === "error" ? "●" : "○"}
                    </span>
                    <span>
                      <span className="font-semibold">{it.field}</span> · {it.message}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
      {issues.length > 12 && (
        <p className="mt-3 font-sans text-[12px] text-ink-mute italic">
          +{issues.length - 12} fler sidor med varningar — visa de viktigaste först.
        </p>
      )}
    </AdminSection>
  );
}

function CannibalisationCard({
  items,
}: {
  items: Awaited<ReturnType<typeof detectCannibalisation>>;
}) {
  return (
    <AdminSection title="Kannibalisering" eyebrow="Konkurrerande nyckelord">
      <p className="font-sans text-[13px] text-ink-mute leading-relaxed mb-4">
        Sidor som riktar sig mot samma nyckelord. Google rankar bara en —
        konsolidera, gör en kanonisk eller skifta inriktningen för dubbletter.
      </p>
      {items.length === 0 ? (
        <p className="font-sans text-[14px] text-accent-deep italic">
          Inga konflikter — alla fokusnyckelord är unika.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((c, i) => (
            <li
              key={i}
              className="rounded-xl border border-status-warn/30 bg-status-warn/[0.05] p-3"
            >
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <span className="font-sans text-[13.5px] font-semibold text-primary-deep">
                  &quot;{c.keyword}&quot;
                </span>
                <span className="font-sans text-[10.5px] uppercase tracking-[0.16em] font-semibold text-status-warn-text">
                  {c.source === "seoFocusKw" ? "Fokus" : "AI-kluster"} · {c.pages.length} sidor
                </span>
              </div>
              <ul className="space-y-0.5">
                {c.pages.map((p, j) => (
                  <li key={j}>
                    <Link
                      href={p.url}
                      target="_blank"
                      className="font-sans text-[13px] text-ink-body hover:text-primary-deep underline decoration-transparent hover:decoration-accent/40 underline-offset-[3px] transition-colors"
                    >
                      {p.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </AdminSection>
  );
}

function KeywordCoverageCard({
  coverage,
}: {
  coverage: Awaited<ReturnType<typeof getKeywordCoverage>>;
}) {
  return (
    <AdminSection title="Nyckelordstäckning" eyebrow="AI- & LLM-intent">
      <p className="font-sans text-[13px] text-ink-mute leading-relaxed mb-4">
        AI-nyckelord (intent-kluster) tilldelade per produkt. Hjälper oss att
        rankas i AI-sök och att se var täckningen är tunn.
      </p>

      {coverage.orphans.length > 0 && (
        <div className="mb-4 rounded-xl border border-status-error/25 bg-status-error/[0.04] px-3 py-2.5">
          <p className="font-sans text-[12.5px] font-semibold text-[#7A331E] mb-1">
            {coverage.orphans.length}{" "}
            {coverage.orphans.length === 1 ? "produkt utan" : "produkter utan"} nyckelord
          </p>
          <ul className="font-sans text-[12.5px] text-ink-body space-y-0.5">
            {coverage.orphans.slice(0, 6).map((p, i) => (
              <li key={i}>
                <Link
                  href={`/admin/produkter/${p.url.split("/").pop()}`}
                  className="hover:text-primary-deep transition-colors"
                >
                  · {p.name}
                </Link>
              </li>
            ))}
            {coverage.orphans.length > 6 && (
              <li className="italic text-ink-mute">+ {coverage.orphans.length - 6} till</li>
            )}
          </ul>
        </div>
      )}

      {coverage.topKeywords.length === 0 ? (
        <p className="font-sans text-[14px] text-ink-mute italic">
          Inga AI-nyckelord ifyllda än.
        </p>
      ) : (
        <ul className="space-y-2">
          {coverage.topKeywords.slice(0, 12).map((k, i) => (
            <li key={i} className="flex items-baseline justify-between gap-3">
              <span className="font-sans text-[13.5px] text-ink-body truncate">
                {k.keyword}
              </span>
              <span className="font-sans text-[12px] tabular-nums text-ink-mute whitespace-nowrap">
                {k.pages.length} {k.pages.length === 1 ? "produkt" : "produkter"}
              </span>
            </li>
          ))}
          {coverage.topKeywords.length > 12 && (
            <li className="font-sans text-[12px] italic text-ink-mute">
              +{coverage.topKeywords.length - 12} fler nyckelord
            </li>
          )}
        </ul>
      )}
    </AdminSection>
  );
}

function IndexCoverageCard({
  summary,
  gscOn,
}: {
  summary: Awaited<ReturnType<typeof getIndexCheckSummary>>;
  gscOn: boolean;
}) {
  if (summary.total === 0) {
    return (
      <AdminSection title="Indexering" eyebrow="Google URL Inspection">
        <p className="font-sans text-[13px] text-ink-mute leading-relaxed mb-3">
          Visar om Google har den faktiska sidan i sitt index. Kräver att GSC är
          anslutet och att veckokronan har körts minst en gång.
        </p>
        {gscOn ? (
          <p className="font-sans text-[13.5px] text-ink-mute italic">
            Ingen kontroll har körts än. Kör{" "}
            <code className="px-1 rounded bg-surface-warm font-mono text-[12px]">
              npx tsx scripts/inspect-gsc-index.ts
            </code>{" "}
            första gången, eller vänta tills schemalagd kron körs.
          </p>
        ) : (
          <p className="font-sans text-[13.5px] text-ink-mute italic">
            Anslut GSC först — se ADR 0014.
          </p>
        )}
      </AdminSection>
    );
  }

  return (
    <AdminSection title="Indexering" eyebrow="Google URL Inspection">
      <p className="font-sans text-[13px] text-ink-mute leading-relaxed mb-4">
        Är våra sidor faktiskt i Googles index? Veckokronan
        kontrollerar varje publicerad URL.
      </p>

      <div className="grid grid-cols-4 gap-2 mb-4">
        <MiniCount label="Indexerad" value={summary.pass} tone="ok" />
        <MiniCount label="Delvis" value={summary.partial} tone="warn" />
        <MiniCount label="Inte" value={summary.fail} tone="error" />
        <MiniCount label="Okänt" value={summary.neutral} tone="muted" />
      </div>

      {summary.problems.length === 0 ? (
        <p className="font-sans text-[13.5px] text-accent-deep italic">
          Alla {summary.total} kontrollerade sidor är indexerade — bra.
        </p>
      ) : (
        <>
          <p className="font-sans text-[10.5px] uppercase tracking-[0.2em] font-semibold text-ink-mute mb-2">
            {summary.problems.length}{" "}
            {summary.problems.length === 1 ? "sida att åtgärda" : "sidor att åtgärda"}
          </p>
          <ul className="divide-y divide-border-soft -mx-1">
            {summary.problems.slice(0, 12).map((p, i) => {
              const badge = indexBadge(p.verdict);
              const dot =
                badge.tone === "ok" ? "bg-accent-deep"
                : badge.tone === "warn" ? "bg-status-warn"
                : badge.tone === "error" ? "bg-status-error"
                : "bg-ink-soft";
              const path = (() => {
                try {
                  return new URL(p.url).pathname;
                } catch {
                  return p.url;
                }
              })();
              return (
                <li
                  key={i}
                  className="px-1 py-2 grid grid-cols-[auto_1fr_auto] items-center gap-3"
                >
                  <span aria-hidden className={`inline-block w-2 h-2 rounded-full ${dot}`} />
                  <Link
                    href={path}
                    target="_blank"
                    className="font-sans text-[13px] text-ink-body hover:text-primary-deep truncate underline decoration-transparent hover:decoration-accent/40 underline-offset-[3px] transition-colors"
                  >
                    {path}
                  </Link>
                  <span className="font-sans text-[11.5px] text-ink-mute whitespace-nowrap">
                    {p.coverageState ?? badge.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </AdminSection>
  );
}

function LlmCitationCard({
  latest,
  summary,
  llmOn,
}: {
  latest: LlmCitationLatest[];
  summary: Awaited<ReturnType<typeof getCitationSummary>>;
  llmOn: boolean;
}) {
  if (!llmOn && latest.length === 0) {
    return (
      <AdminSection title="AI-citeringar" eyebrow="LLM-spårning">
        <p className="font-sans text-[13px] text-ink-mute leading-relaxed mb-3">
          Provkör Claude / ChatGPT / valfri OpenAI-kompatibel modell mot
          kuraterade prompts (svenska sökintents) och se om svaret nämner
          biomax.nu. Kör veckovis via cron.
        </p>
        <p className="font-sans text-[13.5px] text-ink-mute italic mb-3">
          Inte konfigurerat. Sätt{" "}
          <code className="px-1 rounded bg-surface-warm font-mono text-[12px]">
            LLM_API_KEY
          </code>
          ,{" "}
          <code className="px-1 rounded bg-surface-warm font-mono text-[12px]">
            LLM_BASE_URL
          </code>{" "}
          och{" "}
          <code className="px-1 rounded bg-surface-warm font-mono text-[12px]">
            LLM_MODEL
          </code>{" "}
          i produktionsmiljön.
        </p>
        <p className="font-sans text-[12px] text-ink-soft italic">
          Se ADR 0015 för uppstart. Funkar mot Anthropic, OpenAI, Mistral,
          Together, Groq och självhostad Ollama / LiteLLM / vLLM.
        </p>
      </AdminSection>
    );
  }

  return (
    <AdminSection title="AI-citeringar" eyebrow="LLM-spårning">
      <p className="font-sans text-[13px] text-ink-mute leading-relaxed mb-4">
        Får vi nämnande i AI-svar (ChatGPT, Claude, Perplexity, Gemini)? Vecka
        för vecka mot {LLM_PROMPTS.length} kuraterade prompts.
      </p>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <MiniCount label="Total" value={summary.totalProbes} tone="muted" />
        <MiniCount label="Nämnd" value={summary.cited} tone="ok" />
        <MiniCount label="Länkad" value={summary.linked} tone="ok" />
      </div>

      {latest.length === 0 ? (
        <p className="font-sans text-[13.5px] text-ink-mute italic">
          Inga prober körda än. Kör{" "}
          <code className="px-1 rounded bg-surface-warm font-mono text-[12px]">
            npx tsx scripts/run-llm-citation-checks.ts
          </code>
          .
        </p>
      ) : (
        <ul className="divide-y divide-border-soft -mx-1">
          {latest.map((l, i) => {
            const dot = l.cited
              ? l.linked
                ? "bg-accent-deep"
                : "bg-status-warn"
              : "bg-status-error";
            const status = l.linked
              ? "Länkad"
              : l.cited
                ? "Nämnd"
                : "Ej nämnd";
            return (
              <li
                key={i}
                className="px-1 py-2.5 grid grid-cols-[auto_1fr_auto] items-baseline gap-3"
              >
                <span aria-hidden className={`inline-block w-2 h-2 rounded-full mt-1.5 ${dot}`} />
                <div className="min-w-0">
                  <p className="font-sans text-[13.5px] font-semibold text-primary-deep truncate">
                    {l.promptLabel}
                  </p>
                  <p className="font-sans text-[11.5px] text-ink-mute truncate">
                    {l.model} · {status}
                  </p>
                </div>
                <span className="font-sans text-[10.5px] uppercase tracking-[0.16em] font-semibold text-ink-soft whitespace-nowrap">
                  {l.topic}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {summary.partial && (
        <p className="mt-3 font-sans text-[12px] text-ink-mute italic">
          Vissa prompts har inte körts än —{" "}
          {LLM_PROMPTS.length - latest.length} av {LLM_PROMPTS.length} saknas.
        </p>
      )}
    </AdminSection>
  );
}

function PositionAlertsCard({
  alerts,
  gscOn,
}: {
  alerts: PositionAlert[];
  gscOn: boolean;
}) {
  return (
    <AdminSection title="Rankningsvarningar" eyebrow="Positions- & klicktapp">
      <p className="font-sans text-[13px] text-ink-mute leading-relaxed mb-4">
        Sökord som tappat position eller klick under senaste 7 dagarna jämfört
        med veckan dessförinnan. Beräknat från lokalt sparad GSC-historik —
        inga API-anrop behövs.
      </p>
      {alerts.length === 0 ? (
        <p className="font-sans text-[13.5px] text-ink-mute italic">
          {gscOn
            ? "Inga signifikanta tapp upptäckta — antingen mår allt bra, eller så har vi inte tillräckligt med snapshot-historik än."
            : "Anslut GSC och kör snapshot-kronan i ≥14 dagar — då börjar varningar dyka upp här."}
        </p>
      ) : (
        <ul className="divide-y divide-border-soft -mx-1">
          {alerts.map((a, i) => {
            const tone =
              a.kind === "page1-drop"
                ? "bg-status-error"
                : a.kind === "position-drop"
                  ? "bg-status-warn"
                  : "bg-status-warn-text";
            const path = (() => {
              try {
                return new URL(a.page).pathname;
              } catch {
                return a.page;
              }
            })();
            const detail =
              a.kind === "click-drop"
                ? `${a.previous.clicks.toFixed(0)} → ${a.current.clicks.toFixed(0)} klick`
                : `pos ${a.previous.position.toFixed(1)} → ${a.current.position.toFixed(1)}`;
            return (
              <li
                key={i}
                className="px-1 py-2.5 grid grid-cols-[auto_1fr_auto] items-baseline gap-3"
              >
                <span aria-hidden className={`inline-block w-2 h-2 rounded-full mt-1.5 ${tone}`} />
                <div className="min-w-0">
                  <Link
                    href={path}
                    target="_blank"
                    className="font-sans text-[13.5px] font-semibold text-primary-deep hover:text-primary truncate inline-block max-w-full"
                  >
                    {a.query}
                  </Link>
                  <p className="font-sans text-[11.5px] text-ink-mute truncate">
                    {ALERT_LABEL[a.kind]} · {path}
                  </p>
                </div>
                <span className="font-sans text-[12px] tabular-nums font-semibold text-ink-body whitespace-nowrap">
                  {detail}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </AdminSection>
  );
}

function MiniCount({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "ok" | "warn" | "error" | "muted";
}) {
  const valueColor =
    tone === "ok"
      ? "text-accent-deep"
      : tone === "warn"
        ? "text-status-warn-text"
        : tone === "error"
          ? "text-status-error"
          : "text-ink-mute";
  return (
    <div className="bg-surface rounded-lg border border-border-soft p-2 text-center">
      <p className={`font-sans text-[16px] font-semibold tabular-nums ${valueColor}`}>
        {value}
      </p>
      <p className="font-sans text-[10.5px] uppercase tracking-[0.16em] font-semibold text-ink-mute mt-0.5">
        {label}
      </p>
    </div>
  );
}

function ContentDepthCard({
  rows,
}: {
  rows: Awaited<ReturnType<typeof getContentDepth>>;
}) {
  return (
    <AdminSection title="Innehållsdjup" eyebrow="Per produktsida">
      <p className="font-sans text-[13px] text-ink-mute leading-relaxed mb-4">
        Sammansatt poäng från ord, rubriker, bilder, ingredienstabell och FAQ.
        Svagaste sidor först — det här är arbetslistan.
      </p>
      {rows.length === 0 ? (
        <p className="font-sans text-[14px] text-ink-mute italic">
          Inga publicerade produkter.
        </p>
      ) : (
        <ul className="divide-y divide-border-soft -mx-1">
          {rows.slice(0, 12).map((r, i) => (
            <li key={i} className="px-1 py-2.5 flex items-baseline gap-3">
              <span
                className={`inline-block w-12 text-right font-sans text-[13.5px] font-semibold tabular-nums ${
                  r.score < 50
                    ? "text-status-error"
                    : r.score < 75
                      ? "text-status-warn-text"
                      : "text-accent-deep"
                }`}
              >
                {r.score}
              </span>
              <Link
                href={r.url}
                target="_blank"
                className="flex-1 min-w-0 font-sans text-[13.5px] text-ink-body hover:text-primary-deep truncate"
              >
                {r.name}
              </Link>
              <span className="font-sans text-[11.5px] text-ink-mute whitespace-nowrap tabular-nums">
                {r.wordCount}o · {r.headingCount}h · {r.imageCount}b
                {r.hasFaq && " · FAQ"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </AdminSection>
  );
}
