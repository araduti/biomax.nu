"use client";

import { useEffect, useState } from "react";
import { estimateDelivery, formatEta, type DeliveryEta } from "@/lib/shipping/eta";

/**
 * Inline delivery-ETA chip rendered next to the buy CTA.
 *
 * Client component because:
 *   - The "ships in X minutes" countdown ticks down per minute, which
 *     requires `new Date()` on the client (cached server renders would
 *     freeze the value at build time).
 *   - The visible label needs to match the *customer's* current moment,
 *     not the server's.
 *
 * Recomputes once a minute. No state besides the ETA itself.
 */
export function DeliveryEtaChip() {
  const [eta, setEta] = useState<DeliveryEta | null>(null);

  useEffect(() => {
    setEta(estimateDelivery(new Date()));
    const id = setInterval(() => setEta(estimateDelivery(new Date())), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!eta) {
    // Pre-hydration placeholder — keeps layout stable. Reads as a
    // generic "fast delivery"-line that survives if JS doesn't run.
    return (
      <p className="mt-3 font-sans text-[13px] text-ink-mute flex items-center gap-2">
        <DotIndicator />
        Leverans inom 1–3 arbetsdagar
      </p>
    );
  }

  const arrivalLabel = formatEta(eta);

  return (
    <p className="mt-3 font-sans text-[13px] text-ink-body leading-relaxed flex items-start gap-2">
      <DotIndicator />
      <span>
        {eta.shipsToday && eta.minutesToCutoff !== null && eta.minutesToCutoff > 0 ? (
          <>
            Beställ inom{" "}
            <strong className="text-primary-deep">
              {formatCountdown(eta.minutesToCutoff)}
            </strong>{" "}
            — skickas idag, leverans{" "}
            <strong className="text-primary-deep">{arrivalLabel}</strong>
          </>
        ) : (
          <>
            Leverans{" "}
            <strong className="text-primary-deep">{arrivalLabel}</strong>
          </>
        )}
      </span>
    </p>
  );
}

function DotIndicator() {
  return (
    <span
      aria-hidden
      className="w-1.5 h-1.5 rounded-full bg-accent-deep mt-1.5 flex-shrink-0"
    />
  );
}

function formatCountdown(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (m === 0) return `${h} h`;
    return `${h} h ${m} min`;
  }
  return `${minutes} min`;
}
