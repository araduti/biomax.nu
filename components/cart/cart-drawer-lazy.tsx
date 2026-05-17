"use client";

import dynamic from "next/dynamic";

/**
 * Client-side lazy mount for the cart drawer.
 *
 * The drawer is hidden by default and only matters once the user opens it,
 * so we don't ship its Zustand store + persist middleware on first paint
 * for legal/info pages. `ssr: false` requires a Client Component scope —
 * hence this thin wrapper that the (Server) root layout can import without
 * tripping Next.js 16's no-ssr-false-in-rsc rule.
 */
const CartDrawer = dynamic(
  () => import("@/components/cart/cart-drawer").then((m) => m.CartDrawer),
  { ssr: false }
);

export function CartDrawerLazy() {
  return <CartDrawer />;
}
