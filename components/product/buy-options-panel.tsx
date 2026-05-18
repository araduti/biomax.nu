"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { Button } from "@/components/ui/button";
import { RoutineToggleButton } from "@/components/product/routine-toggle-button";
import { DeliveryEtaChip } from "@/components/product/delivery-eta";
import {
  SUBSCRIPTION_INTERVAL_DAYS,
  DEFAULT_SUBSCRIPTION_INTERVAL_DAYS,
  DEFAULT_SUBSCRIPTION_DISCOUNT_PERCENT,
  intervalLabelSwedish,
  type SubscriptionIntervalDays,
} from "@/lib/subscriptions/constants";
import { formatPriceSEK } from "@/lib/format";

/**
 * Buy-options panel — one-time purchase vs subscription toggle on the
 * product page. Mirrors what Apotea / Bodystore / Holistic do: a single
 * choice point with a price for each branch and a clear discount badge.
 *
 * Choosing "Prenumerera" routes to the first-delivery checkout
 * (/prenumerera/kassa); the subscription is created only once that
 * payment settles. Guests are sent to /logga-in with a `next` redirect
 * back to that checkout so they return to the right place after login.
 *
 * Variants: if the product has variants, the caller passes the selected
 * variant's id, label, and price. For variantless products, pass
 * variantId=null and use the product's price.
 */
export function BuyOptionsPanel({
  product,
  variantId,
  variantLabel,
  unitPrice,
  loggedIn,
  inRoutine = false,
}: {
  product: {
    id: string;
    slug: string;
    name: string;
    imageUrl: string;
  };
  variantId: string | null;
  variantLabel: string | null;
  /** Decimal-as-string, the same shape the cart store uses. */
  unitPrice: string;
  loggedIn: boolean;
  /** Whether the product is already in the viewer's routine. Drives the
   *  toggle button's initial state without a client round-trip. */
  inRoutine?: boolean;
}) {
  const [mode, setMode] = useState<"once" | "subscribe">("once");
  const [interval, setInterval] = useState<SubscriptionIntervalDays>(
    DEFAULT_SUBSCRIPTION_INTERVAL_DAYS
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const priceNumber = parseFloat(unitPrice);
  const discounted =
    priceNumber * (1 - DEFAULT_SUBSCRIPTION_DISCOUNT_PERCENT / 100);

  function onSubscribe() {
    setError(null);
    const target = `/prenumerera/kassa?productId=${product.id}${
      variantId ? `&variantId=${variantId}` : ""
    }&interval=${interval}`;
    if (!loggedIn) {
      router.push(`/logga-in?next=${encodeURIComponent(target)}`);
      return;
    }
    // Route through the first-delivery checkout. The subscription is
    // created only once that payment settles — never here.
    start(() => {
      router.push(target);
    });
  }

  return (
    <div>
      {/* Mode toggle */}
      <div
        role="radiogroup"
        aria-label="Köpval"
        className="inline-flex p-1 rounded-full bg-surface-warm border border-border"
      >
        <button
          type="button"
          role="radio"
          aria-checked={mode === "once"}
          onClick={() => setMode("once")}
          className={`px-4 py-1.5 rounded-full font-sans text-small font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
            mode === "once"
              ? "bg-surface text-primary-deep shadow-sm"
              : "text-ink-mute hover:text-ink-body"
          }`}
        >
          Köp en gång
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={mode === "subscribe"}
          onClick={() => setMode("subscribe")}
          className={`px-4 py-1.5 rounded-full font-sans text-small font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
            mode === "subscribe"
              ? "bg-surface text-primary-deep shadow-sm"
              : "text-ink-mute hover:text-ink-body"
          }`}
        >
          Prenumerera{" "}
          <span className="text-accent-deep">
            −{DEFAULT_SUBSCRIPTION_DISCOUNT_PERCENT} %
          </span>
        </button>
      </div>

      {mode === "subscribe" && (
        <div className="mt-4 p-4 rounded-2xl bg-accent/[0.06] border border-accent/15">
          <p className="font-sans text-small text-ink-body">
            <strong className="font-semibold text-primary-deep">
              {formatPriceSEK(discounted)}
            </strong>{" "}
            <span className="text-ink-soft line-through">
              {formatPriceSEK(priceNumber)}
            </span>{" "}
            per leverans · avsluta när du vill, utan kostnad.
          </p>
          <div className="mt-3">
            <p className="font-sans text-micro uppercase tracking-[0.18em] font-semibold text-ink-soft mb-1.5">
              Leveransintervall
            </p>
            <div role="radiogroup" aria-label="Intervall" className="flex flex-wrap gap-2">
              {SUBSCRIPTION_INTERVAL_DAYS.map((d) => {
                const active = interval === d;
                return (
                  <button
                    key={d}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setInterval(d)}
                    className={`px-3.5 py-1.5 rounded-full border font-sans text-caption font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                      active
                        ? "bg-primary-deep text-surface border-primary-deep"
                        : "bg-surface text-ink-body border-border hover:border-border-soft hover:bg-surface-warm"
                    }`}
                  >
                    {intervalLabelSwedish(d)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="mt-5 flex flex-wrap gap-3">
        {mode === "once" ? (
          <AddToCartButton
            product={{
              id: product.id,
              slug: product.slug,
              name: variantLabel ? `${product.name} — ${variantLabel}` : product.name,
              imageUrl: product.imageUrl,
              price: unitPrice,
            }}
            variantId={variantId}
            variantLabel={variantLabel}
            size="lg"
            className="min-w-[220px]"
          />
        ) : (
          <Button
            type="button"
            size="lg"
            onClick={onSubscribe}
            disabled={pending}
            className="min-w-[220px]"
          >
            {pending
              ? "Öppnar kassan…"
              : loggedIn
                ? `Prenumerera och spara ${DEFAULT_SUBSCRIPTION_DISCOUNT_PERCENT} %`
                : "Logga in för att prenumerera"}
          </Button>
        )}
        <RoutineToggleButton
          productId={product.id}
          productSlug={product.slug}
          initiallySaved={inRoutine}
          loggedIn={loggedIn}
          size="lg"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 font-sans text-caption text-status-error bg-status-error/10 px-3 py-2 rounded-md inline-block"
        >
          {error}
        </p>
      )}

      {/* Delivery ETA — same-day-ship countdown when applicable, otherwise
          a date window. Apotea/Bodystore pattern; sits just above the
          guarantee line so the customer reads ETA → guarantee → submit. */}
      <DeliveryEtaChip />

      {/* Risk-reducer below CTA. Says what's true (30 dagars öppet köp =
          14 dagars lagstadgad ångerrätt + 14 dagars frivilligt — see
          /villkor) without misleading framing. The earlier copy said
          "Första gången-garanti" which implied a first-buyer-only perk;
          this offer applies to every order. */}
      <p className="mt-5 flex items-start gap-2 font-sans text-caption text-ink-mute leading-snug">
        <span aria-hidden className="text-accent-deep">✓</span>
        <span>
          <strong className="font-semibold text-primary-deep">
            30 dagars öppet köp
          </strong>{" "}
          — fri retur på obrutna förpackningar.{" "}
          <Link
            href="/frakt-och-retur"
            className="underline decoration-ink-mute/35 underline-offset-[3px] hover:decoration-ink-body"
          >
            Läs mer
          </Link>
        </span>
      </p>
    </div>
  );
}
