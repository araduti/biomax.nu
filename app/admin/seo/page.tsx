import Link from "next/link";
import { Eyebrow } from "@/components/ui/typography";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              <SummaryTile
                label="Klick (28 d)"
                value={gscSummary.clicks.toLocaleString("sv-SE")}
                subtle={
                  gscSummary.previous
                    ? deltaLabel(gscSummary.clicks, gscSummary.previous.clicks)
                    : undefined
                }
                accent="ok"
              />
              <SummaryTile
                label="Visningar (28 d)"
                value={gscSummary.impressions.toLocaleString("sv-SE")}
                subtle={
                  gscSummary.previous
                    ? deltaLabel(gscSummary.impressions, gscSummary.previous.impressions)
                    : undefined
                }
                accent="ok"
              />
              <SummaryTile label="Snitt-CTR" value={fmtCtr(gscSummary.ctr)} accent="muted" />
              <SummaryTile
                label="Snittposition"
                value={fmtPosition(gscSummary.position)}
                subtle="lägre = bättre"
                accent="muted"
              />
            </div>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <SummaryTile label="Schema OK" value={schemaClean.toString()} accent="ok" />
            <SummaryTile label="Schema-fel" value={schemaErrors.toString()} accent={schemaErrors > 0 ? "error" : "muted"} />
            <SummaryTile label="Kannibaliseringar" value={cannibals.length.toString()} accent={cannibals.length > 0 ? "warn" : "muted"} />
            <SummaryTile
              label="AI-nyckelord"
              value={coverage.totalKeywords.toString()}
              subtle={`${coverage.productsWithKeywords} / ${coverage.productsTotal} produkter`}
              accent={coverage.orphans.length > 0 ? "warn" : "ok"}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
    <Card title="Sökord (28 dagar)" eyebrow="Google Search Console">
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
    </Card>
  );
}

function GscPagesCard({
  rows,
}: {
  rows: Awaited<ReturnType<typeof getTopPages>>;
}) {
  return (
    <Card title="Toppsidor (28 dagar)" eyebrow="Google Search Console">
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
    </Card>
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
    <Card title="Strukturerad data" eyebrow="schema.org-validering">
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
                <span className="font-sans text-[10.5px] uppercase tracking-[0.18em] font-semibold text-ink-soft whitespace-nowrap">
                  {r.type}
                </span>
              </div>
              <ul className="space-y-1">
                {r.issues.map((it, j) => (
                  <li
                    key={j}
                    className={`flex gap-2 items-baseline font-sans text-[12.5px] ${
                      it.severity === "error" ? "text-[#B5523B]" : "text-[#7A4D2A]"
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
    </Card>
  );
}

function CannibalisationCard({
  items,
}: {
  items: Awaited<ReturnType<typeof detectCannibalisation>>;
}) {
  return (
    <Card title="Kannibalisering" eyebrow="Konkurrerande nyckelord">
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
              className="rounded-xl border border-[#C68A4F]/30 bg-[#C68A4F]/[0.05] p-3"
            >
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <span className="font-display text-[15px] font-medium text-primary-deep">
                  &quot;{c.keyword}&quot;
                </span>
                <span className="font-sans text-[10.5px] uppercase tracking-[0.18em] font-semibold text-[#7A4D2A]">
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
    </Card>
  );
}

function KeywordCoverageCard({
  coverage,
}: {
  coverage: Awaited<ReturnType<typeof getKeywordCoverage>>;
}) {
  return (
    <Card title="Nyckelordstäckning" eyebrow="AI- & LLM-intent">
      <p className="font-sans text-[13px] text-ink-mute leading-relaxed mb-4">
        AI-nyckelord (intent-kluster) tilldelade per produkt. Hjälper oss att
        rankas i AI-sök och att se var täckningen är tunn.
      </p>

      {coverage.orphans.length > 0 && (
        <div className="mb-4 rounded-xl border border-[#B5523B]/25 bg-[#B5523B]/[0.04] px-3 py-2.5">
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
    </Card>
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
      <Card title="Indexering" eyebrow="Google URL Inspection">
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
      </Card>
    );
  }

  return (
    <Card title="Indexering" eyebrow="Google URL Inspection">
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
                : badge.tone === "warn" ? "bg-[#C68A4F]"
                : badge.tone === "error" ? "bg-[#B5523B]"
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
    </Card>
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
      <Card title="AI-citeringar" eyebrow="LLM-spårning">
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
      </Card>
    );
  }

  return (
    <Card title="AI-citeringar" eyebrow="LLM-spårning">
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
                : "bg-[#C68A4F]"
              : "bg-[#B5523B]";
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
    </Card>
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
    <Card title="Rankningsvarningar" eyebrow="Positions- & klicktapp">
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
                ? "bg-[#B5523B]"
                : a.kind === "position-drop"
                  ? "bg-[#C68A4F]"
                  : "bg-[#7A4D2A]";
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
    </Card>
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
        ? "text-[#7A4D2A]"
        : tone === "error"
          ? "text-[#B5523B]"
          : "text-ink-mute";
  return (
    <div className="bg-surface rounded-lg border border-border-soft p-2 text-center">
      <p className={`font-display text-[20px] font-medium tabular-nums ${valueColor}`}>
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
    <Card title="Innehållsdjup" eyebrow="Per produktsida">
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
                className={`inline-block w-12 text-right font-display text-[15px] font-medium tabular-nums ${
                  r.score < 50
                    ? "text-[#B5523B]"
                    : r.score < 75
                      ? "text-[#7A4D2A]"
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
    </Card>
  );
}

// ─── Tile primitives ──────────────────────────────────────────────────

function SummaryTile({
  label,
  value,
  subtle,
  accent,
}: {
  label: string;
  value: string;
  subtle?: string;
  accent: "ok" | "warn" | "error" | "muted";
}) {
  const palette: Record<typeof accent, string> = {
    ok: "border-accent",
    warn: "border-[#C68A4F]",
    error: "border-[#B5523B]",
    muted: "border-border",
  };
  const valueColor: Record<typeof accent, string> = {
    ok: "text-accent-deep",
    warn: "text-[#7A4D2A]",
    error: "text-[#B5523B]",
    muted: "text-primary-deep",
  };
  return (
    <div className={`bg-surface-alt rounded-2xl p-4 border ${palette[accent]}`}>
      <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-ink-mute font-semibold">
        {label}
      </p>
      <p className={`mt-1 font-display text-2xl md:text-[28px] font-medium tracking-tight ${valueColor[accent]}`}>
        {value}
      </p>
      {subtle && (
        <p className="mt-0.5 font-sans text-[11.5px] text-ink-mute">{subtle}</p>
      )}
    </div>
  );
}

function Card({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-surface-alt border border-border rounded-2xl p-5 md:p-6 h-fit">
      <p className="font-sans text-[10.5px] uppercase tracking-[0.22em] font-semibold text-accent-deep mb-1">
        {eyebrow}
      </p>
      <h2 className="font-display text-xl font-medium tracking-tight text-primary-deep mb-4">
        {title}
      </h2>
      {children}
    </section>
  );
}
