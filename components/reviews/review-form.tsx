"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { submitReview } from "@/lib/reviews/actions";
import { BEHOV_LABELS } from "@/lib/symptoms/behov-labels";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success" }
  | { kind: "error"; message: string };

/**
 * Customer review submission. Renders a star picker, optional title,
 * required body, optional author-name override. Login-gated server-side;
 * the action returns an "ej inloggad"-error and we show a link to /logga-in.
 *
 * When the viewer has already submitted a review for this product
 * (PENDING/APPROVED), the form is replaced with a soft confirmation
 * instead of waiting for the user to hit submit and meet the server-side
 * "Du har redan lämnat en recension" error.
 */
type ExistingReview = {
  status: "PENDING" | "APPROVED" | "REJECTED";
};

export function ReviewForm({
  productSlug,
  loggedIn,
  existingReview,
}: {
  productSlug: string;
  loggedIn: boolean;
  /** The viewer's prior review for this product, if any. */
  existingReview?: ExistingReview | null;
}) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [reviewerGoal, setReviewerGoal] = useState<string>("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [pending, start] = useTransition();

  if (!loggedIn) {
    return (
      <div className="rounded-2xl border border-border bg-surface-warm/60 p-6">
        <p className="font-sans text-body text-ink-body leading-relaxed">
          Logga in för att lämna en recension. Endast inloggade kunder kan
          recensera, så att vi kan visa &quot;Verifierat köp&quot;-markeringen
          där det passar.
        </p>
        <div className="mt-4">
          <Link
            href={`/logga-in?next=/produkter/${productSlug}`}
            className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-primary-deep text-surface font-sans text-small font-semibold hover:bg-primary-deep/90"
          >
            Logga in
          </Link>
        </div>
      </div>
    );
  }

  // Viewer has already submitted a review for this product. Render a soft
  // confirmation instead of the form — the server-side guard would otherwise
  // throw "Du har redan lämnat en recension" on submit, which is correct
  // but reads as an error rather than a "we already heard from you" state.
  // REJECTED reviews are allowed to re-submit (the user can write a better
  // one) so we only short-circuit on PENDING/APPROVED.
  if (
    existingReview &&
    (existingReview.status === "PENDING" || existingReview.status === "APPROVED")
  ) {
    const pending = existingReview.status === "PENDING";
    return (
      <div
        role="status"
        className="rounded-2xl border border-accent-deep/30 bg-accent/8 p-6"
      >
        <h3 className="font-display text-lg font-medium tracking-tight text-primary-deep">
          Tack — vi har din recension
        </h3>
        <p className="mt-2 font-sans text-body text-ink-body leading-relaxed">
          {pending
            ? "Den väntar på att granskas och publiceras inom någon dag. Vill du komplettera eller ändra något? Hör av dig på kontakt@biomax.nu så hjälper vi till."
            : "Den är publicerad nedan. Vill du komplettera eller ändra den? Hör av dig på kontakt@biomax.nu så hjälper vi till."}
        </p>
      </div>
    );
  }

  if (status.kind === "success") {
    return (
      <div
        role="status"
        className="rounded-2xl border border-accent-deep/40 bg-accent/8 p-6"
      >
        <p className="font-sans text-body text-ink-body leading-relaxed">
          Tack — din recension är inskickad och hamnar publikt så snart vi
          granskat den. Vi läser alla nya recensioner inom någon dag.
        </p>
      </div>
    );
  }

  function submit() {
    setStatus({ kind: "loading" });
    start(async () => {
      const result = await submitReview({
        productSlug,
        rating,
        title: title.trim() || undefined,
        body,
        authorName: authorName.trim() || undefined,
        reviewerGoal: reviewerGoal || null,
      });
      if (!result.ok) {
        setStatus({ kind: "error", message: result.error });
        return;
      }
      setStatus({ kind: "success" });
    });
  }

  const shown = hoverRating ?? rating;

  return (
    <div className="rounded-2xl border border-border bg-surface-alt p-6 md:p-8">
      <h3 className="font-display text-xl font-medium tracking-tight text-primary-deep mb-1">
        Lämna en recension
      </h3>
      <p className="font-sans text-small text-ink-mute mb-5 leading-relaxed">
        Dela din egen erfarenhet. Var ärlig — beskriv vad du tycker, hur du
        använt produkten och vad andra kunder bör veta.
      </p>

      {/* Star picker */}
      <div className="mb-5">
        <label className="block font-sans text-caption font-semibold text-ink-soft mb-2">
          Betyg
        </label>
        <div
          className="inline-flex gap-1 text-accent-deep"
          onMouseLeave={() => setHoverRating(null)}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHoverRating(n)}
              aria-label={`${n} av 5 stjärnor`}
              className="w-9 h-9 inline-flex items-center justify-center hover:scale-110 transition-transform"
            >
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill={n <= shown ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
                aria-hidden
              >
                <polygon points="12 2 15 8.5 22 9.3 17 14.2 18.2 21 12 17.7 5.8 21 7 14.2 2 9.3 9 8.5" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block font-sans text-caption font-semibold text-ink-soft mb-1.5">
            Vad köpte du produkten för? (valfritt)
          </label>
          <p className="font-sans text-micro text-ink-soft mb-2.5 leading-snug">
            Hjälper andra kunder hitta recensioner från dem som köpt av samma anledning.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {BEHOV_LABELS.map((b) => {
              const active = reviewerGoal === b.slug;
              return (
                <button
                  key={b.slug}
                  type="button"
                  onClick={() =>
                    setReviewerGoal(active ? "" : b.slug)
                  }
                  className={`px-3 py-1.5 rounded-full border font-sans text-caption font-semibold transition-colors ${
                    active
                      ? "bg-primary-deep text-surface border-primary-deep"
                      : "bg-surface text-ink-body border-border hover:border-border-soft hover:bg-surface-warm"
                  }`}
                >
                  {b.label}
                </button>
              );
            })}
          </div>
        </div>

        <Input
          label="Rubrik (valfritt)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          disabled={pending}
        />

        <div>
          <label
            htmlFor="review-body"
            className="block font-sans text-caption font-semibold text-ink-soft mb-1.5"
          >
            Din erfarenhet *
          </label>
          <textarea
            id="review-body"
            rows={6}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={pending}
            placeholder="Hur har du använt produkten? Vad har du märkt? Något andra bör veta?"
            className="w-full px-3 py-2 bg-surface border border-border rounded-md font-sans text-body text-ink-body placeholder:text-ink-soft focus:outline-none focus:border-accent disabled:opacity-50"
            required
            minLength={10}
            maxLength={2000}
          />
          <p className="mt-1 font-sans text-micro text-ink-soft">
            Minst 10 tecken, högst 2000.
          </p>
        </div>

        <Input
          label="Visningsnamn (valfritt)"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          maxLength={60}
          disabled={pending}
          hint="Lämna tomt för att använda namnet på ditt konto. Skriv t.ex. &quot;Karin S.&quot; om du föredrar."
        />
      </div>

      {status.kind === "error" && (
        <p
          role="alert"
          className="mt-4 font-sans text-caption text-status-error bg-status-error/10 px-3 py-2 rounded-md"
        >
          {status.message}
        </p>
      )}

      <div className="mt-6">
        <Button
          type="button"
          size="md"
          onClick={submit}
          disabled={pending || body.trim().length < 10}
        >
          {pending ? "Skickar…" : "Skicka recension"}
        </Button>
        <p className="mt-3 font-sans text-micro text-ink-soft leading-relaxed">
          Recensioner granskas innan publicering. Vi publicerar både positiva
          och kritiska recensioner — det viktigaste är att de är ärliga.
        </p>
      </div>
    </div>
  );
}
