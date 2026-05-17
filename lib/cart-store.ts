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
 *
 * **Variant awareness:** a cart line is uniquely identified by
 * `(productId, variantId, bundleId)`. A customer can have Easy Way 30 kaps
 * standalone AND as part of a bundle as two distinct lines.
 *
 * **Bundle awareness:** when a bundle is added (`addBundle`), each
 * member product becomes its own line with `bundleId` set. The discount
 * percent is frozen on each line at the moment of add — editorial
 * changes to the bundle later don't surprise the customer mid-flow. The
 * server re-validates and recomputes at order placement.
 */
export type CartItem = {
  productId: string;
  /** Variant ID when the product has variants; null otherwise. */
  variantId: string | null;
  /** Variant display label (e.g. "30 kaps"); null for variantless products. */
  variantLabel: string | null;
  slug: string;
  name: string;
  imageUrl: string;
  /** SEK as a stringified number (e.g. "311.00"). */
  price: string;
  quantity: number;
  /** Bundle membership — null for standalone lines. */
  bundleId: string | null;
  bundleSlug: string | null;
  bundleName: string | null;
  /** Discount % frozen at the moment the bundle was added (0–100). */
  bundleDiscountPercent: number | null;
};

/** Unique key for a cart line — product + variant + bundle. */
function lineKey(item: {
  productId: string;
  variantId: string | null;
  bundleId: string | null;
}): string {
  return `${item.productId}::${item.variantId ?? ""}::${item.bundleId ?? ""}`;
}

export type AddBundleInput = {
  id: string;
  slug: string;
  name: string;
  discountPercent: number;
  items: {
    productId: string;
    slug: string;
    name: string;
    imageUrl: string;
    /** Member product's list price (string). */
    price: string;
    /** Optional variant — bundles only support default-variant SKUs for now. */
    variantId?: string | null;
    variantLabel?: string | null;
  }[];
};

type CartState = {
  items: CartItem[];
  isOpen: boolean;
  hydrated: boolean;
  setHydrated: () => void;
  add: (
    item: Omit<
      CartItem,
      | "quantity"
      | "variantId"
      | "variantLabel"
      | "bundleId"
      | "bundleSlug"
      | "bundleName"
      | "bundleDiscountPercent"
    > & {
      variantId?: string | null;
      variantLabel?: string | null;
    },
    qty?: number
  ) => void;
  addBundle: (bundle: AddBundleInput) => void;
  removeBundle: (bundleId: string) => void;
  remove: (
    productId: string,
    variantId?: string | null,
    bundleId?: string | null
  ) => void;
  setQuantity: (
    productId: string,
    variantId: string | null,
    qty: number,
    bundleId?: string | null
  ) => void;
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
      add: (input, qty = 1) => {
        const item: CartItem = {
          ...input,
          variantId: input.variantId ?? null,
          variantLabel: input.variantLabel ?? null,
          bundleId: null,
          bundleSlug: null,
          bundleName: null,
          bundleDiscountPercent: null,
          quantity: qty,
        };
        const key = lineKey(item);
        const { items } = get();
        const existing = items.find((i) => lineKey(i) === key);
        if (existing) {
          set({
            items: items.map((i) =>
              lineKey(i) === key ? { ...i, quantity: i.quantity + qty } : i
            ),
            isOpen: true,
          });
        } else {
          set({
            items: [...items, item],
            isOpen: true,
          });
        }
      },
      addBundle: (bundle) => {
        // Re-adding the same bundle replaces any existing lines for it
        // (avoids duplicate bundle lines if the user clicks "Add" twice).
        const remaining = get().items.filter(
          (i) => i.bundleId !== bundle.id
        );
        const newLines: CartItem[] = bundle.items.map((it) => ({
          productId: it.productId,
          variantId: it.variantId ?? null,
          variantLabel: it.variantLabel ?? null,
          slug: it.slug,
          name: it.name,
          imageUrl: it.imageUrl,
          price: it.price,
          quantity: 1,
          bundleId: bundle.id,
          bundleSlug: bundle.slug,
          bundleName: bundle.name,
          bundleDiscountPercent: bundle.discountPercent,
        }));
        set({ items: [...remaining, ...newLines], isOpen: true });
      },
      removeBundle: (bundleId) => {
        set({ items: get().items.filter((i) => i.bundleId !== bundleId) });
      },
      remove: (productId, variantId = null, bundleId = null) => {
        const targetKey = lineKey({ productId, variantId, bundleId });
        set({
          items: get().items.filter((i) => lineKey(i) !== targetKey),
        });
      },
      setQuantity: (productId, variantId, qty, bundleId = null) => {
        const targetKey = lineKey({ productId, variantId, bundleId });
        set({
          items:
            qty <= 0
              ? get().items.filter((i) => lineKey(i) !== targetKey)
              : get().items.map((i) =>
                  lineKey(i) === targetKey ? { ...i, quantity: qty } : i
                ),
        });
      },
      clear: () => set({ items: [] }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
    }),
    {
      name: "biomax-cart",
      version: 3,
      partialize: (state) => ({ items: state.items }),
      // Backward-compat:
      //  v1 → v2: rows lacked variantId / variantLabel — default to null.
      //  v2 → v3: rows lacked bundle fields — default to null.
      migrate: (persisted, fromVersion) => {
        if (persisted && typeof persisted === "object") {
          const raw = persisted as { items?: unknown[] };
          if (Array.isArray(raw.items)) {
            raw.items = raw.items.map((it) => {
              const item = it as Partial<CartItem>;
              return {
                ...item,
                variantId: item.variantId ?? null,
                variantLabel: item.variantLabel ?? null,
                bundleId: fromVersion < 3 ? null : item.bundleId ?? null,
                bundleSlug: fromVersion < 3 ? null : item.bundleSlug ?? null,
                bundleName: fromVersion < 3 ? null : item.bundleName ?? null,
                bundleDiscountPercent:
                  fromVersion < 3 ? null : item.bundleDiscountPercent ?? null,
              };
            });
          }
        }
        return persisted;
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);

/** Total quantity (sum of line quantities). */
export const selectCartCount = (s: CartState) =>
  s.items.reduce((n, i) => n + i.quantity, 0);

/**
 * Subtotal in SEK (number) — bundle-aware.
 *
 * Standalone lines: priced at `price × quantity`.
 *
 * Bundle lines: grouped by `bundleId`, summed at list price, then the
 * frozen discount % is applied to the whole group. This mirrors what
 * the server recomputes at order placement (we ship snapshot discount
 * here so the cart total doesn't drift from what the customer sees).
 */
export const selectCartSubtotal = (s: CartState) => {
  let total = 0;
  const bundleGroups = new Map<string, CartItem[]>();
  for (const it of s.items) {
    if (it.bundleId) {
      const arr = bundleGroups.get(it.bundleId) ?? [];
      arr.push(it);
      bundleGroups.set(it.bundleId, arr);
    } else {
      total += parseFloat(it.price) * it.quantity;
    }
  }
  for (const [, lines] of bundleGroups) {
    const list = lines.reduce(
      (s, l) => s + parseFloat(l.price) * l.quantity,
      0
    );
    const discount = lines[0]?.bundleDiscountPercent ?? 0;
    total += list * (1 - discount / 100);
  }
  return total;
};

/**
 * Per-bundle savings amount (sum of list - discounted across all bundle
 * groups). 0 when no bundles in cart. Drives the "Du sparar X kr" line
 * in the cart drawer + checkout.
 */
export const selectBundleSavings = (s: CartState) => {
  let savings = 0;
  const groups = new Map<string, CartItem[]>();
  for (const it of s.items) {
    if (!it.bundleId) continue;
    const arr = groups.get(it.bundleId) ?? [];
    arr.push(it);
    groups.set(it.bundleId, arr);
  }
  for (const [, lines] of groups) {
    const list = lines.reduce(
      (s, l) => s + parseFloat(l.price) * l.quantity,
      0
    );
    const discount = lines[0]?.bundleDiscountPercent ?? 0;
    savings += list * (discount / 100);
  }
  return savings;
};
