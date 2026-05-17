/**
 * Direction D hero area chart.
 *
 * Replaces the crude fixed-width MetricSparkline on the Översikt hero.
 * Differences that matter for matching the mockup:
 *
 *  - **Responsive width** via a fixed viewBox + `width:100%` +
 *    `vector-effect:non-scaling-stroke` (the line stays 1.5 px crisp
 *    while the path scales to its container). The old 680 px hard SVG
 *    overflowed into the topbar on anything narrower than the mock.
 *  - **Dotted mean baseline** (rule: "chart line + faint fill", and the
 *    mock shows the dashed average rule the spike is measured against).
 *  - **Bounded** — sparse data (one 819 kr day in 30) renders as a
 *    contained bump on the baseline, never a full-height triangle that
 *    escapes its box.
 *  - Terracotta line + 22 % fill + end dot (rule iv: one accent line).
 *
 * Honest about sparse data: with ~2 real orders this is a flat line
 * with one bump. We do not smooth/fake a trend — the curve gets its
 * shape from real order volume, which only arrives with real traffic.
 */
export function DAreaChart({
  data,
  height = 120,
  ariaLabel,
}: {
  data: number[];
  height?: number;
  ariaLabel?: string;
}) {
  const VBW = 1000; // viewBox width — arbitrary; SVG scales to container
  const VBH = height;

  if (data.length < 2) {
    return (
      <div
        className="w-full"
        style={{ height }}
        aria-hidden
        role="presentation"
      >
        <div
          className="w-full border-t border-dashed border-[var(--d-line)]"
          style={{ marginTop: height / 2 }}
        />
      </div>
    );
  }

  const min = Math.min(...data, 0);
  const max = Math.max(...data);
  const range = max - min || 1;
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const pad = 4;
  const w = VBW - pad * 2;
  const h = VBH - pad * 2;

  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * w;
    const y = pad + h - ((v - min) / range) * h;
    return [x, y] as const;
  });
  const line = pts
    .map(([x, y], i) =>
      i === 0 ? `M${x.toFixed(1)} ${y.toFixed(1)}` : `L${x.toFixed(1)} ${y.toFixed(1)}`
    )
    .join(" ");
  const first = pts[0]!;
  const last = pts[pts.length - 1]!;
  const area = `${line} L${last[0].toFixed(1)} ${(pad + h).toFixed(
    1
  )} L${first[0].toFixed(1)} ${(pad + h).toFixed(1)} Z`;
  const meanY = pad + h - ((mean - min) / range) * h;

  return (
    <svg
      viewBox={`0 0 ${VBW} ${VBH}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      role="img"
      aria-label={ariaLabel}
      className="block overflow-visible"
    >
      {/* dotted mean baseline */}
      <line
        x1={pad}
        x2={VBW - pad}
        y1={meanY}
        y2={meanY}
        stroke="var(--d-line-strong)"
        strokeWidth={1}
        strokeDasharray="2 4"
        vectorEffect="non-scaling-stroke"
      />
      <path d={area} fill="var(--d-accent)" opacity={0.18} />
      <path
        d={line}
        fill="none"
        stroke="var(--d-accent)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={last[0]}
        cy={last[1]}
        r={3}
        fill="var(--d-accent)"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
