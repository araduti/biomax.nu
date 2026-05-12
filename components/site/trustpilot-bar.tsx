/**
 * Slim Trustpilot rating bar — sits directly below the hero.
 *
 * For V1 the rating + review count are hardcoded (locked in ADR 0008 as a known
 * "live data" item). Later wired to the Trustpilot API or scraped on a 24h
 * cache from the public profile.
 */

const TRUSTPILOT_URL = "https://se.trustpilot.com/review/biomax.nu";
const RATING = 4.4;
const REVIEW_COUNT = 53;

function Stars({ rating, size = 18 }: { rating: number; size?: number }) {
  return (
    <div
      className="flex gap-0.5"
      role="img"
      aria-label={`${rating.toString().replace(".", ",")} av 5 stjärnor på Trustpilot`}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, rating - i));
        const id = `tp-star-${i}-${rating.toString().replace(".", "")}`;
        return (
          <svg
            key={i}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            aria-hidden
            className="block"
          >
            <defs>
              <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
                <stop offset={`${fill * 100}%`} stopColor="var(--color-trustpilot)" />
                <stop offset={`${fill * 100}%`} stopColor="#D9E0DD" />
              </linearGradient>
            </defs>
            <path
              d="M12 2 L14.85 8.85 L22 9.5 L16.5 14.5 L18 22 L12 18 L6 22 L7.5 14.5 L2 9.5 L9.15 8.85 Z"
              fill={`url(#${id})`}
            />
          </svg>
        );
      })}
    </div>
  );
}

export function TrustpilotBar() {
  return (
    <section className="bg-surface-alt border-b border-border">
      <a
        href={TRUSTPILOT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-wrap items-center justify-center gap-4 px-8 py-3.5 hover:bg-surface-warm transition-colors"
      >
        <Stars rating={RATING} />
        <span className="font-display text-lg font-medium text-primary-deep tracking-tight leading-none">
          {RATING.toString().replace(".", ",")}{" "}
          <span className="text-sm text-ink-mute font-normal">av 5</span>
        </span>
        <span aria-hidden className="w-px h-4 bg-border" />
        <span className="text-sm font-semibold text-ink-body">
          <span className="text-trustpilot">Utmärkt</span> på Trustpilot
        </span>
        <span aria-hidden className="w-px h-4 bg-border" />
        <span className="text-sm text-ink-mute">
          {REVIEW_COUNT} omdömen
          <span className="text-primary ml-1">→</span>
        </span>
      </a>
    </section>
  );
}
