"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { formatPriceSEK } from "@/lib/format";

/**
 * Mobile-only sticky buy bar. Surfaces once the user has scrolled past
 * the in-hero add-to-cart panel; clicking jumps back to it. We don't
 * try to handle add-to-cart from inside the bar — that would require
 * mirroring variant + subscription state from the hero, which is its
 * own contract.
 *
 * Hidden on `md:` and up (desktop has the buy panel visible in the
 * right column at scroll).
 *
 * Detects "should I show?" via IntersectionObserver on the original
 * hero buy panel — when that's out of view, we're visible.
 */
export function StickyMobileBuyBar({
  productName,
  productImageUrl,
  fromPriceSek,
  buyPanelTargetId,
}: {
  productName: string;
  productImageUrl: string;
  fromPriceSek: string;
  /** The hero buy panel's wrapping element id — used as the watch target. */
  buyPanelTargetId: string;
}) {
  const [visible, setVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const target = document.getElementById(buyPanelTargetId);
    if (!target) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          // Visible when the hero buy panel is OUT of view.
          setVisible(!e.isIntersecting);
        }
      },
      { threshold: 0, rootMargin: "-80px 0px 0px 0px" }
    );
    obs.observe(target);
    observerRef.current = obs;
    return () => obs.disconnect();
  }, [buyPanelTargetId]);

  function scrollToBuyPanel() {
    document.getElementById(buyPanelTargetId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <div
      aria-hidden={!visible}
      className={`md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-alt border-t border-border shadow-[0_-4px_20px_rgba(15,36,64,0.08)] transition-transform duration-300 ease-out ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-surface-warm flex-shrink-0">
          <Image
            src={productImageUrl || "/products/_placeholder.svg"}
            alt={productName}
            fill
            sizes="48px"
            className="object-cover mix-blend-darken"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-[13.5px] font-medium text-primary-deep tracking-tight leading-tight line-clamp-1">
            {productName}
          </p>
          <p className="font-sans text-[12px] text-ink-mute tabular-nums">
            från {formatPriceSEK(fromPriceSek)}
          </p>
        </div>
        <button
          type="button"
          onClick={scrollToBuyPanel}
          className="flex-shrink-0 px-4 py-2 rounded-full bg-primary-deep text-surface font-sans text-[13px] font-semibold hover:bg-primary-deep/90 transition-colors"
        >
          Köp
        </button>
      </div>
    </div>
  );
}
