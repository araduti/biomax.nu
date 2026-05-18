"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Section } from "@/lib/site/sections";

/**
 * Left-rail nav for grouped page clusters (help / biomax). Sticky on desktop,
 * collapses to a horizontal scroll-strip on mobile so the cluster identity is
 * preserved on small screens too.
 */
export function SectionNav({ section }: { section: Section }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label={section.eyebrow}
      className="md:sticky md:top-24 md:self-start"
    >
      <p className="font-sans text-micro uppercase tracking-[0.22em] font-semibold text-accent-deep mb-3 px-1">
        {section.eyebrow}
      </p>
      {/* Mobile: horizontal scroll pill list */}
      <ul className="md:hidden -mx-6 px-6 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {section.items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <li key={item.href} className="flex-shrink-0">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex items-center rounded-full border px-4 py-2 font-sans text-small font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-primary-deep text-surface border-primary-deep"
                    : "bg-surface-alt text-ink-body border-border hover:border-accent"
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
      {/* Desktop: vertical list */}
      <ul className="hidden md:flex flex-col">
        {section.items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "block font-sans text-body py-2.5 pl-4 pr-3 -ml-px border-l-2 transition-colors leading-snug",
                  isActive
                    ? "text-primary-deep border-primary font-semibold"
                    : "text-ink-mute border-transparent hover:text-primary-deep hover:border-border"
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
