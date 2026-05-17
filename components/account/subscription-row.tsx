"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
  changeInterval,
} from "@/lib/subscriptions/actions";
import {
  SUBSCRIPTION_INTERVAL_DAYS,
  intervalLabelSwedish,
  type SubscriptionIntervalDays,
} from "@/lib/subscriptions/constants";

type RowSubscription = {
  id: string;
  status: "ACTIVE" | "PAUSED" | "CANCELLED";
  intervalDays: number;
  discountPercent: number;
  /** ISO string — already serialised by the server component. */
  nextOrderAt: string;
  intervalLabel: string;
  lines: {
    id: string;
    productSlug: string;
    productName: string;
    productImageUrl: string;
    variantLabel: string | null;
    quantity: number;
    unitPriceAtCreate: number;
  }[];
  shippingAddressLine: string | null;
};

const STATUS_LABEL: Record<RowSubscription["status"], string> = {
  ACTIVE: "Aktiv",
  PAUSED: "Pausad",
  CANCELLED: "Avslutad",
};

const STATUS_TONE: Record<RowSubscription["status"], string> = {
  ACTIVE: "bg-accent-deep/12 text-accent-deep",
  PAUSED: "bg-status-warn/15 text-status-low",
  CANCELLED: "bg-ink-soft/12 text-ink-soft",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * One subscription row on /konto/prenumerationer.
 *
 * Reads server-rendered data + dispatches server actions for pause /
 * resume / cancel / change-interval. `useTransition` keeps the UI
 * responsive; on action success we `router.refresh()` so the displayed
 * state matches the DB.
 *
 * "Avsluta" is gated behind a confirm step inline — no modal — to keep
 * the cancellation path low-friction (Apotea's wording: "avslutas när
 * som helst utan kostnad").
 */
export function SubscriptionRow({
  subscription,
}: {
  subscription: RowSubscription;
}) {
  const [pending, start] = useTransition();
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const isCancelled = subscription.status === "CANCELLED";

  function dispatch(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    start(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "Något gick fel.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="bg-surface-alt border border-border rounded-2xl p-5 md:p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
        <div className="flex items-baseline gap-3">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-sans text-[11px] uppercase tracking-[0.16em] font-semibold ${STATUS_TONE[subscription.status]}`}
          >
            {STATUS_LABEL[subscription.status]}
          </span>
          <p className="font-display text-lg text-primary-deep">
            {subscription.intervalLabel}
          </p>
          <p className="font-sans text-[12.5px] text-ink-soft">
            −{subscription.discountPercent} % per leverans
          </p>
        </div>
        {!isCancelled && (
          <p className="font-sans text-[13px] text-ink-body">
            Nästa leverans:{" "}
            <strong className="font-semibold text-primary-deep">
              {formatDate(subscription.nextOrderAt)}
            </strong>
          </p>
        )}
      </header>

      <ul className="mb-5 space-y-3">
        {subscription.lines.map((line) => (
          <li key={line.id} className="flex gap-4 items-center">
            <Link
              href={`/produkter/${line.productSlug}`}
              className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-surface-warm"
            >
              <Image
                src={line.productImageUrl || "/products/_placeholder.svg"}
                alt={line.productName}
                fill
                sizes="64px"
                className="object-cover mix-blend-darken"
              />
            </Link>
            <div className="flex-1 min-w-0">
              <Link
                href={`/produkter/${line.productSlug}`}
                className="font-display text-[15px] font-medium text-primary-deep hover:text-primary transition-colors"
              >
                {line.productName}
              </Link>
              {line.variantLabel && (
                <p className="font-sans text-[11.5px] uppercase tracking-[0.14em] font-semibold text-ink-soft mt-0.5">
                  {line.variantLabel}
                </p>
              )}
              <p className="font-sans text-[12.5px] text-ink-mute mt-0.5">
                {line.quantity} st · vid skapandet {line.unitPriceAtCreate.toFixed(2)} kr / st
              </p>
            </div>
          </li>
        ))}
      </ul>

      {subscription.shippingAddressLine && (
        <p className="mb-4 font-sans text-[12.5px] text-ink-mute">
          Levereras till: {subscription.shippingAddressLine}
        </p>
      )}

      {/* Controls */}
      {!isCancelled && !confirmingCancel && (
        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border-soft">
          {subscription.status === "ACTIVE" ? (
            <button
              type="button"
              onClick={() =>
                dispatch(() => pauseSubscription(subscription.id))
              }
              disabled={pending}
              className="px-4 py-1.5 rounded-md border border-border bg-surface hover:bg-surface-warm font-sans text-[13px] font-semibold text-ink-body transition-colors"
            >
              Pausa
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                dispatch(() => resumeSubscription(subscription.id))
              }
              disabled={pending}
              className="px-4 py-1.5 rounded-md bg-primary-deep text-surface hover:bg-primary-deep/90 font-sans text-[13px] font-semibold transition-colors"
            >
              Återuppta
            </button>
          )}

          {/* Interval changer — simple select for compactness. */}
          <label className="inline-flex items-center gap-2 font-sans text-[12.5px] text-ink-mute">
            Intervall
            <select
              value={subscription.intervalDays}
              disabled={pending}
              onChange={(e) =>
                dispatch(() =>
                  changeInterval(
                    subscription.id,
                    parseInt(e.target.value, 10) as SubscriptionIntervalDays
                  )
                )
              }
              className="px-2.5 py-1.5 rounded-md border border-border bg-surface font-sans text-[13px] text-ink-body"
            >
              {SUBSCRIPTION_INTERVAL_DAYS.map((d) => (
                <option key={d} value={d}>
                  {intervalLabelSwedish(d)}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => setConfirmingCancel(true)}
            className="ml-auto font-sans text-[12.5px] text-ink-soft hover:text-status-error transition-colors"
          >
            Avsluta prenumerationen
          </button>
        </div>
      )}

      {confirmingCancel && !isCancelled && (
        <div className="pt-4 border-t border-border-soft">
          <p className="font-sans text-[13.5px] text-ink-body mb-3">
            Säker på att du vill avsluta? Du kan starta en ny prenumeration när
            som helst.
          </p>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Valfritt — berätta varför, det hjälper oss bli bättre."
            rows={2}
            maxLength={240}
            className="w-full px-3 py-2 mb-3 bg-surface border border-border rounded-md font-sans text-[13.5px] text-ink-body placeholder:text-ink-soft focus:outline-none focus:border-accent"
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                dispatch(() =>
                  cancelSubscription(subscription.id, cancelReason || undefined)
                )
              }
              disabled={pending}
              className="px-4 py-1.5 rounded-md bg-status-error text-surface hover:bg-[#9F4630] font-sans text-[13px] font-semibold transition-colors"
            >
              {pending ? "Avslutar…" : "Ja, avsluta"}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmingCancel(false);
                setCancelReason("");
              }}
              disabled={pending}
              className="px-4 py-1.5 rounded-md border border-border bg-surface hover:bg-surface-warm font-sans text-[13px] font-semibold text-ink-body transition-colors"
            >
              Behåll
            </button>
          </div>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mt-3 font-sans text-[12.5px] text-status-error bg-status-error/10 px-3 py-2 rounded-md"
        >
          {error}
        </p>
      )}
    </li>
  );
}
