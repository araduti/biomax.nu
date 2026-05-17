"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { printOrderLabel, markFulfilled } from "@/lib/admin/shipment-actions";

/**
 * Admin shipment panel — ADR 0020 (TMS route).
 *
 * KSA/the TMS books the shipment with PostNord at checkout. We do NOT
 * book here (that would double-book). This panel:
 *   - shows the customer-selected delivery + tracking, read-only;
 *   - "Skriv ut fraktsedel" pulls the PostNord fraktsedel PDF for the
 *     existing item id (the tracking number) and links it;
 *   - "Markera som skickad" flips PAID → FULFILLED (warehouse step).
 *
 * The label may already be present (pre-fetched on order-paid) — then
 * we just show the link. Stub mode (no POSTNORD_API_KEY) yields no
 * label; the panel says so instead of offering a dead button.
 */
export function ShipmentControls({
  orderId,
  status,
  trackingNumber,
  labelPdfUrl,
  carrier,
  servicePointId,
}: {
  orderId: string;
  orderNumber: string;
  status: string;
  trackingNumber: string | null;
  labelPdfUrl: string | null;
  carrier: string | null;
  servicePointId: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function dispatch(
    action: () => Promise<{ ok: boolean; error?: string }>
  ) {
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

  // Nothing to show until the order is paid (KSA hasn't booked before that).
  if (status !== "PAID" && status !== "FULFILLED" && !trackingNumber) {
    return null;
  }

  const stubTracking = trackingNumber?.startsWith("STUB-") ?? false;
  const deliveryLabel = servicePointId
    ? `Hämtas hos ombud · ${servicePointId}`
    : "Hemleverans / postlåda";

  return (
    <section className="mt-12 pt-8 border-t border-border">
      <p className="font-sans text-[11px] uppercase tracking-[0.16em] text-ink-soft font-semibold mb-4">
        Frakt
      </p>

      <div className="bg-surface-alt border border-border rounded-xl p-5 mb-4 space-y-2">
        <p className="font-display text-base font-medium text-primary-deep">
          {deliveryLabel}
        </p>
        <p className="font-sans text-[13px] text-ink-mute">
          {carrier ?? "PostNord"}
          {trackingNumber ? (
            <>
              {" · "}
              <code className="font-mono text-[12.5px]">
                {trackingNumber}
              </code>
            </>
          ) : (
            " · väntar på spårningsnummer från PostNord"
          )}
        </p>
        {labelPdfUrl ? (
          <a
            href={labelPdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block font-sans text-[13px] font-semibold text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent"
          >
            Öppna fraktsedel (PDF) ↗
          </a>
        ) : stubTracking ? (
          <p className="font-sans text-[12.5px] text-ink-mute">
            Testförsändelse — ingen fraktsedel (PostNord-nyckel saknas).
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3">
        {!labelPdfUrl && trackingNumber && !stubTracking && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => dispatch(() => printOrderLabel({ orderId }))}
            disabled={pending}
          >
            {pending ? "Hämtar…" : "Skriv ut fraktsedel"}
          </Button>
        )}
        {status === "PAID" && (
          <Button
            type="button"
            onClick={() => dispatch(() => markFulfilled({ orderId }))}
            disabled={pending}
          >
            Markera som skickad
          </Button>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 font-sans text-[12.5px] text-status-error"
        >
          {error}
        </p>
      )}
    </section>
  );
}
