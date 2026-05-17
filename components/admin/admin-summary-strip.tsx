/**
 * Single bordered KPI strip with column dividers.
 *
 * Replaces the legacy pattern of N puffy bordered cards in a grid that
 * wasted vertical space and felt fragmented. Used as the top-of-page
 * summary on every admin overview surface.
 *
 * Status colour is carried by the *value* (not a border) — keeps the
 * row visually quiet for muted stats while still letting warn/error
 * read clearly when a number wants attention.
 *
 * If you need stat accents beyond the four below, extend `StatAccent`
 * here rather than adding ad-hoc colour overrides at call sites.
 */
export type AdminStatAccent = "ok" | "warn" | "error" | "muted";

export type AdminStat = {
  label: string;
  value: string | number;
  /** Optional second line under the value (e.g. "9 / 18 produkter"). */
  subtle?: string;
  accent?: AdminStatAccent;
};

const VALUE_COLOR: Record<AdminStatAccent, string> = {
  ok: "text-accent-deep",
  warn: "text-status-warn-text",
  error: "text-status-error",
  muted: "text-primary-deep",
};

export function AdminSummaryStrip({
  stats,
  className = "",
}: {
  stats: AdminStat[];
  /** Extra utility classes for the wrapping `<dl>`. */
  className?: string;
}) {
  // The column count adapts to the number of stats so 3-stat strips
  // don't get a wonky orphan cell on desktop. We cap at 5; beyond that
  // wrap to a second row at the next responsive breakpoint.
  const cols =
    stats.length === 5
      ? "md:grid-cols-5"
      : stats.length === 4
      ? "md:grid-cols-4"
      : stats.length === 3
      ? "md:grid-cols-3"
      : stats.length === 2
      ? "md:grid-cols-2"
      : "md:grid-cols-1";

  return (
    <dl
      // No outer border or background. KPI cells sit on the page canvas
      // separated only by thin dividers and a hairline below — Stripe's
      // top-of-page metric pattern. Borders around numbers turned every
      // overview page into nested-card density; this is the opposite.
      className={`grid grid-cols-2 ${cols} divide-y md:divide-y-0 md:divide-x divide-border-soft border-b border-border-soft pb-2 ${className}`}
    >
      {stats.map((s) => {
        const accent = s.accent ?? "muted";
        return (
          <div key={s.label} className="px-1 py-4 md:px-5">
            <dt className="font-sans text-[10.5px] uppercase tracking-[0.16em] text-ink-mute font-semibold">
              {s.label}
            </dt>
            <dd
              className={`mt-1.5 font-sans text-[22px] md:text-[24px] font-semibold tracking-tight tabular-nums leading-none ${VALUE_COLOR[accent]}`}
            >
              {s.value}
            </dd>
            {s.subtle && (
              <dd className="mt-1.5 font-sans text-[12px] text-ink-mute">
                {s.subtle}
              </dd>
            )}
          </div>
        );
      })}
    </dl>
  );
}
