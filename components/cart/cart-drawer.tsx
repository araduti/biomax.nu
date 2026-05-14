"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  useCart,
  selectCartCount,
  selectCartSubtotal,
  selectBundleSavings,
} from "@/lib/cart-store";
import { Display, Eyebrow } from "@/components/ui/typography";
import { ButtonLink } from "@/components/ui/button";
import { formatPriceSEK } from "@/lib/format";
import { useShippingConfig } from "@/lib/site/shipping-config-context";
import { CartLine } from "./cart-line";
import { CartBundleGroup, groupCartItems } from "./cart-bundle-group";
import { CartCrossSells } from "./cart-cross-sells";
import { LoyaltyEarnPreview } from "./loyalty-earn-preview";

/**
 * Slide-out cart, anchored to the right side of the viewport.
 * Opens via useCart().open() — most commonly triggered by add-to-cart
 * buttons. Closes via Escape, click on the scrim, or the close button.
 */
export function CartDrawer() {
  const isOpen = useCart((s) => s.isOpen);
  const close = useCart((s) => s.close);
  const items = useCart((s) => s.items);
  const count = useCart(selectCartCount);
  const subtotal = useCart(selectCartSubtotal);
  const bundleSavings = useCart(selectBundleSavings);
  const hydrated = useCart((s) => s.hydrated);
  const { freeThresholdSek } = useShippingConfig();

  // Lock background scroll while open + close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, close]);

  // freeThresholdSek can be null (= "never free") — meter hides in that case.
  const freeShipThreshold = freeThresholdSek ?? Infinity;
  const remainingForFreeShip = Math.max(0, freeShipThreshold - subtotal);
  const showFreeShipMeter =
    freeThresholdSek !== null && subtotal > 0 && remainingForFreeShip > 0;

  return (
    <>
      {/* Scrim */}
      <div
        aria-hidden={!isOpen}
        onClick={close}
        className={`fixed inset-0 z-40 bg-primary-deep/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />
      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-heading"
        aria-hidden={!isOpen}
        className={`fixed top-0 right-0 z-50 h-screen w-full sm:w-[440px] bg-surface-alt shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <Eyebrow>Varukorg</Eyebrow>
            <h2
              id="cart-drawer-heading"
              className="font-display text-2xl font-medium tracking-tight text-primary-deep mt-1 leading-none"
            >
              {hydrated && count > 0
                ? `${count} ${count === 1 ? "produkt" : "produkter"}`
                : "Din varukorg"}
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Stäng varukorgen"
            className="w-10 h-10 rounded-full hover:bg-surface-warm flex items-center justify-center text-ink-body text-xl leading-none transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        {!hydrated || items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
            <p className="font-display italic text-2xl text-primary-deep mb-3">
              Tom varukorg
            </p>
            <p className="font-sans text-[14px] text-ink-mute max-w-[280px] mb-6 leading-relaxed">
              Lägg till en produkt så ser du den här. Snabb leverans och
              Klarna-betalning vid kassan.
            </p>
            <ButtonLink
              href="/produkter"
              variant="primary"
              size="md"
              onClick={close}
            >
              Utforska produkter
            </ButtonLink>
          </div>
        ) : (
          <>
            {showFreeShipMeter && (
              <div className="px-6 py-3 bg-surface-warm border-b border-border-soft">
                <p className="font-sans text-[12px] text-ink-body">
                  <strong className="font-semibold">
                    {formatPriceSEK(remainingForFreeShip)}
                  </strong>{" "}
                  kvar till fri frakt
                </p>
                <div className="mt-2 h-1.5 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all"
                    style={{
                      width: `${Math.min(100, (subtotal / freeShipThreshold) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
            {!showFreeShipMeter &&
              freeThresholdSek !== null &&
              subtotal >= freeThresholdSek && (
              <div className="px-6 py-3 bg-accent/15 border-b border-border-soft">
                <p className="font-sans text-[13px] text-accent-deep font-semibold">
                  ✓ Du har fri frakt
                </p>
              </div>
            )}

            <ul className="flex-1 overflow-y-auto px-6">
              {groupCartItems(items).map((group) =>
                group.kind === "line" ? (
                  <CartLine
                    key={`${group.item.productId}::${group.item.variantId ?? ""}::${group.item.bundleId ?? ""}`}
                    item={group.item}
                    onNavigate={close}
                  />
                ) : (
                  <CartBundleGroup
                    key={group.bundleId}
                    bundleId={group.bundleId}
                    lines={group.lines}
                    onNavigate={close}
                  />
                )
              )}
            </ul>

            <CartCrossSells variant="drawer" onNavigate={close} />

            {/* Footer */}
            <div className="border-t border-border px-6 py-5 bg-surface">
              <div className="flex items-baseline justify-between mb-1">
                <span className="font-sans text-[13px] uppercase tracking-[0.2em] text-ink-mute font-semibold">
                  Delsumma
                </span>
                <Display size="sm" as="span">
                  {formatPriceSEK(subtotal)}
                </Display>
              </div>
              {bundleSavings > 0 && (
                <p className="font-sans text-[12px] text-accent-deep font-semibold mb-1">
                  Inkluderar paketrabatt {formatPriceSEK(bundleSavings)}
                </p>
              )}
              <LoyaltyEarnPreview subtotalKr={subtotal} variant="drawer" />
              <p className="font-sans text-[12px] text-ink-soft mb-5">
                Frakt och eventuella rabatter beräknas i kassan.
              </p>
              <ButtonLink
                href="/checkout"
                variant="primary"
                size="lg"
                className="w-full"
                onClick={close}
              >
                Gå till kassan
              </ButtonLink>
              <Link
                href="/varukorg"
                onClick={close}
                className="block text-center mt-3 font-sans text-[13px] text-primary hover:text-primary-deep transition-colors"
              >
                Visa hela varukorgen
              </Link>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
