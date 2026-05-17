import Link from "next/link";
import { StarRating } from "./star-rating";
import type { PublicReview, ReviewAggregate } from "@/lib/reviews/queries";
import { BEHOV_LABELS } from "@/lib/symptoms/behov-labels";

const BEHOV_LABEL_BY_SLUG = new Map(BEHOV_LABELS.map((b) => [b.slug, b.label]));

function formatDate(d: Date): string {
  return d.toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function ReviewList({
  reviews,
  aggregate,
  goalCounts = [],
  activeGoal = null,
  baseHref = "",
}: {
  reviews: PublicReview[];
  aggregate: ReviewAggregate;
  /** Per-goal review counts for the filter chips. Empty hides the strip. */
  goalCounts?: Array<{ goal: string; count: number }>;
  /** Currently-selected filter slug (drives the active chip). */
  activeGoal?: string | null;
  /** Base path for filter links — typically the PDP URL. The chips
   *  append ?recensioner=<slug>#recensioner and rely on the server
   *  re-fetching with the filter applied. */
  baseHref?: string;
}) {
  if (aggregate.count === 0) {
    return (
      <p className="font-sans text-[14px] text-ink-mute italic">
        Inga recensioner än — bli först med att dela din erfarenhet.
      </p>
    );
  }

  return (
    <div>
      {/* Aggregate header — number + stars + histogram */}
      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 md:gap-10 items-start mb-10">
        <div>
          <div className="flex items-baseline gap-3">
            <span className="font-display text-4xl font-medium tracking-tight text-primary-deep tabular-nums">
              {aggregate.average.toFixed(1)}
            </span>
            <span className="font-sans text-[14px] text-ink-soft">/ 5</span>
          </div>
          <div className="mt-2 text-accent-deep">
            <StarRating value={aggregate.average} size={18} />
          </div>
          <p className="mt-2 font-sans text-[13px] text-ink-mute">
            Baserat på {aggregate.count}{" "}
            {aggregate.count === 1 ? "recension" : "recensioner"}
          </p>
        </div>

        <ul className="space-y-1.5 max-w-[420px] w-full">
          {aggregate.histogram.map((count, i) => {
            const star = 5 - i;
            const pct =
              aggregate.count > 0 ? (count / aggregate.count) * 100 : 0;
            return (
              <li
                key={star}
                className="grid grid-cols-[28px_1fr_36px] items-center gap-2 font-sans text-[12.5px] text-ink-mute"
              >
                <span className="tabular-nums">{star} ★</span>
                <span className="relative h-1.5 rounded-full bg-border-soft overflow-hidden">
                  <span
                    className="absolute inset-y-0 left-0 bg-accent-deep rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="tabular-nums text-right">{count}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Goal filter chips — only when we actually have goal-tagged
          reviews. Uses query-param routing (?recensioner=<slug>) so the
          chip state is shareable and SEO-friendly. */}
      {goalCounts.length > 0 && (
        <div className="mb-8 -mt-4">
          <p className="font-sans text-[11.5px] uppercase tracking-[0.18em] font-semibold text-ink-soft mb-2.5">
            Filtrera efter behov
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`${baseHref}#recensioner`}
              scroll={false}
              className={`px-3.5 py-1.5 rounded-full border font-sans text-[12.5px] font-semibold transition-colors ${
                !activeGoal
                  ? "bg-primary-deep text-surface border-primary-deep"
                  : "bg-surface text-ink-body border-border hover:border-border-soft hover:bg-surface-warm"
              }`}
            >
              Alla ({aggregate.count})
            </Link>
            {goalCounts.map((g) => {
              const label = BEHOV_LABEL_BY_SLUG.get(g.goal) ?? g.goal;
              const active = activeGoal === g.goal;
              return (
                <Link
                  key={g.goal}
                  href={`${baseHref}?recensioner=${encodeURIComponent(g.goal)}#recensioner`}
                  scroll={false}
                  className={`px-3.5 py-1.5 rounded-full border font-sans text-[12.5px] font-semibold transition-colors ${
                    active
                      ? "bg-primary-deep text-surface border-primary-deep"
                      : "bg-surface text-ink-body border-border hover:border-border-soft hover:bg-surface-warm"
                  }`}
                >
                  Köpt för {label} ({g.count})
                </Link>
              );
            })}
          </div>
          {activeGoal && reviews.length === 0 && (
            <p className="mt-5 font-sans text-[14px] text-ink-mute italic">
              Inga recensioner i den här kategorin än.
            </p>
          )}
        </div>
      )}

      {/* List */}
      <ul className="space-y-8">
        {reviews.map((r) => (
          <li key={r.id} className="border-t border-border-soft pt-6">
            <div className="flex items-center gap-3 mb-2 text-accent-deep">
              <StarRating value={r.rating} size={15} />
              {r.verified && (
                <span className="inline-flex items-center gap-1 font-sans text-[11px] uppercase tracking-[0.14em] font-semibold text-accent-deep">
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    aria-hidden
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Verifierat köp
                </span>
              )}
            </div>
            {r.title && (
              <p className="font-display text-[16px] font-medium text-primary-deep tracking-tight mb-1">
                {r.title}
              </p>
            )}
            <p className="font-sans text-[14.5px] text-ink-body leading-relaxed whitespace-pre-line">
              {r.body}
            </p>
            <p className="mt-3 font-sans text-[12px] text-ink-soft">
              {r.authorDisplay} · {formatDate(r.createdAt)}
              {r.reviewerGoal && BEHOV_LABEL_BY_SLUG.has(r.reviewerGoal) && (
                <>
                  {" · "}
                  <span className="text-accent-deep font-semibold">
                    Köpt för {BEHOV_LABEL_BY_SLUG.get(r.reviewerGoal)}
                  </span>
                </>
              )}
            </p>
            {r.storeResponse && (
              <div className="mt-4 ml-4 pl-4 border-l-2 border-accent/40">
                <p className="font-sans text-[11px] uppercase tracking-[0.16em] font-semibold text-accent-deep mb-1">
                  Svar från Biomax
                </p>
                <p className="font-sans text-[14px] text-ink-body leading-relaxed whitespace-pre-line">
                  {r.storeResponse}
                </p>
                {r.storeRespondedAt && (
                  <p className="mt-2 font-sans text-[11.5px] text-ink-soft">
                    {formatDate(r.storeRespondedAt)}
                  </p>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
