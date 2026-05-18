"use client";

import { useCart, type CartItem } from "@/lib/cart-store";
import { formatPriceSEK } from "@/lib/format";
import { CartLine } from "./cart-line";

/**
 * Renders a set of cart lines that all belong to the same bundle, with
 * a bundle header (name + discount badge) and a per-bundle savings line.
 * Item-level quantity controls still work — the discount is applied at
 * subtotal time, so editing one line still re-prices the whole bundle
 * group correctly.
 *
 * A "Ta bort paket" button removes every line in the bundle in one go.
 */
export function CartBundleGroup({
  bundleId,
  lines,
  variant = "drawer",
  onNavigate,
}: {
  bundleId: string;
  lines: CartItem[];
  variant?: "drawer" | "page";
  onNavigate?: () => void;
}) {
  const removeBundle = useCart((s) => s.removeBundle);
  if (lines.length === 0) return null;
  const first = lines[0];

  const listTotal = lines.reduce(
    (s, l) => s + parseFloat(l.price) * l.quantity,
    0
  );
  const discountPct = first.bundleDiscountPercent ?? 0;
  const savings = listTotal * (discountPct / 100);

  return (
    <li className="py-3 my-3 first:mt-0 -mx-2 px-2 rounded-xl bg-accent/[0.06] border border-accent/15">
      <header className="flex items-baseline justify-between gap-3 mb-1 px-1">
        <div className="min-w-0">
          <p className="font-sans text-micro uppercase tracking-[0.18em] font-semibold text-accent-deep">
            Paket · {discountPct} % rabatt
          </p>
          <p className="font-display text-body-lg md:text-base font-medium text-primary-deep mt-0.5 leading-tight truncate">
            {first.bundleName}
          </p>
        </div>
        <button
          type="button"
          onClick={() => removeBundle(bundleId)}
          className="font-sans text-micro text-ink-soft hover:text-status-error transition-colors flex-shrink-0"
        >
          Ta bort paket
        </button>
      </header>
      <ul className="px-1">
        {lines.map((item) => (
          <CartLine
            key={`${item.productId}::${item.variantId ?? ""}::${item.bundleId ?? ""}`}
            item={item}
            variant={variant}
            onNavigate={onNavigate}
          />
        ))}
      </ul>
      {savings > 0 && (
        <p className="px-1 pt-2 font-sans text-caption text-accent-deep font-semibold">
          Du sparar {formatPriceSEK(savings)} på paketet
        </p>
      )}
    </li>
  );
}

/**
 * Split cart items into standalone lines + bundle groups in original
 * insertion order. The first occurrence of a bundle anchors the group's
 * position so removing one line doesn't reshuffle the cart.
 */
export function groupCartItems(items: CartItem[]): Array<
  | { kind: "line"; item: CartItem }
  | { kind: "bundle"; bundleId: string; lines: CartItem[] }
> {
  const result: Array<
    | { kind: "line"; item: CartItem }
    | { kind: "bundle"; bundleId: string; lines: CartItem[] }
  > = [];
  const seenBundles = new Set<string>();
  for (const it of items) {
    if (!it.bundleId) {
      result.push({ kind: "line", item: it });
      continue;
    }
    if (seenBundles.has(it.bundleId)) continue;
    seenBundles.add(it.bundleId);
    const lines = items.filter((x) => x.bundleId === it.bundleId);
    result.push({ kind: "bundle", bundleId: it.bundleId, lines });
  }
  return result;
}
