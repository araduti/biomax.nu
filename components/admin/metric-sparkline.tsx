/**
 * Generic time-series sparkline for admin metric strips.
 *
 * Sibling to the GSC-specific `<Sparkline>` (which expects
 * HistoryPoint[]). This one takes a raw `number[]` so any metric can
 * sketch its recent trend — revenue, order count, points balance, etc.
 *
 * Stripe-style sentiment encoding: line + soft fill, colour derives
 * from the last vs first value (sage when rising, rust when falling,
 * ink-mute when flat) — no extra prop needed at most call sites.
 */
export type MetricSparklineProps = {
  /** Series — minimum 2 points for a visible line. */
  data: number[];
  width?: number;
  height?: number;
  /** Override trend colour. Otherwise derived from start vs end value.
   *  `accent` = the Direction D terracotta chart line (rule iv — one
   *  accent line per chart). */
  tone?: "ok" | "warn" | "error" | "muted" | "accent";
  /** Fills the area under the line at low opacity (Stripe pattern). */
  fill?: boolean;
};

const TONE_COLOR: Record<NonNullable<MetricSparklineProps["tone"]>, string> = {
  ok: "var(--color-status-ok)",
  warn: "var(--color-status-warn-text)",
  error: "var(--color-status-error)",
  muted: "var(--color-ink-soft)",
  accent: "var(--d-accent, var(--color-status-error))",
};

export function MetricSparkline({
  data,
  width = 96,
  height = 28,
  tone,
  fill = true,
}: MetricSparklineProps) {
  if (data.length < 2) {
    return (
      <span
        aria-hidden
        className="inline-block align-middle"
        style={{
          width,
          height: 1,
          background: "var(--color-border-soft)",
        }}
      />
    );
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 1.5;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * w;
    const y = pad + h - ((v - min) / range) * h;
    return [x, y] as const;
  });
  const linePath = points
    .map(([x, y], i) =>
      i === 0
        ? `M${x.toFixed(2)} ${y.toFixed(2)}`
        : `L${x.toFixed(2)} ${y.toFixed(2)}`
    )
    .join(" ");
  const last = points[points.length - 1]!;
  const first = points[0]!;
  const areaPath = `${linePath} L${last[0].toFixed(2)} ${(pad + h).toFixed(2)} L${first[0].toFixed(2)} ${(pad + h).toFixed(2)} Z`;

  const derivedTone: NonNullable<MetricSparklineProps["tone"]> =
    tone ??
    (data[data.length - 1]! > data[0]!
      ? "ok"
      : data[data.length - 1]! < data[0]!
        ? "error"
        : "muted");
  const stroke = TONE_COLOR[derivedTone];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-hidden
      className="inline-block align-middle flex-shrink-0"
    >
      {fill && <path d={areaPath} fill={stroke} opacity={0.12} />}
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r={2} fill={stroke} />
    </svg>
  );
}
