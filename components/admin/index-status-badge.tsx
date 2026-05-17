import Link from "next/link";
import { indexBadge } from "@/lib/integrations/gsc-index-coverage";

const TONE_CLASSES = {
  ok: "border-accent/40 bg-accent/[0.08] text-accent-deep",
  warn: "border-status-warn/40 bg-status-warn/[0.08] text-status-warn-text",
  error: "border-status-error/30 bg-status-error/[0.06] text-status-error",
  muted: "border-border bg-surface-warm text-ink-mute",
} as const;

const dateFmt = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

/**
 * Compact "Indexering" pill showing the latest URL Inspection verdict for a
 * page. Renders nothing when no check has been run yet (better than a noisy
 * "Ej kontrollerad" badge until the first cron pass).
 */
export function IndexStatusBadge({
  check,
  externalUrl,
}: {
  check: {
    verdict: string;
    coverageState: string | null;
    lastCrawlTime: Date | null;
    checkedAt: Date;
  } | null;
  externalUrl?: string;
}) {
  if (!check) return null;

  const badge = indexBadge(check.verdict);
  const inner = (
    <>
      <span aria-hidden className={`inline-block w-2 h-2 rounded-full ${
        badge.tone === "ok" ? "bg-accent-deep"
        : badge.tone === "warn" ? "bg-status-warn"
        : badge.tone === "error" ? "bg-status-error"
        : "bg-ink-soft"
      }`} />
      <span className="font-sans text-[12px] font-semibold">
        {badge.label}
      </span>
      {check.coverageState && (
        <span className="font-sans text-[11.5px] text-ink-mute">
          · {check.coverageState}
        </span>
      )}
      <span className="font-sans text-[11px] text-ink-soft tabular-nums whitespace-nowrap">
        {check.lastCrawlTime
          ? `senast crawl ${dateFmt.format(check.lastCrawlTime)}`
          : `kollat ${dateFmt.format(check.checkedAt)}`}
      </span>
    </>
  );

  const cls = `inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${TONE_CLASSES[badge.tone]}`;

  return externalUrl ? (
    <Link
      href={externalUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`${cls} hover:opacity-80 transition-opacity`}
    >
      {inner}
    </Link>
  ) : (
    <span className={cls}>{inner}</span>
  );
}
