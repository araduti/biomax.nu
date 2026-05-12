import Link from "next/link";

export type FilterOption = {
  slug: string;
  name: string;
  count: number;
  href: string;
};

/**
 * Single-row horizontal filter strip. Pills no longer wrap to a second line
 * — they scroll horizontally on overflow. Why:
 *
 *   1. Two-line wrap with an asymmetric orphan row (e.g. 7 + 2) reads as
 *      visual noise; horizontal scroll keeps the rhythm flat.
 *   2. iOS / Android / Material UI all use horizontal-scroll category strips —
 *      mobile users know the gesture intuitively.
 *   3. A right-edge gradient fade communicates "there's more →" without
 *      adding a chevron button that would clutter the strip.
 *
 * Scrollbar is hidden visually but scrolling itself stays keyboard-accessible
 * (focusing an off-screen pill scrolls it into view via the browser default).
 */
export function CategoryFilter({
  options,
  activeSlug,
  allHref = "/produkter",
  allLabel = "Alla produkter",
}: {
  options: FilterOption[];
  activeSlug: string | null;
  allHref?: string;
  allLabel?: string;
}) {
  return (
    <div className="relative">
      <nav
        aria-label="Filtrera efter kategori"
        className="flex gap-2 overflow-x-auto scrollbar-none snap-x snap-proximity pb-1"
      >
        <Pill href={allHref} active={activeSlug === null}>
          {allLabel}
        </Pill>
        {options.map((o) => (
          <Pill key={o.slug} href={o.href} active={activeSlug === o.slug}>
            <span>{o.name}</span>
            <span className="text-ink-soft text-[10.5px] ml-1.5 tabular-nums">
              {o.count}
            </span>
          </Pill>
        ))}
      </nav>
      {/* Right-edge fade. Hints "more →" without an explicit chevron. Wrapper
          is `relative`, fade is absolute + pointer-events:none so it doesn't
          eat clicks on the rightmost pill. Hidden on mobile where the
          scroll gesture is already obvious. */}
      <span
        aria-hidden
        className="hidden md:block pointer-events-none absolute top-0 right-0 h-full w-12 bg-gradient-to-l from-surface to-transparent"
      />
    </div>
  );
}

function Pill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  const base =
    "snap-start flex-shrink-0 inline-flex items-center px-3.5 py-1.5 rounded-full text-[12.5px] tracking-wide whitespace-nowrap";
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? `${base} bg-primary text-surface font-semibold`
          : `${base} bg-surface-alt border border-border text-ink-body font-medium hover:border-primary/40 hover:text-primary-deep transition-colors`
      }
    >
      {children}
    </Link>
  );
}
