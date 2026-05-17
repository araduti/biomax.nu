"use client";

import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";

type Item = { slug: string; label: string };

/**
 * "Efter behov" header dropdown — the goal-first shopping primitive
 * (research note 2026-05-13: this is the IA pattern apotek/specialist
 * sites all surface above category nav). Lists the symptom landing
 * pages under `/hjalp/[slug]` with shopping-friendly Swedish labels.
 *
 * WAI-ARIA menu-button keyboard model: the trigger toggles on
 * Enter/Space and opens-with-focus on ArrowDown; within the menu
 * Arrow/Home/End move focus, Escape closes and returns focus to the
 * trigger, Tab closes. Outside-click also closes.
 */
export function BehovNav({ items }: { items: Item[] }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  // -1 = no item focused yet (menu opened by mouse).
  const pendingFocus = useRef<number | null>(null);

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Move focus into the menu when it was opened via keyboard.
  useEffect(() => {
    if (open && pendingFocus.current !== null) {
      const idx = pendingFocus.current;
      pendingFocus.current = null;
      itemRefs.current[idx]?.focus();
    }
  }, [open]);

  const focusItem = (idx: number) => {
    const els = itemRefs.current.filter(Boolean) as HTMLAnchorElement[];
    if (els.length === 0) return;
    const wrapped = (idx + els.length) % els.length;
    els[wrapped]?.focus();
  };

  const onTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (open) {
        focusItem(e.key === "ArrowDown" ? 0 : -1);
      } else {
        pendingFocus.current = e.key === "ArrowDown" ? 0 : -1;
        setOpen(true);
      }
    } else if (e.key === "Escape") {
      close(false);
    }
  };

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    const els = itemRefs.current.filter(Boolean) as HTMLAnchorElement[];
    const current = els.indexOf(document.activeElement as HTMLAnchorElement);
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        focusItem(current + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusItem(current - 1);
        break;
      case "Home":
        e.preventDefault();
        focusItem(0);
        break;
      case "End":
        e.preventDefault();
        focusItem(-1);
        break;
      case "Escape":
        e.preventDefault();
        close(true);
        break;
      case "Tab":
        close(false);
        break;
    }
  };

  const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

  // Stable ordered list: the "Alla behovsområden" link first, then items.
  itemRefs.current = [];
  let ref = 0;
  const nextRef = () => ref++;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onTriggerKeyDown}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`hover:text-primary transition-colors inline-flex items-center gap-1 rounded ${focusRing}`}
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
          aria-label="Efter behov"
          onKeyDown={onMenuKeyDown}
          className="absolute left-0 top-full mt-3 z-30 w-[320px] rounded-2xl bg-surface-alt border border-border shadow-xl p-2"
        >
          <Link
            ref={(el) => {
              itemRefs.current[nextRef()] = el;
            }}
            href="/hjalp"
            onClick={() => setOpen(false)}
            role="menuitem"
            className={`block px-4 py-2.5 rounded-lg hover:bg-surface-warm transition-colors font-sans text-[13.5px] font-semibold text-primary-deep ${focusRing}`}
          >
            Alla behovsområden →
          </Link>
          <div className="border-t border-border-soft my-1" />
          <ul className="grid grid-cols-1 gap-0.5">
            {items.map((it) => (
              <li key={it.slug}>
                <Link
                  ref={(el) => {
                    itemRefs.current[nextRef()] = el;
                  }}
                  href={`/hjalp/${it.slug}`}
                  onClick={() => setOpen(false)}
                  role="menuitem"
                  className={`block px-4 py-2 rounded-lg hover:bg-surface-warm transition-colors font-sans text-[14px] text-ink-body hover:text-primary-deep ${focusRing}`}
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
