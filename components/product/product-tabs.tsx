"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ProductTab = {
  id: string;
  label: string;
  /** Numeric counter to show after the label, e.g. reviews count. */
  count?: number;
  content: ReactNode;
};

/**
 * Tabbed product detail content — Beskrivning / Innehåll / Recensioner.
 * Tab buttons get a brand-styled underline; the active tab content is the
 * only one rendered in the DOM (we accept a tiny SSR cost — only the first
 * tab is server-rendered into HTML — for the sake of a clean DOM).
 *
 * URL hash sync: when the URL points to `#<tab-id>` (e.g. `#recensioner`
 * from the hero "läs recensionerna" link), we activate that tab on mount
 * and on subsequent `hashchange` events. Tab clicks update the hash so
 * the active tab survives a reload / share.
 */
export function ProductTabs({ tabs }: { tabs: ProductTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const activeTab = tabs.find((t) => t.id === active) ?? tabs[0];

  useEffect(() => {
    const ids = new Set(tabs.map((t) => t.id));
    const syncFromHash = () => {
      const h = window.location.hash.replace(/^#/, "");
      if (h && ids.has(h)) setActive(h);
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [tabs]);

  const handleClick = (id: string) => {
    setActive(id);
    if (typeof window !== "undefined") {
      // history.replaceState avoids polluting the back-stack while still
      // keeping the URL accurate for share / reload.
      history.replaceState(null, "", `#${id}`);
    }
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label="Produktinformation"
        className="flex flex-wrap gap-2 md:gap-8 border-b border-border mb-8 md:mb-10"
      >
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-controls={`tabpanel-${t.id}`}
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => handleClick(t.id)}
              className={cn(
                "font-display text-xl md:text-2xl font-medium tracking-tight pb-3 md:pb-4 -mb-px border-b-2 transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                isActive
                  ? "text-primary-deep border-primary"
                  : "text-ink-mute border-transparent hover:text-ink-body"
              )}
            >
              {t.label}
              {t.count !== undefined && (
                <span className="ml-1.5 font-sans text-body font-normal text-ink-soft">
                  ({t.count})
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`tabpanel-${activeTab.id}`}
        aria-labelledby={`tab-${activeTab.id}`}
      >
        {activeTab.content}
      </div>
    </div>
  );
}
