"use client";

import { useEffect, useState } from "react";
import {
  LOYALTY_PROGRAM_NAME,
  MIN_REDEMPTION_POINTS,
  ORE_PER_POINT,
  pointsToKr,
  pointsFromKr,
} from "@/lib/loyalty/constants";
import { formatPriceSEK } from "@/lib/format";
import { getMyLoyaltyBalance } from "@/lib/loyalty/actions";

type Props = {
  /** Cart subtotal in kr (server prices). The redeemable cap. */
  subtotalKr: number;
  /** Current redemption choice (controlled by parent). */
  value: number;
  /** Setter — parent debounces + syncs into the Kustom order
   *  (suspend → update → resume). This stays a pure controlled input. */
  onChange: (points: number) => void;
};

/**
 * Familjen Biomax redemption — the "slider" pattern from the checkout
 * design exploration (the chosen winner), built pixel-faithfully on
 * the project design tokens (ADR 0007), not the prototype's `--amber`
 * palette. Drag-to-redeem with a live discount preview; no apply
 * button (the parent debounces and syncs into Kustom in place).
 *
 * Hidden for guests / unknown balance. Below the redemption minimum we
 * show the earn-back empty state instead of nothing.
 */
const THUMB_CSS = `
.bx-range{appearance:none;-webkit-appearance:none;width:100%;height:28px;background:transparent;margin:0;position:relative;z-index:1;cursor:pointer;}
.bx-range::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;width:24px;height:24px;border-radius:999px;background:#0F2440;border:3px solid #F4F0E8;box-shadow:0 1px 3px rgba(10,10,10,.25);cursor:grab;margin-top:0;}
.bx-range::-moz-range-thumb{width:24px;height:24px;border-radius:999px;background:#0F2440;border:3px solid #F4F0E8;box-shadow:0 1px 3px rgba(10,10,10,.25);cursor:grab;}
.bx-range::-webkit-slider-runnable-track{background:transparent;height:28px;}
.bx-range::-moz-range-track{background:transparent;height:28px;}
.bx-range:focus-visible{outline:2px solid var(--color-primary);outline-offset:4px;border-radius:999px;}
`;

function Badge() {
  return (
    <span className="w-[22px] h-[22px] rounded-full bg-accent text-white grid place-items-center font-display text-caption font-bold">
      B
    </span>
  );
}

function Shell({
  balance,
  applied,
  children,
  footer,
}: {
  balance: number;
  applied: number;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <section className="rounded-[14px] bg-surface-warm border border-border px-[18px] py-4 overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge />
            <span className="font-sans text-micro uppercase tracking-[0.16em] font-semibold text-accent-deep">
              {LOYALTY_PROGRAM_NAME}
            </span>
          </div>
          <p className="mt-2 font-display text-[18px] font-medium tracking-tight text-primary-deep leading-tight">
            Lös in dina poäng
          </p>
        </div>
        <div className="text-right flex-shrink-0 whitespace-nowrap">
          <div className="font-sans text-micro uppercase tracking-[0.04em] text-ink-mute">
            Saldo
          </div>
          <div className="mt-0.5 font-sans text-lead font-semibold tabular-nums text-ink-body">
            {balance.toLocaleString("sv-SE")}{" "}
            <span className="text-ink-mute font-normal text-[0.7em]">
              poäng
            </span>
          </div>
          <div className="mt-0.5 font-sans text-micro text-ink-mute tabular-nums">
            ≈ {formatPriceSEK(pointsToKr(balance))} i rabatt
          </div>
        </div>
      </div>

      <div className="mt-4">{children}</div>

      {applied > 0 && (
        <div className="mt-3.5 px-3 py-2.5 rounded-[8px] bg-primary-deep text-surface flex items-center justify-between text-small whitespace-nowrap">
          <span className="flex items-center gap-2">
            <span aria-hidden>✓</span>
            <span>
              <b className="tabular-nums">
                {applied.toLocaleString("sv-SE")}
              </b>{" "}
              poäng inlösta
            </span>
          </span>
          <span className="font-semibold tabular-nums">
            −{formatPriceSEK(pointsToKr(applied))}
          </span>
        </div>
      )}

      {footer}
    </section>
  );
}

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

  if (loading) return null;
  if (balance === null) return null; // not logged in

  // Below the redemption minimum → earn-back empty state (mock parity).
  if (balance < MIN_REDEMPTION_POINTS) {
    const earn = pointsFromKr(subtotalKr);
    return (
      <section className="rounded-[14px] bg-surface-warm border border-border px-[18px] py-4">
        <div className="flex items-center gap-2">
          <Badge />
          <span className="font-sans text-micro uppercase tracking-[0.16em] font-semibold text-accent-deep">
            {LOYALTY_PROGRAM_NAME}
          </span>
        </div>
        <p className="mt-2 font-display text-[18px] font-medium tracking-tight text-primary-deep leading-tight">
          Du börjar samla poäng på det här köpet
        </p>
        <p className="mt-2 font-sans text-small text-ink-mute leading-relaxed">
          Du får{" "}
          <b className="text-ink-body">
            cirka {earn.toLocaleString("sv-SE")} poäng
          </b>{" "}
          tillbaka — använd dem nästa gång för rabatt direkt i kassan.
        </p>
      </section>
    );
  }

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
  const pct = cap === 0 ? 0 : (value / cap) * 100;

  function snap(raw: number) {
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    const snapped =
      Math.round(raw / MIN_REDEMPTION_POINTS) * MIN_REDEMPTION_POINTS;
    return Math.min(Math.max(snapped, 0), cap);
  }

  return (
    <Shell
      balance={balance}
      applied={value}
      footer={
        <p className="mt-2.5 font-sans text-caption text-ink-mute">
          Dra för att välja. {MIN_REDEMPTION_POINTS} poäng ={" "}
          {formatPriceSEK((MIN_REDEMPTION_POINTS * ORE_PER_POINT) / 100)}{" "}
          rabatt.
        </p>
      }
    >
      <style dangerouslySetInnerHTML={{ __html: THUMB_CSS }} />
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-[32px] font-medium tracking-tight tabular-nums text-primary-deep">
            {value.toLocaleString("sv-SE")}
          </span>
          <span className="font-sans text-small text-ink-mute">poäng</span>
        </div>
        <span className="font-sans text-lead font-semibold tabular-nums text-primary-deep">
          −{formatPriceSEK(pointsToKr(value))}
        </span>
      </div>

      <div className="mt-3 relative">
        <div className="absolute left-0 right-0 top-[11px] h-1.5 rounded-full bg-border" />
        <div
          className="absolute left-0 top-[11px] h-1.5 rounded-full bg-accent"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          className="bx-range"
          min={0}
          max={cap}
          step={MIN_REDEMPTION_POINTS}
          value={value}
          onChange={(e) => onChange(snap(Number(e.target.value)))}
          aria-label="Poäng att lösa in"
          aria-valuetext={`${value} poäng, ${formatPriceSEK(pointsToKr(value))} rabatt`}
        />
      </div>

      <div className="flex justify-between font-sans text-micro text-ink-mute mt-0.5">
        <span>0</span>
        <span className="tabular-nums">
          Max {cap.toLocaleString("sv-SE")}
        </span>
      </div>
    </Shell>
  );
}
