"use client";

import { useState } from "react";

export type CategoryOption = {
  slug: string;
  name: string;
};

/**
 * Multi-select for category assignment. Renders all known categories as
 * toggleable chips. Categories themselves come from the DB at page-load
 * time (passed in as `options`).
 *
 * We keep this as chips rather than a real `<select multiple>` because:
 *   - The full set of categories is small (≤15 realistically)
 *   - Chips communicate selection state more clearly than highlighted lines
 *   - Matches the design language of the other chip editors in the form
 */
export function CategoryMultiselect({
  options,
  value,
  onChange,
}: {
  options: CategoryOption[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [selected] = useState(new Set(value)); // initial set; live state in `value`

  function toggle(slug: string) {
    if (value.includes(slug)) {
      onChange(value.filter((s) => s !== slug));
    } else {
      onChange([...value, slug]);
    }
  }

  if (options.length === 0) {
    return (
      <p className="font-sans text-[13px] text-ink-mute italic">
        Inga kategorier definierade än. Skapa en kategori innan du tilldelar
        produkten.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = value.includes(o.slug);
          return (
            <button
              key={o.slug}
              type="button"
              onClick={() => toggle(o.slug)}
              aria-pressed={on}
              className={
                on
                  ? "inline-flex items-center gap-1.5 rounded-full bg-primary text-surface px-3 py-1 font-sans text-[12.5px] font-semibold transition-colors"
                  : "inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-alt text-ink-body px-3 py-1 font-sans text-[12.5px] font-medium hover:border-primary/40 hover:text-primary-deep transition-colors"
              }
            >
              <span
                aria-hidden
                className={on ? "text-surface" : "text-ink-soft"}
              >
                {on ? "✓" : "+"}
              </span>
              {o.name}
            </button>
          );
        })}
      </div>
      {value.length === 0 && (
        <p className="font-sans text-[11.5px] text-[#7A4D2A] italic">
          Utan kategori dyker produkten inte upp på{" "}
          <code className="font-mono">/kategorier</code>-sidorna.
        </p>
      )}
      {/* Quiet a no-op warning from React for the unused initial-set ref. */}
      <span className="sr-only">{selected.size}</span>
    </div>
  );
}
