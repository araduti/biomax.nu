"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type AnchorSection = { id: string; label: string };

/**
 * Sticky left rail that scroll-spies the active section. Pure visual nav —
 * the form sections themselves render via their own `<section id="...">`
 * markers; the rail just lets editors jump between them on tall pages.
 *
 * Why client-side: we observe scroll position to highlight the section in
 * view. Server rendering of the rail with no active state would feel dead.
 */
export function EditorAnchorRail({
  sections,
}: {
  sections: AnchorSection[];
}) {
  const [active, setActive] = useState<string>(sections[0]?.id ?? "");

  useEffect(() => {
    if (sections.length === 0) return;
    // IntersectionObserver: pick the topmost visible section. Threshold
    // values picked to fire when ~30% of a section is in view.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      {
        rootMargin: "-100px 0px -60% 0px",
        threshold: [0, 0.3, 0.7, 1],
      }
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav
      aria-label="Avsnitt"
      className="hidden lg:block sticky top-6 self-start"
    >
      <p className="font-sans text-[10px] uppercase tracking-[0.22em] font-semibold text-ink-soft mb-3 px-3">
        Avsnitt
      </p>
      <ul className="flex flex-col">
        {sections.map((s) => {
          const isActive = s.id === active;
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "block py-2 pl-4 pr-3 -ml-px border-l-2 font-sans text-[13.5px] leading-snug transition-colors",
                  isActive
                    ? "text-primary-deep border-primary font-semibold"
                    : "text-ink-mute border-transparent hover:text-primary-deep hover:border-border"
                )}
              >
                {s.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
