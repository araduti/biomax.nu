"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LOYALTY_PROGRAM_NAME,
  pointsFromKr,
  pointsToKr,
} from "@/lib/loyalty/constants";
import { formatPriceSEK } from "@/lib/format";
import { getMyLoyaltyBalance } from "@/lib/loyalty/actions";

type Props = {
  /** Cart subtotal in kr — drives the projected earn. */
  subtotalKr: number;
  /** Layout density — `drawer` is compact for the cart-drawer footer. */
  variant?: "drawer" | "page";
};

/**
 * "Du tjänar X poäng på denna order"-strip.
 *
 * Renders three states:
 *  1. Guest → "Bli medlem och tjäna X poäng" with link to /skapa-konto
 *     (the auto-enroll on signup means just creating the account is
 *     enough — no separate join step).
 *  2. Member → "Du tjänar X poäng (Y kr värde)" — quiet, factual.
 *  3. Loading or zero subtotal → nothing.
 *
 * Fetches balance once on mount via the server action. We don't show
 * the actual balance here (that's on /konto and the checkout sidebar)
 * — this surface is pure earn-preview, optimised for the
 * pre-checkout moment.
 */
export function LoyaltyEarnPreview({
  subtotalKr,
  variant = "page",
}: Props) {
  const [member, setMember] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await getMyLoyaltyBalance();
        if (alive) setMember(res !== null);
      } catch {
        if (alive) setMember(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (member === null) return null;
  if (subtotalKr <= 0) return null;

  const points = pointsFromKr(subtotalKr);
  if (points <= 0) return null;

  const valueLabel = formatPriceSEK(pointsToKr(points));

  if (variant === "drawer") {
    return (
      <p className="font-sans text-caption text-accent-deep font-semibold mb-1">
        {member ? (
          <>
            ✦ Du tjänar {points.toLocaleString("sv-SE")} poäng på denna order
          </>
        ) : (
          <>
            ✦{" "}
            <Link
              href="/skapa-konto"
              className="underline decoration-accent/40 underline-offset-[2px] hover:decoration-accent"
            >
              Bli medlem
            </Link>{" "}
            och tjäna {points.toLocaleString("sv-SE")} poäng på den här ordern
          </>
        )}
      </p>
    );
  }

  // page variant — used on /varukorg next to totals
  return (
    <div className="bg-surface-warm border border-accent/30 rounded-xl px-4 py-3">
      <p className="font-sans text-small text-primary-deep">
        <span className="font-semibold text-accent-deep">✦</span>{" "}
        {member ? (
          <>
            Du tjänar{" "}
            <strong className="font-semibold">
              {points.toLocaleString("sv-SE")} poäng
            </strong>{" "}
            i {LOYALTY_PROGRAM_NAME} på den här ordern ({valueLabel} värde).
          </>
        ) : (
          <>
            <Link
              href="/skapa-konto"
              className="font-semibold text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent"
            >
              Skapa konto
            </Link>{" "}
            och tjäna {points.toLocaleString("sv-SE")} poäng i{" "}
            {LOYALTY_PROGRAM_NAME} på den här ordern ({valueLabel} värde).
          </>
        )}
      </p>
    </div>
  );
}
