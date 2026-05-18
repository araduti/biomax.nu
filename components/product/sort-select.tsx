"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type SortOption = { value: string; label: string };

const DEFAULT_OPTIONS: SortOption[] = [
  { value: "bestsellers", label: "Bästsäljare" },
  { value: "newest", label: "Nyheter" },
  { value: "sale", label: "Erbjudanden" },
];

/**
 * Native `<select>` for product sort. Updates the URL `?sort=` param on change
 * and lets the server re-render with the new ordering.
 *
 * Native picker beats a custom dropdown here for three reasons: it's accessible
 * by default (screen-reader + keyboard out of the box), it matches the OS
 * idiom on mobile (iOS spinner / Android sheet), and it visually disappears
 * into the filter row instead of competing with the category pills for
 * attention. The trade-off — slightly less styling control — is right for this
 * surface where the *content* is what should pull the eye.
 */
export function SortSelect({
  /** Current active sort. Used as the controlled value. */
  current,
  /** Override options (e.g. for category pages where "bestsellers in this
   *  category" might want different labels). */
  options = DEFAULT_OPTIONS,
}: {
  current: string;
  options?: SortOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    const usp = new URLSearchParams(params?.toString() ?? "");
    if (next === "" || next === "bestsellers") {
      usp.delete("sort"); // bestsellers is the canonical/default view
    } else {
      usp.set("sort", next);
    }
    const qs = usp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <label className="inline-flex items-center gap-2 font-sans text-caption text-ink-mute whitespace-nowrap">
      <span className="hidden sm:inline">Sortera efter</span>
      <span className="sm:hidden">Sortera</span>
      <span className="relative">
        <select
          value={current}
          onChange={onChange}
          aria-label="Sortera produkter"
          className="appearance-none pr-7 pl-3 py-1.5 rounded-full border border-border bg-surface-alt font-sans text-small font-semibold text-ink-body cursor-pointer hover:border-accent transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span
          aria-hidden
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-soft text-micro"
        >
          ▾
        </span>
      </span>
    </label>
  );
}
