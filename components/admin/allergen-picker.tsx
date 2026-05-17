"use client";

import { ALLERGENS } from "@/lib/products/allergens";

/**
 * EU 1169/2011 Annex II allergen picker. Renders the 14 allergens as
 * a multi-select chip grid; selection writes the slugs back to the
 * caller. We deliberately don't allow free-text — the regulation lists
 * exactly these 14 substances + product groups.
 */
export function AllergenPicker({
  values,
  onChange,
}: {
  values: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(slug: string) {
    const next = values.includes(slug)
      ? values.filter((s) => s !== slug)
      : [...values, slug];
    onChange(next);
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {ALLERGENS.map((a) => {
        const active = values.includes(a.slug);
        return (
          <button
            key={a.slug}
            type="button"
            onClick={() => toggle(a.slug)}
            title={a.examples}
            aria-pressed={active}
            className={`px-3 py-1.5 rounded-full border font-sans text-[12.5px] font-semibold transition-colors ${
              active
                ? "bg-status-warn text-surface border-status-warn"
                : "bg-surface text-ink-body border-border hover:border-border-soft hover:bg-surface-warm"
            }`}
          >
            {active && <span aria-hidden>✓ </span>}
            {a.label}
          </button>
        );
      })}
    </div>
  );
}
