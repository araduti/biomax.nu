import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";
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
          <p className="font-sans text-[12.5px] uppercase tracking-[0.18em] font-semibold text-ink-soft mb-4">
            {snapshot.totalSamples.toLocaleString("sv-SE")} sampel · senaste{" "}
            {snapshot.windowDays} dagar
          </p>

          {/* Site-wide tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-10">
            {CORE_METRICS.map((m) => {
              const summary = snapshot.siteWide.find((s) => s.metric === m);
              return (
                <SiteMetricTile key={m} metric={m} summary={summary} />
              );
            })}
          </div>

          <h2 className="font-display text-2xl md:text-[28px] font-medium tracking-tight text-primary-deep mb-2">
            Per route (p75)
          </h2>
          <p className="font-sans text-[13px] text-ink-mute leading-relaxed mb-5 max-w-[720px]">
            Routen-grupp samlas där det är meningsfullt — alla
            produktsidor visas som <code>/produkter/[slug]</code>, alla
            monografier som <code>/kunskap/ingredienser/[slug]</code>. P75 är
            vad Google använder för att betygsätta Core Web Vitals.
          </p>

          <div className="bg-surface-alt border border-border rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[1fr_repeat(5,minmax(80px,1fr))_auto] gap-3 px-5 py-3 bg-surface-warm font-sans text-[10.5px] uppercase tracking-[0.18em] font-semibold text-ink-mute">
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
  if (v === "ok") return "text-[#7A4D2A]";
  return "text-[#B5523B] font-semibold";
}

function SiteMetricTile({
  metric,
  summary,
}: {
  metric: CoreMetric;
  summary: MetricSummary | undefined;
}) {
  if (!summary) {
    return (
      <div className="rounded-2xl border border-border bg-surface-alt p-4">
        <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-ink-mute font-semibold">
          {metric}
        </p>
        <p className="mt-1.5 font-display text-2xl font-medium text-ink-soft tabular-nums">
          —
        </p>
        <p className="mt-1 font-sans text-[11px] text-ink-soft">inga sampel</p>
      </div>
    );
  }
  const ringClass =
    summary.verdict === "good"
      ? "border-accent"
      : summary.verdict === "ok"
        ? "border-[#C68A4F]"
        : "border-[#B5523B]";
  const valueColor =
    summary.verdict === "good"
      ? "text-accent-deep"
      : summary.verdict === "ok"
        ? "text-[#7A4D2A]"
        : "text-[#B5523B]";
  return (
    <div className={`rounded-2xl border bg-surface-alt p-4 ${ringClass}`}>
      <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-ink-mute font-semibold">
        {metric} (p75)
      </p>
      <p
        className={`mt-1.5 font-display text-2xl md:text-[26px] font-medium tracking-tight tabular-nums ${valueColor}`}
      >
        {formatValue(metric, summary.p75)}
      </p>
      <p className="mt-1 font-sans text-[11.5px] text-ink-mute tabular-nums">
        p50 {formatValue(metric, summary.p50)} · p95 {formatValue(metric, summary.p95)}
      </p>
    </div>
  );
}
