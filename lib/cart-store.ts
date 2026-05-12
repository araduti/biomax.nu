"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Client-side cart store. Persists to localStorage via Zustand's persist
 * middleware. Per ADR 0008 we keep the cart purely on the client for V1 —
 * server-side cart syncing across devices can come later if it earns it.
 *
 * Prices are stored as strings (matching the Decimal type from Prisma) and
 * parsed only for arithmetic. Subtotal/count are computed via selectors.
 */
export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  imageUrl: string;
  /** SEK as a stringified number (e.g. "311.00"). */
  price: string;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  isOpen: boolean;
  hydrated: boolean;
  setHydrated: () => void;
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  remove: (productId: string) => void;
  setQuantity: (productId: string, qty: number) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),
      add: (item, qty = 1) => {
        const { items } = get();
        const existing = items.find((i) => i.productId === item.productId);
        if (existing) {
          set({
            items: items.map((i) =>
              i.productId === item.productId
                ? { ...i, quantity: i.quantity + qty }
                : i
            ),
            isOpen: true,
          });
        } else {
          set({
            items: [...items, { ...item, quantity: qty }],
            isOpen: true,
          });
        }
      },
      remove: (productId) =>
        set({ items: get().items.filter((i) => i.productId !== productId) }),
      setQuantity: (productId, qty) =>
        set({
          items:
            qty <= 0
              ? get().items.filter((i) => i.productId !== productId)
              : get().items.map((i) =>
                  i.productId === productId ? { ...i, quantity: qty } : i
                ),
        }),
      clear: () => set({ items: [] }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
    }),
    {
      name: "biomax-cart",
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);

/** Total quantity (sum of line quantities). */
export const selectCartCount = (s: CartState) =>
  s.items.reduce((n, i) => n + i.quantity, 0);

/** Subtotal in SEK (number). */
export const selectCartSubtotal = (s: CartState) =>
  s.items.reduce((sum, i) => sum + parseFloat(i.price) * i.quantity, 0);
