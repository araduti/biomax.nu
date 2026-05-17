import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";
import {
  getLatestPerUrl,
  getWindowSummary,
  getRecentTicksPerUrl,
  type UrlStatus,
  type UptimeStatus,
  type RecentTick,
} from "@/lib/admin/uptime";

export const metadata = { title: "Drifttid" };
export const dynamic = "force-dynamic";
export const revalidate = 60; // pinger writes every 5 min; 1-min cache is generous

const STATUS_TONE: Record<
  UptimeStatus,
  { dot: string; label: string; text: string }
> = {
  up: { dot: "bg-accent-deep", label: "Online", text: "text-accent-deep" },
  degraded: {
    dot: "bg-status-warn",
    label: "Långsam",
    text: "text-status-warn-text",
  },
  down: { dot: "bg-status-error", label: "Nere", text: "text-status-error" },
};

const dateTimeFmt = new Intl.DateTimeFormat("sv-SE", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function DrifttidPage() {
  const [latest, window30d, recent] = await Promise.all([
    getLatestPerUrl(),
    getWindowSummary(30),
    getRecentTicksPerUrl(60),
  ]);

  return (
    <>
      <AdminPageHeader
        eyebrow="System"
        title="Drifttid"
        subtitle="Extern pinger kontrollerar sajten var 5:e minut från en separat host. Senaste status, 24-timmars-tidslinje och 30-dagars uptime."
        crumbs={[
          { label: "System", href: "/admin" },
          { label: "Drifttid" },
        ]}
      />

      {latest.length === 0 ? (
        <AdminEmptyState
          intent="setup"
          title="Inga uptime-probes än"
          body={
            <>
              Kör <code className="px-1 rounded bg-surface-warm font-mono text-[12px]">scripts/uptime-probe.ts</code>{" "}
              från en separat host som cron — gärna en liten VPS skild från
              produktion. Pingern skriver till samma databas; dashboarden läser
              direkt från <code className="px-1 rounded bg-surface-warm font-mono text-[12px]">UptimeProbe</code>.
              Sätt <code className="px-1 rounded bg-surface-warm font-mono text-[12px]">UPTIME_BASE_URL</code>{" "}
              och <code className="px-1 rounded bg-surface-warm font-mono text-[12px]">DATABASE_URL</code>;
              valfri <code className="px-1 rounded bg-surface-warm font-mono text-[12px]">UPTIME_ORIGIN</code>{" "}
              för regional spårning.
            </>
          }
        />
      ) : (
        <ul className="space-y-3">
          {latest.map((u) => {
            const win = window30d.get(u.url);
            const ticks = recent.get(u.url) ?? [];
            return (
              <UrlCard
                key={u.url}
                status={u}
                uptimePct={win?.uptimePct ?? 100}
                medianLatencyMs={win?.medianLatencyMs ?? 0}
                incidents={win?.incidents ?? 0}
                ticks={ticks}
              />
            );
          })}
        </ul>
      )}
    </>
  );
}

function UrlCard({
  status,
  uptimePct,
  medianLatencyMs,
  incidents,
  ticks,
}: {
  status: UrlStatus;
  uptimePct: number;
  medianLatencyMs: number;
  incidents: number;
  ticks: RecentTick[];
}) {
  const tone = STATUS_TONE[status.status];
  const path = (() => {
    try {
      return new URL(status.url).pathname;
    } catch {
      return status.url;
    }
  })();
  return (
    <li className="border-b border-border-soft py-6 first:pt-0 last:border-b-0">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-4">
        <span aria-hidden className={`inline-block w-2.5 h-2.5 rounded-full ${tone.dot}`} />
        <h2 className="font-sans text-[14.5px] md:text-[15.5px] font-semibold text-primary-deep">
          {path || "/"}
        </h2>
        <span className={`font-sans text-[12px] font-semibold uppercase tracking-[0.16em] ${tone.text}`}>
          {tone.label}
        </span>
        <span className="font-sans text-[11.5px] text-ink-soft ml-auto tabular-nums">
          senast {dateTimeFmt.format(status.checkedAt)}
        </span>
      </div>

      {/* Inline 3-stat row — flat (no inner borders) to avoid the
          box-in-box density. The outer URL card already provides the
          container; these are its content, not their own cards. */}
      <dl className="grid grid-cols-3 divide-x divide-border-soft mb-4">
        <Stat
          label="Uptime 30d"
          value={`${uptimePct.toFixed(2)} %`}
          tone={uptimePct >= 99.5 ? "ok" : uptimePct >= 98 ? "warn" : "error"}
        />
        <Stat
          label="Median latens"
          value={`${medianLatencyMs} ms`}
          tone={
            medianLatencyMs < 800
              ? "ok"
              : medianLatencyMs < 1500
                ? "warn"
                : "error"
          }
        />
        <Stat
          label="Incidenter 30d"
          value={incidents.toString()}
          tone={incidents === 0 ? "ok" : incidents <= 2 ? "warn" : "error"}
        />
      </dl>

      {/* 24h tick timeline */}
      <div>
        <p className="font-sans text-[10.5px] uppercase tracking-[0.16em] font-semibold text-ink-soft mb-1.5">
          Senaste 24h
        </p>
        {ticks.length === 0 ? (
          <p className="font-sans text-[12px] text-ink-mute italic">
            Ingen data — väntar på pinger.
          </p>
        ) : (
          <div className="flex gap-[2px] items-end h-5">
            {ticks.map((t, i) => {
              const tickTone =
                t.status === "up"
                  ? "bg-accent-deep"
                  : t.status === "degraded"
                    ? "bg-status-warn"
                    : "bg-status-error";
              return (
                <span
                  key={i}
                  className={`flex-1 h-full rounded-sm ${tickTone}`}
                  title={`${t.status} · ${t.latencyMs}ms · ${dateTimeFmt.format(t.checkedAt)}`}
                />
              );
            })}
          </div>
        )}
      </div>

      {status.error && (
        <p className="mt-3 font-sans text-[12.5px] text-status-error bg-status-error/[0.06] border border-status-error/20 rounded-md px-3 py-2">
          ⚠ {status.error}
          {status.httpStatus > 0 && ` (HTTP ${status.httpStatus})`}
        </p>
      )}
    </li>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "ok" | "warn" | "error";
}) {
  const valueColor =
    tone === "ok"
      ? "text-accent-deep"
      : tone === "warn"
        ? "text-status-warn-text"
        : "text-status-error";
  return (
    <div className="px-4 first:pl-0 last:pr-0 text-center">
      <dd
        className={`font-sans text-[18px] font-semibold tabular-nums ${valueColor}`}
      >
        {value}
      </dd>
      <dt className="mt-0.5 font-sans text-[10.5px] uppercase tracking-[0.16em] font-semibold text-ink-mute">
        {label}
      </dt>
    </div>
  );
}
