"use client";

import { useEffect, useState } from "react";
import {
  LOYALTY_PROGRAM_NAME,
  MIN_REDEMPTION_POINTS,
  ORE_PER_POINT,
  pointsToKr,
} from "@/lib/loyalty/constants";
import { formatPriceSEK } from "@/lib/format";
import { getMyLoyaltyBalance } from "@/lib/loyalty/actions";

type Props = {
  /** Cart subtotal in kr (server prices). The redeemable cap. */
  subtotalKr: number;
  /** Current redemption choice (controlled by parent). */
  value: number;
  /** Setter — parent passes to placeOrder. */
  onChange: (points: number) => void;
};

/**
 * Inline Familjen Biomax redemption control on /checkout.
 *
 * Behaviour
 * ─────────
 * • Pulls the balance once on mount via server action (no caching layer
 *   for v1 — the request is cheap and rarely re-rendered).
 * • Hidden entirely for guests, users with no account, or balances
 *   below `MIN_REDEMPTION_POINTS`. The checkout sidebar should stay
 *   uncluttered for first-time customers.
 * • Snaps the user's input to multiples of MIN_REDEMPTION_POINTS and
 *   clamps to the lesser of (balance, cart-points-cap).
 * • Two quick-picks: "Använd allt" + "Max för denna order" — covers
 *   the two intents we see in practice.
 *
 * The "value" / "onChange" pair lives in the parent (CheckoutFlow) so
 * the final number submits with the placeOrder call. Server validates
 * one more time before applying; the client is just convenience.
 */
export function LoyaltyRedeem({ subtotalKr, value, onChange }: Props) {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await getMyLoyaltyBalance();
        if (alive) setBalance(res?.balance ?? 0);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Hidden until we know we have something to show.
  if (loading) return null;
  if (balance === null) return null; // not logged in
  if (balance < MIN_REDEMPTION_POINTS) return null;

  // Cap: balance OR however many points fit under the subtotal,
  // whichever is smaller. Snap down to a multiple of MIN.
  const subtotalOre = Math.round(subtotalKr * 100);
  const pointsThatFit =
    Math.floor(subtotalOre / ORE_PER_POINT / MIN_REDEMPTION_POINTS) *
    MIN_REDEMPTION_POINTS;
  const cap = Math.min(
    Math.floor(balance / MIN_REDEMPTION_POINTS) * MIN_REDEMPTION_POINTS,
    pointsThatFit
  );

  const applyDiscountKr = pointsToKr(value);

  function snap(raw: number) {
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    const snapped =
      Math.floor(raw / MIN_REDEMPTION_POINTS) * MIN_REDEMPTION_POINTS;
    return Math.min(Math.max(snapped, 0), cap);
  }

  return (
    <section className="mb-6 bg-surface-warm border border-accent/30 rounded-2xl p-5">
      <div className="flex items-baseline justify-between mb-2 gap-3 flex-wrap">
        <p className="font-display text-[16px] font-medium tracking-tight text-primary-deep">
          {LOYALTY_PROGRAM_NAME}
        </p>
        <p className="font-sans text-[12.5px] text-ink-mute">
          Du har{" "}
          <strong className="font-semibold text-primary-deep">
            {balance.toLocaleString("sv-SE")} poäng
          </strong>{" "}
          ({formatPriceSEK(pointsToKr(balance))})
        </p>
      </div>

      <p className="font-sans text-[13px] text-ink-mute mb-3 leading-relaxed">
        {MIN_REDEMPTION_POINTS} poäng ={" "}
        {formatPriceSEK((MIN_REDEMPTION_POINTS * ORE_PER_POINT) / 100)} rabatt.
        Lös in i steg om {MIN_REDEMPTION_POINTS}.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor="loyalty-points-input"
          className="font-sans text-[13px] text-ink-body whitespace-nowrap"
        >
          Använd
        </label>
        <input
          id="loyalty-points-input"
          type="number"
          inputMode="numeric"
          min={0}
          max={cap}
          step={MIN_REDEMPTION_POINTS}
          value={value || ""}
          placeholder="0"
          onChange={(e) => onChange(snap(Number(e.target.value)))}
          className="h-11 w-[120px] px-3 rounded-lg border border-border bg-surface font-sans text-[15px] text-ink tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
        <span className="font-sans text-[13px] text-ink-body">poäng</span>
        <button
          type="button"
          onClick={() => onChange(cap)}
          className="h-11 px-3 rounded-lg border border-border bg-surface font-sans text-[13px] font-semibold text-primary-deep hover:bg-surface-warm transition-colors"
        >
          Max ({cap.toLocaleString("sv-SE")})
        </button>
        {value > 0 && (
          <button
            type="button"
            onClick={() => onChange(0)}
            className="h-11 px-3 font-sans text-[13px] text-ink-mute hover:text-ink-body underline decoration-ink-mute/40 underline-offset-[3px]"
          >
            Rensa
          </button>
        )}
      </div>

      {value > 0 && (
        <p className="mt-3 font-sans text-[13.5px] text-accent-deep font-semibold">
          ↓ Rabatt: −{formatPriceSEK(applyDiscountKr)}
        </p>
      )}
    </section>
  );
}
