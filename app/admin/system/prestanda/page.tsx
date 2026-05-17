import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";
import { AdminSummaryStrip } from "@/components/admin/admin-summary-strip";
import {
  getPerfSnapshot,
  formatValue,
  CORE_METRICS,
  type CoreMetric,
  type MetricSummary,
  type Verdict,
} from "@/lib/admin/web-vitals";

export const metadata = { title: "Prestanda" };
export const dynamic = "force-dynamic";
export const revalidate = 300; // 5 min — Web Vitals trickle in continuously

export default async function PrestandaPage() {
  const snapshot = await getPerfSnapshot(7);

  return (
    <>
      <AdminPageHeader
        eyebrow="System"
        title="Prestanda"
        subtitle="Core Web Vitals samlade direkt från användarnas webbläsare. Senaste 7 dagarna, percentiler beräknade live."
        crumbs={[
          { label: "System", href: "/admin" },
          { label: "Prestanda" },
        ]}
      />

      {snapshot.totalSamples === 0 ? (
        <AdminEmptyState
          intent="pending"
          title="Inga sampel än"
          body={
            <>
              Web Vitals samlas in automatiskt när användare besöker sajten —
              ingen extern tjänst behövs. Det första värdena dyker upp inom
              ett par minuter efter en sidvisning. Säkerställ att{" "}
              <code className="px-1 rounded bg-surface-warm font-mono text-[12px]">
                /api/web-vitals
              </code>{" "}
              är åtkomligt och inte blockerat av WAF eller robots.txt.
            </>
          }
        />
      ) : (
        <>
          <p className="font-sans text-[12.5px] uppercase tracking-[0.16em] font-semibold text-ink-soft mb-4">
            {snapshot.totalSamples.toLocaleString("sv-SE")} sampel · senaste{" "}
            {snapshot.windowDays} dagar
          </p>

          <AdminSummaryStrip
            className="mb-10"
            stats={CORE_METRICS.map((m) => {
              const summary = snapshot.siteWide.find((s) => s.metric === m);
              if (!summary) {
                return {
                  label: `${m} (p75)`,
                  value: "—",
                  subtle: "inga sampel",
                  accent: "muted" as const,
                };
              }
              return {
                label: `${m} (p75)`,
                value: formatValue(m, summary.p75),
                subtle: `p50 ${formatValue(m, summary.p50)} · p95 ${formatValue(m, summary.p95)}`,
                accent:
                  summary.verdict === "good"
                    ? ("ok" as const)
                    : summary.verdict === "ok"
                      ? ("warn" as const)
                      : ("error" as const),
              };
            })}
          />

          <h2 className="font-sans text-[18px] md:text-[22px] font-semibold tracking-tight text-primary-deep mb-2">
            Per route (p75)
          </h2>
          <p className="font-sans text-[13px] text-ink-mute leading-relaxed mb-5 max-w-[720px]">
            Routen-grupp samlas där det är meningsfullt — alla
            produktsidor visas som <code>/produkter/[slug]</code>, alla
            monografier som <code>/kunskap/ingredienser/[slug]</code>. P75 är
            vad Google använder för att betygsätta Core Web Vitals.
          </p>

          <div className="bg-surface-alt border border-border rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1fr_repeat(5,minmax(80px,1fr))_auto] gap-3 px-5 py-3 bg-surface-warm font-sans text-[10.5px] uppercase tracking-[0.16em] font-semibold text-ink-mute">
              <span>Route</span>
              {CORE_METRICS.map((m) => (
                <span key={m} className="text-right tabular-nums">
                  {m}
                </span>
              ))}
              <span className="text-right tabular-nums min-w-[44px]">N</span>
            </div>
            <ul>
              {snapshot.routes.map((r, i) => (
                <li
                  key={r.route}
                  className={
                    i > 0
                      ? "border-t border-border-soft grid grid-cols-[1fr_repeat(5,minmax(80px,1fr))_auto] gap-3 px-5 py-3 items-baseline"
                      : "grid grid-cols-[1fr_repeat(5,minmax(80px,1fr))_auto] gap-3 px-5 py-3 items-baseline"
                  }
                >
                  <span className="font-sans text-[13px] font-medium text-primary-deep truncate">
                    {r.route}
                  </span>
                  {CORE_METRICS.map((m) => {
                    const ms = r.metrics[m];
                    return (
                      <span
                        key={m}
                        className={`font-sans text-[12.5px] tabular-nums text-right ${
                          ms ? verdictColor(ms.verdict) : "text-ink-soft"
                        }`}
                      >
                        {ms ? formatValue(m, ms.p75) : "—"}
                      </span>
                    );
                  })}
                  <span className="font-sans text-[12px] tabular-nums text-ink-mute text-right min-w-[44px]">
                    {r.count}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </>
  );
}

function verdictColor(v: Verdict): string {
  if (v === "good") return "text-accent-deep";
  if (v === "ok") return "text-status-warn-text";
  return "text-status-error font-semibold";
}
