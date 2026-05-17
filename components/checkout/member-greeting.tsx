"use client";

import { useEffect, useState } from "react";
import {
  LOYALTY_PROGRAM_NAME,
  MIN_REDEMPTION_POINTS,
} from "@/lib/loyalty/constants";
import { getMyLoyaltyBalance } from "@/lib/loyalty/actions";

/**
 * Loyalty hero band above the checkout (prototype "MemberStrip").
 * Cream, full-width. Logged-in + has redeemable balance only — else
 * renders nothing (no empty/anonymous band). "Använd poäng nedan"
 * scrolls to the redemption widget (#loyalty-redeem).
 */
export function MemberGreeting({
  firstName,
}: {
  firstName?: string | null;
}) {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await getMyLoyaltyBalance();
      if (alive) setBalance(res?.balance ?? 0);
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (balance === null || balance < MIN_REDEMPTION_POINTS) return null;

  const name = firstName?.trim();

  return (
    <div className="mb-8 rounded-2xl bg-surface-warm border border-accent/20 px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3.5">
        <span className="w-9 h-9 rounded-full bg-accent text-white grid place-items-center font-display text-[15px] font-bold flex-shrink-0">
          B
        </span>
        <div>
          <p className="font-sans text-[11px] uppercase tracking-[0.16em] font-semibold text-accent-deep">
            {LOYALTY_PROGRAM_NAME}
          </p>
          <p className="mt-1 font-display text-[20px] md:text-[22px] font-medium tracking-tight text-primary-deep leading-tight">
            {name ? `Hej ${name} — ` : "Hej — "}du har{" "}
            <span className="tabular-nums">
              {balance.toLocaleString("sv-SE")}
            </span>{" "}
            poäng att lösa in
          </p>
        </div>
      </div>
      <a
        href="#loyalty-redeem"
        className="font-sans text-[13px] font-semibold text-primary-deep border border-border rounded-full px-4 py-2 hover:bg-surface-alt transition-colors whitespace-nowrap"
      >
        Använd poäng nedan ↓
      </a>
    </div>
  );
}
