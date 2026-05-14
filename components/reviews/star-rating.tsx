/**
 * Star rating display. Renders fractional fills (half-star and beyond)
 * via a per-star linear-gradient — no extra DOM nodes, no SVG sprites,
 * works in print and email.
 */
export function StarRating({
  value,
  size = 16,
  ariaLabel,
}: {
  value: number;
  size?: number;
  ariaLabel?: string;
}) {
  const stars: number[] = [];
  for (let i = 0; i < 5; i++) {
    const fill = Math.max(0, Math.min(1, value - i));
    stars.push(fill);
  }
  return (
    <span
      aria-label={ariaLabel ?? `${value} av 5 stjärnor`}
      role="img"
      style={{ display: "inline-flex", gap: size * 0.06 }}
    >
      {stars.map((fill, i) => (
        <Star key={i} fill={fill} size={size} />
      ))}
    </span>
  );
}

function Star({ fill, size }: { fill: number; size: number }) {
  // Two stacked SVGs: empty outline + a clipped solid star. Using a
  // percentage clip-path keeps the alignment crisp at any size.
  const id = `star-clip-${Math.random().toString(36).slice(2, 9)}`;
  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        width: size,
        height: size,
        lineHeight: 0,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        style={{ position: "absolute", inset: 0, opacity: 0.35 }}
        aria-hidden
      >
        <polygon points="12 2 15 8.5 22 9.3 17 14.2 18.2 21 12 17.7 5.8 21 7 14.2 2 9.3 9 8.5" />
      </svg>
      <span
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          width: `${fill * 100}%`,
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <polygon points="12 2 15 8.5 22 9.3 17 14.2 18.2 21 12 17.7 5.8 21 7 14.2 2 9.3 9 8.5" />
        </svg>
      </span>
    </span>
  );
}
