"use client";

import Link from "next/link";
import { useCart, selectCartCount } from "@/lib/cart-store";

/**
 * Header cart pill. Clicking opens the slide-out drawer (in dev/checkout
 * paths it links to /varukorg directly — the drawer handles UX everywhere
 * else). Shows live item count once the store has hydrated.
 */
export function CartButton() {
  const count = useCart(selectCartCount);
  const hydrated = useCart((s) => s.hydrated);
  const open = useCart((s) => s.open);
  const display = hydrated ? count : 0;

  return (
    <button
      type="button"
      onClick={open}
      aria-label={`Öppna varukorgen — ${display} ${display === 1 ? "produkt" : "produkter"}`}
      className="px-4 py-2 rounded-full border border-primary text-primary font-semibold hover:bg-primary hover:text-surface transition-colors text-sm cursor-pointer"
    >
      Varukorg · {display}
    </button>
  );
}

/**
 * Read-only fallback used during SSR (when no client store is available)
 * and on routes that should always link to the cart page directly.
 */
export function CartLink() {
  return (
    <Link
      href="/varukorg"
      className="px-4 py-2 rounded-full border border-primary text-primary font-semibold hover:bg-primary hover:text-surface transition-colors text-sm"
    >
      Varukorg
    </Link>
  );
}
