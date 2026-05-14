/**
 * Slim Trustpilot rating bar — sits directly below the hero.
 *
 * Reads `Trustpilot rating / review count / profile URL` from
 * SiteSetting (see `lib/site/settings.ts → getTrustpilotSummary`).
 *
 * When the rating is unset (e.g. fresh install before the admin pastes
 * the current number) we render a CTA-only variant — "Läs vad våra
 * kunder säger →" — without inventing a score. That's the deliberate
 * trade-off: a real number when we have one, an honest invitation
 * otherwise. We never hardcode a fabricated rating.
 */
import { getTrustpilotSummary } from "@/lib/site/settings";

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

/** Categorical label per Trustpilot's own scoring brackets. */
function ratingLabel(rating: number): string {
  if (rating >= 4.4) return "Utmärkt";
  if (rating >= 4.0) return "Mycket bra";
  if (rating >= 3.0) return "Bra";
  if (rating >= 2.0) return "Acceptabelt";
  return "Dåligt";
}

export async function TrustpilotBar() {
  const tp = await getTrustpilotSummary();

  return (
    <section className="bg-surface-alt border-b border-border">
      <a
        href={tp.profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-wrap items-center justify-center gap-4 px-8 py-3.5 hover:bg-surface-warm transition-colors"
      >
        {tp.rating !== null ? (
          <>
            <Stars rating={tp.rating} />
            <span className="font-display text-lg font-medium text-primary-deep tracking-tight leading-none">
              {tp.rating.toString().replace(".", ",")}{" "}
              <span className="text-sm text-ink-mute font-normal">av 5</span>
            </span>
            <span aria-hidden className="w-px h-4 bg-border" />
            <span className="text-sm font-semibold text-ink-body">
              <span className="text-trustpilot">{ratingLabel(tp.rating)}</span>{" "}
              på Trustpilot
            </span>
            {tp.reviewCount !== null && (
              <>
                <span aria-hidden className="w-px h-4 bg-border" />
                <span className="text-sm text-ink-mute">
                  {tp.reviewCount} omdömen
                  <span className="text-primary ml-1">→</span>
                </span>
              </>
            )}
          </>
        ) : (
          <span className="text-sm font-semibold text-ink-body">
            Läs vad våra kunder säger på{" "}
            <span className="text-trustpilot">Trustpilot</span>
            <span className="text-primary ml-1">→</span>
          </span>
        )}
      </a>
    </section>
  );
}
