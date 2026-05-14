"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/reviews/star-rating";
import {
  approveReview,
  rejectReview,
  deleteReview,
  setStoreResponse,
} from "@/lib/reviews/actions";
import type { ReviewStatus } from "@prisma/client";

type Review = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  authorDisplay: string;
  authorEmail: string | null;
  verified: boolean;
  status: ReviewStatus;
  storeResponse: string | null;
  storeRespondedAt: Date | null;
  createdAt: Date;
  product: { slug: string; name: string };
};

function formatDate(d: Date): string {
  return d.toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const STATUS_TONE: Record<ReviewStatus, string> = {
  PENDING: "bg-[#C68A4F]/15 text-[#7A4D2A]",
  APPROVED: "bg-accent/15 text-accent-deep",
  REJECTED: "bg-[#B5523B]/15 text-[#B5523B]",
};

const STATUS_LABEL: Record<ReviewStatus, string> = {
  PENDING: "Väntar",
  APPROVED: "Godkänd",
  REJECTED: "Avvisad",
};

export function ReviewModerationRow({ review }: { review: Review }) {
  const router = useRouter();
  const [responseDraft, setResponseDraft] = useState(review.storeResponse ?? "");
  const [responseOpen, setResponseOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    start(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.error ?? "Något gick fel.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <article className="bg-surface-alt border border-border rounded-2xl p-5 md:p-6">
      {/* Top row: meta + status pill */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-accent-deep mb-1">
            <StarRating value={review.rating} size={15} />
            <span className="font-sans text-[12px] text-ink-soft">
              {review.rating}/5
            </span>
            {review.verified && (
              <span className="font-sans text-[10.5px] uppercase tracking-[0.14em] font-semibold text-accent-deep ml-1">
                ✓ Verifierat köp
              </span>
            )}
          </div>
          <div className="font-sans text-[12.5px] text-ink-mute">
            <Link
              href={`/admin/produkter/${review.product.slug}`}
              className="text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent"
            >
              {review.product.name}
            </Link>
            <span className="mx-1.5">·</span>
            {review.authorDisplay}
            {review.authorEmail && (
              <span className="text-ink-soft"> ({review.authorEmail})</span>
            )}
            <span className="mx-1.5">·</span>
            {formatDate(review.createdAt)}
          </div>
        </div>
        <span
          className={
            "shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full font-sans text-[11px] uppercase tracking-[0.14em] font-semibold " +
            STATUS_TONE[review.status]
          }
        >
          {STATUS_LABEL[review.status]}
        </span>
      </div>

      {/* Review body */}
      {review.title && (
        <p className="font-display text-[16px] font-medium text-primary-deep tracking-tight mb-1">
          {review.title}
        </p>
      )}
      <p className="font-sans text-[14px] text-ink-body leading-relaxed whitespace-pre-line">
        {review.body}
      </p>

      {/* Existing store response */}
      {review.storeResponse && !responseOpen && (
        <div className="mt-4 ml-4 pl-4 border-l-2 border-accent/40">
          <p className="font-sans text-[11px] uppercase tracking-[0.16em] font-semibold text-accent-deep mb-1">
            Svar från Biomax
          </p>
          <p className="font-sans text-[13.5px] text-ink-body leading-relaxed whitespace-pre-line">
            {review.storeResponse}
          </p>
          <button
            type="button"
            onClick={() => setResponseOpen(true)}
            className="mt-2 font-sans text-[11.5px] text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent"
          >
            Redigera svar
          </button>
        </div>
      )}

      {/* Inline response editor */}
      {responseOpen && (
        <div className="mt-4 border-t border-border-soft pt-4">
          <label
            htmlFor={`resp-${review.id}`}
            className="block font-sans text-[12px] font-semibold text-ink-soft mb-1.5"
          >
            Svar från Biomax
          </label>
          <textarea
            id={`resp-${review.id}`}
            rows={3}
            value={responseDraft}
            onChange={(e) => setResponseDraft(e.target.value)}
            disabled={pending}
            placeholder="Tack för din feedback! …"
            className="w-full px-3 py-2 bg-surface border border-border rounded-md font-sans text-[13.5px] text-ink-body focus:outline-none focus:border-accent disabled:opacity-50"
          />
          <div className="mt-2 flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() =>
                run(async () => {
                  const r = await setStoreResponse(review.id, responseDraft);
                  if (r.ok) {
                    setSavedFlash("Svar sparat");
                    setTimeout(() => setSavedFlash(null), 2000);
                    setResponseOpen(false);
                  }
                  return r;
                })
              }
              disabled={pending}
            >
              {pending ? "Sparar…" : "Spara svar"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setResponseOpen(false);
                setResponseDraft(review.storeResponse ?? "");
              }}
              disabled={pending}
            >
              Avbryt
            </Button>
            {review.storeResponse && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  run(async () => {
                    const r = await setStoreResponse(review.id, "");
                    if (r.ok) {
                      setResponseDraft("");
                      setResponseOpen(false);
                    }
                    return r;
                  })
                }
                disabled={pending}
                className="text-[#B5523B] hover:bg-[#B5523B]/10"
              >
                Ta bort svar
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Action row */}
      <div className="mt-5 pt-4 border-t border-border-soft flex flex-wrap items-center gap-2">
        {review.status !== "APPROVED" && (
          <Button
            type="button"
            size="sm"
            onClick={() => run(() => approveReview(review.id))}
            disabled={pending}
          >
            Godkänn
          </Button>
        )}
        {review.status !== "REJECTED" && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => run(() => rejectReview(review.id))}
            disabled={pending}
          >
            Avvisa
          </Button>
        )}
        {!responseOpen && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setResponseOpen(true)}
            disabled={pending}
          >
            {review.storeResponse ? "Redigera svar" : "Svara"}
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            if (!confirm("Ta bort recensionen helt? Detta går inte att ångra."))
              return;
            run(() => deleteReview(review.id));
          }}
          disabled={pending}
          className="text-[#B5523B] hover:bg-[#B5523B]/10 ml-auto"
        >
          Ta bort
        </Button>
        {savedFlash && (
          <span
            role="status"
            className="font-sans text-[12px] text-accent-deep font-semibold"
          >
            ✓ {savedFlash}
          </span>
        )}
        {error && (
          <span
            role="alert"
            className="font-sans text-[12px] text-[#B5523B] font-semibold"
          >
            {error}
          </span>
        )}
      </div>
    </article>
  );
}
