"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";

type Item = { slug: string; label: string };

/**
 * "Efter behov" header dropdown — the goal-first shopping primitive
 * (research note 2026-05-13: this is the IA pattern apotek/specialist
 * sites all surface above category nav). Lists the symptom landing
 * pages under `/hjalp/[slug]` with shopping-friendly Swedish labels.
 *
 * Pure client component for the open/close + outside-click logic.
 * Keyboard accessible: Escape closes; focus trapped within the menu
 * while open via inline tabindex.
 */
export function BehovNav({ items }: { items: Item[] }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="hover:text-primary transition-colors inline-flex items-center gap-1"
      >
        Efter behov
        <svg
          aria-hidden
          width="11"
          height="11"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <polyline points="3 4.5 6 8 9 4.5" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-3 z-30 w-[320px] rounded-2xl bg-surface-alt border border-border shadow-xl p-2"
        >
          <Link
            href="/hjalp"
            onClick={() => setOpen(false)}
            role="menuitem"
            className="block px-4 py-2.5 rounded-lg hover:bg-surface-warm transition-colors font-sans text-[13.5px] font-semibold text-primary-deep"
          >
            Alla behovsområden →
          </Link>
          <div className="border-t border-border-soft my-1" />
          <ul className="grid grid-cols-1 gap-0.5">
            {items.map((it) => (
              <li key={it.slug}>
                <Link
                  href={`/hjalp/${it.slug}`}
                  onClick={() => setOpen(false)}
                  role="menuitem"
                  className="block px-4 py-2 rounded-lg hover:bg-surface-warm transition-colors font-sans text-[14px] text-ink-body hover:text-primary-deep"
                >
                  {it.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
