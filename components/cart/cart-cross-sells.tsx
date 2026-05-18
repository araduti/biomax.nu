"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/lib/cart-store";
import { formatPriceSEK } from "@/lib/format";

type CrossSell = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  imageUrl: string;
  price: string;
};

/**
 * "Andra kunder lade också till…" strip. Reads the current cart items,
 * hits `/api/cart/cross-sells?ids=…`, renders up to 4 editor-pinned
 * suggestions. Adds to cart inline (single-SKU only — bundles/variants
 * have to be picked on the PDP).
 *
 * Hides when cart is empty (nothing to anchor a suggestion on) or
 * when the API returns no suggestions (don't show an empty section).
 */
export function CartCrossSells({
  variant = "drawer",
  onNavigate,
}: {
  variant?: "drawer" | "page";
  onNavigate?: () => void;
}) {
  const items = useCart((s) => s.items);
  const add = useCart((s) => s.add);
  const [suggestions, setSuggestions] = useState<CrossSell[]>([]);

  // Build a stable key from the unique product ids in the cart so we
  // only refetch when the *set* changes, not on every quantity change.
  const cartIdsKey = Array.from(new Set(items.map((i) => i.productId)))
    .sort()
    .join(",");

  useEffect(() => {
    if (!cartIdsKey) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    fetch(`/api/cart/cross-sells?ids=${encodeURIComponent(cartIdsKey)}`, {
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : { products: [] }))
      .then((d: { products: CrossSell[] }) => setSuggestions(d.products ?? []))
      .catch(() => {
        /* aborted or network error — leave list empty */
      });
    return () => controller.abort();
  }, [cartIdsKey]);

  if (suggestions.length === 0) return null;

  return (
    <div
      className={
        variant === "drawer"
          ? "border-t border-border-soft pt-5 px-6 pb-2"
          : "mt-12 pt-10 border-t border-border"
      }
    >
      <p className="font-sans text-micro uppercase tracking-[0.18em] font-semibold text-ink-soft mb-3">
        Komplettera din rutin
      </p>
      <ul
        className={
          variant === "drawer"
            ? "grid grid-cols-2 gap-3"
            : "grid grid-cols-2 md:grid-cols-4 gap-4"
        }
      >
        {suggestions.map((p) => (
          <li
            key={p.id}
            className="rounded-xl border border-border bg-surface-alt overflow-hidden flex flex-col"
          >
            <Link
              href={`/produkter/${p.slug}`}
              onClick={onNavigate}
              className="relative aspect-square bg-surface-warm block group"
            >
              <Image
                src={p.imageUrl || "/products/_placeholder.svg"}
                alt={p.name}
                fill
                sizes="(max-width: 768px) 50vw, 160px"
                className="object-contain p-3 mix-blend-darken group-hover:scale-105 transition-transform duration-500"
              />
            </Link>
            <div className="p-2.5 flex flex-col flex-1">
              <Link
                href={`/produkter/${p.slug}`}
                onClick={onNavigate}
                className="font-display text-caption font-medium text-primary-deep leading-tight line-clamp-2 hover:text-primary transition-colors"
              >
                {p.name}
              </Link>
              <p className="mt-auto pt-1.5 font-sans text-caption text-ink-mute tabular-nums">
                {formatPriceSEK(p.price)}
              </p>
              <button
                type="button"
                onClick={() =>
                  add(
                    {
                      productId: p.id,
                      slug: p.slug,
                      name: p.name,
                      imageUrl: p.imageUrl,
                      price: p.price,
                    },
                    1
                  )
                }
                className="mt-2 px-3 py-1.5 rounded-full bg-surface border border-border font-sans text-micro font-semibold text-primary-deep hover:bg-surface-warm transition-colors"
              >
                + Lägg till
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
