import type { HistoryPoint } from "@/lib/integrations/gsc-history";

/**
 * Tiny inline SVG sparkline of GSC impressions over time. Server-rendered,
 * no client JS — the data is small and static within a server component.
 *
 * Visual encoding:
 *   - Line + light area fill = impressions trend (higher = more demand)
 *   - Coloured trend arrow = direction of last 3 points vs first 3
 *   - Empty state = single grey baseline (visually distinct from "no data")
 */
export function Sparkline({
  history,
  metric = "impressions",
  width = 56,
  height = 16,
}: {
  history: HistoryPoint[];
  metric?: "impressions" | "clicks" | "position";
  width?: number;
  height?: number;
}) {
  if (history.length === 0) {
    return <span className="inline-block w-[56px] text-ink-soft text-[10px] tabular-nums">—</span>;
  }

  const values = history.map((h) => h[metric]);

  // For position, lower is better — invert so "up" still looks like "good".
  const display =
    metric === "position" ? values.map((v) => -v) : values;

  const min = Math.min(...display);
  const max = Math.max(...display);
  const range = max - min || 1;

  const stepX = values.length > 1 ? width / (values.length - 1) : 0;
  const points = display.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return [x, y] as const;
  });

  // SVG path
  const linePath = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${width.toFixed(1)},${height} L0,${height} Z`;

  // Trend direction (last 3 mean vs first 3 mean)
  const head = display.slice(0, Math.min(3, display.length));
  const tail = display.slice(-Math.min(3, display.length));
  const headMean = head.reduce((s, v) => s + v, 0) / head.length;
  const tailMean = tail.reduce((s, v) => s + v, 0) / tail.length;
  const trend =
    tailMean > headMean * 1.1
      ? "up"
      : tailMean < headMean * 0.9
        ? "down"
        : "flat";

  const stroke =
    trend === "up"
      ? "var(--color-accent-deep)"
      : trend === "down"
        ? "var(--color-status-error)"
        : "var(--color-ink-soft)";
  const fill =
    trend === "up"
      ? "var(--color-accent)"
      : trend === "down"
        ? "var(--color-status-error)"
        : "var(--color-ink-soft)";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
      className="inline-block align-middle flex-shrink-0"
    >
      <path d={areaPath} fill={fill} fillOpacity="0.12" />
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth="1.25"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.length > 0 && (
        <circle
          cx={points[points.length - 1][0]}
          cy={points[points.length - 1][1]}
          r="1.5"
          fill={stroke}
        />
      )}
    </svg>
  );
}
