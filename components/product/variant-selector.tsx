"use client";

import { useState } from "react";
import { BuyOptionsPanel } from "@/components/product/buy-options-panel";
import { formatPriceSEK } from "@/lib/format";
import { KlarnaInstallment } from "@/components/product/klarna-installment";
import type { PublicVariant } from "@/lib/products/variants";

/**
 * Owns the variant-radio UI + the displayed price/stock + the add-to-cart
 * button. Lives inside the product hero — by being one client component
 * instead of three, the variant selection state stays local without
 * needing a context for the cart button to read.
 *
 * The hero stays a Server Component (for SEO copy + JSON-LD); only this
 * subtree is client.
 */
export function VariantSelector({
  productId,
  productSlug,
  productName,
  productImageUrl,
  variants,
  defaultVariantId,
  freeShipLabel,
  loggedIn = false,
  inRoutine = false,
}: {
  productId: string;
  productSlug: string;
  productName: string;
  productImageUrl: string;
  variants: PublicVariant[];
  defaultVariantId: string;
  freeShipLabel: string | null;
  /** Whether the viewer has a session. Gates the subscribe-toggle CTA. */
  loggedIn?: boolean;
  /** Whether the parent product is already in the viewer's routine. */
  inRoutine?: boolean;
}) {
  const [selectedId, setSelectedId] = useState(defaultVariantId);
  const selected = variants.find((v) => v.id === selectedId) ?? variants[0];
  const onSale =
    selected.compareAtPrice &&
    parseFloat(selected.compareAtPrice) > parseFloat(selected.price);

  return (
    <div>
      {/* Variant radios — pill toggles */}
      <div className="mt-6 mb-2">
        <p className="font-sans text-[11px] uppercase tracking-[0.2em] font-semibold text-ink-soft mb-2.5">
          Storlek
        </p>
        <div
          role="radiogroup"
          aria-label="Storlek"
          className="flex flex-wrap gap-2"
        >
          {variants.map((v) => {
            const active = v.id === selectedId;
            const oos = !v.inStock;
            return (
              <button
                key={v.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelectedId(v.id)}
                className={
                  "px-4 py-2 rounded-full border font-sans text-[13.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 " +
                  (active
                    ? "bg-primary-deep text-surface border-primary-deep"
                    : "bg-surface text-ink-body border-border hover:border-border-soft hover:bg-surface-warm") +
                  (oos ? " opacity-50" : "")
                }
              >
                {v.label}
                {oos && (
                  <span className="ml-1.5 text-[10.5px] uppercase tracking-[0.14em]">
                    · slut
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price */}
      <div className="mt-5 flex items-baseline gap-4">
        <span className="font-display text-4xl font-medium tracking-tight text-primary-deep">
          {formatPriceSEK(selected.price)}
        </span>
        {onSale && selected.compareAtPrice && (
          <span className="font-sans text-base text-ink-soft line-through">
            {formatPriceSEK(selected.compareAtPrice)}
          </span>
        )}
      </div>
      <p className="mt-2 font-sans text-[13px] text-ink-mute">
        Inkl. moms{freeShipLabel ? ` · ${freeShipLabel}` : ""}
      </p>

      <KlarnaInstallment priceSek={parseFloat(selected.price)} />

      {/* Stock signal */}
      <p
        className={`mt-3 font-sans text-[13px] flex items-center gap-2 ${
          selected.inStock ? "text-accent-deep" : "text-ink-soft"
        }`}
      >
        <span
          aria-hidden
          className={`w-1.5 h-1.5 rounded-full ${
            selected.inStock ? "bg-accent" : "bg-ink-soft"
          }`}
        />
        {selected.inStock
          ? "I lager · Skickas inom 1–2 arbetsdagar"
          : "Tillfälligt slut"}
      </p>

      <div className="mt-8">
        {selected.inStock ? (
          <BuyOptionsPanel
            product={{
              id: productId,
              slug: productSlug,
              name: productName,
              imageUrl: productImageUrl,
            }}
            variantId={selected.id}
            variantLabel={selected.label}
            unitPrice={selected.price}
            loggedIn={loggedIn}
            inRoutine={inRoutine}
          />
        ) : (
          /* Out-of-stock variant: defer to NotifyMe on the parent hero
             rendering path. The parent hero renders this entire selector
             only when at least one variant is in stock; when the selected
             variant is OOS, show inline text. */
          <p className="font-sans text-[14px] text-ink-mute italic">
            Den här storleken är slut just nu — välj en annan eller bevaka
            i listan ovan.
          </p>
        )}
      </div>
    </div>
  );
}
