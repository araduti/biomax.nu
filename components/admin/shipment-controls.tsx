"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  bookOrderShipment,
  markFulfilled,
} from "@/lib/admin/shipment-actions";

/**
 * Admin shipment + fulfilment controls on the order detail page.
 *
 * Two-step flow:
 *   1. "Boka frakt"  → calls PostNord (or stub) to mint a tracking
 *      number + label. The Order row gets `trackingNumber` /
 *      `labelPdfUrl` / `carrier`. Order stays in PAID.
 *   2. "Markera som skickad" → flips status to FULFILLED. The
 *      review-request cron picks it up 14 days later.
 *
 * Stub mode is identified by the synthetic tracking number prefix
 * (STUB-…). In that case the "Ladda ner fraktsedel"-button is hidden
 * since there's no real label to download.
 */
export function ShipmentControls({
  orderId,
  orderNumber,
  status,
  trackingNumber,
  labelPdfUrl,
  carrier,
}: {
  orderId: string;
  orderNumber: string;
  status: string;
  trackingNumber: string | null;
  labelPdfUrl: string | null;
  carrier: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

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

  const stub = trackingNumber?.startsWith("STUB-") ?? false;
  const showBook = status === "PAID" && !trackingNumber;
  const showRebook = status === "PAID" && trackingNumber;
  const showFulfill = status === "PAID";

  if (status !== "PAID" && !trackingNumber) {
    return null;
  }

  return (
    <section className="mt-12 pt-8 border-t border-border">
      <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-ink-soft font-semibold mb-4">
        Frakt
      </p>

      {trackingNumber && (
        <div className="bg-surface-alt border border-border rounded-2xl p-5 mb-4">
          <p className="font-display text-base font-medium text-primary-deep mb-1">
            {carrier ?? "PostNord"} ·{" "}
            <code className="font-mono text-sm">{trackingNumber}</code>
            {stub && (
              <span className="ml-2 font-sans text-[11px] uppercase tracking-[0.16em] font-semibold text-[#8A5A2C] bg-[#C68A4F]/15 px-2 py-0.5 rounded-full">
                Stub
              </span>
            )}
          </p>
          {labelPdfUrl ? (
            <a
              href={labelPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-sans text-[13px] text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent"
            >
              Ladda ner fraktsedel (PDF) ↗
            </a>
          ) : (
            <p className="font-sans text-[12.5px] text-ink-mute">
              {stub
                ? "Ingen fraktsedel — PostNord-creds inte konfigurerade."
                : "Fraktsedel inte tillgänglig än."}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {showBook && (
          <Button
            type="button"
            onClick={() => dispatch(() => bookOrderShipment({ orderId }))}
            disabled={pending}
          >
            {pending ? "Bokar…" : "Boka frakt"}
          </Button>
        )}
        {showRebook && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => dispatch(() => bookOrderShipment({ orderId }))}
            disabled={pending}
          >
            Boka om
          </Button>
        )}
        {showFulfill && (
          <Button
            type="button"
            variant={trackingNumber ? "primary" : "outline"}
            onClick={() => dispatch(() => markFulfilled({ orderId }))}
            disabled={pending || !trackingNumber}
            title={
              trackingNumber
                ? undefined
                : "Boka frakt först."
            }
          >
            Markera som skickad
          </Button>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 font-sans text-[12.5px] text-[#B5523B]"
        >
          {error}
        </p>
      )}
    </section>
  );
}
