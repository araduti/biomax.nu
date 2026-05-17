"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart, type CartItem } from "@/lib/cart-store";
import { formatPriceSEK } from "@/lib/format";

/**
 * One row in the cart drawer or full cart page.
 * Quantity controls are inline; a remove icon kills the line.
 */
export function CartLine({
  item,
  variant = "drawer",
  onNavigate,
}: {
  item: CartItem;
  variant?: "drawer" | "page";
  /** Called when user clicks the product link (e.g. to close the drawer). */
  onNavigate?: () => void;
}) {
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const subtotal = parseFloat(item.price) * item.quantity;

  return (
    <li
      className={
        variant === "drawer"
          ? "flex gap-4 py-5 border-b border-border last:border-0"
          : "flex gap-6 py-7 border-b border-border last:border-0"
      }
    >
      <Link
        href={`/produkter/${item.slug}`}
        onClick={onNavigate}
        className={
          variant === "drawer"
            ? "relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-surface-warm"
            : "relative w-28 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-surface-warm"
        }
      >
        <Image
          src={item.imageUrl || "/products/_placeholder.svg"}
          alt={item.name}
          fill
          sizes={variant === "drawer" ? "80px" : "112px"}
          quality={85}
          className="object-cover mix-blend-darken"
        />
      </Link>

      <div className="flex-1 min-w-0 flex flex-col">
        <Link
          href={`/produkter/${item.slug}`}
          onClick={onNavigate}
          className="font-display text-base md:text-lg font-medium tracking-tight text-primary-deep leading-tight hover:text-primary transition-colors line-clamp-2"
        >
          {item.name}
        </Link>
        {item.variantLabel && (
          <p className="font-sans text-[11.5px] uppercase tracking-[0.14em] font-semibold text-ink-soft mt-0.5">
            {item.variantLabel}
          </p>
        )}
        <p className="font-sans text-[12px] text-ink-mute mt-1">
          {formatPriceSEK(item.price)} per st
        </p>

        <div className="mt-auto pt-3 flex items-center justify-between gap-3">
          <div className="inline-flex items-center border border-border rounded-full bg-surface-alt overflow-hidden">
            <button
              type="button"
              onClick={() =>
                setQuantity(
                  item.productId,
                  item.variantId,
                  item.quantity - 1,
                  item.bundleId
                )
              }
              aria-label="Minska antal"
              className="w-8 h-8 flex items-center justify-center text-ink-body hover:bg-surface-warm transition-colors text-base leading-none"
            >
              −
            </button>
            <span
              aria-live="polite"
              className="min-w-[28px] text-center font-sans text-[14px] font-semibold text-ink-body"
            >
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() =>
                setQuantity(
                  item.productId,
                  item.variantId,
                  item.quantity + 1,
                  item.bundleId
                )
              }
              aria-label="Öka antal"
              className="w-8 h-8 flex items-center justify-center text-ink-body hover:bg-surface-warm transition-colors text-base leading-none"
            >
              +
            </button>
          </div>
          <span className="font-display text-base md:text-lg font-medium text-primary-deep tracking-tight">
            {formatPriceSEK(subtotal)}
          </span>
        </div>

        <button
          type="button"
          onClick={() => remove(item.productId, item.variantId, item.bundleId)}
          className="self-start mt-2 font-sans text-[12px] text-ink-soft hover:text-status-error transition-colors"
        >
          Ta bort
        </button>
      </div>
    </li>
  );
}
