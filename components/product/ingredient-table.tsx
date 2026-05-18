import Link from "next/link";
import type { IngredientList } from "@/lib/products/ingredient-list";
import { findIngredient } from "@/lib/knowledge/ingredients";

/**
 * Public ingredient table on the product detail page.
 *
 * Each row name is matched against the ingredient knowledge registry; if a
 * monograph exists, the name becomes a link with a hover tooltip showing the
 * one-line summary, and clicking opens the dedicated detail page. Rows with
 * no monograph stay plain text — no broken links.
 */
export function IngredientTable({ list }: { list: IngredientList }) {
  return (
    <div className="space-y-5">
      {list.rows.length > 0 && (
        <div className="bg-surface-alt border border-border rounded-2xl">
          <div className="grid grid-cols-[1.5fr_1fr] md:grid-cols-[2fr_1fr] gap-4 px-6 md:px-8 py-4 bg-surface-warm rounded-t-2xl border-b border-border-soft">
            <span className="font-sans text-micro uppercase tracking-[0.22em] font-semibold text-ink-mute">
              Ingrediens
            </span>
            <span className="font-sans text-micro uppercase tracking-[0.22em] font-semibold text-ink-mute text-right md:text-left">
              Mängd per {list.perUnit || "enhet"}
            </span>
          </div>
          <ul className="divide-y divide-border-soft">
            {list.rows.map((row, i) => {
              const meta = findIngredient(row.name);
              return (
                <li
                  key={i}
                  className="grid grid-cols-[1.5fr_1fr] md:grid-cols-[2fr_1fr] gap-4 px-6 md:px-8 py-[14px] items-baseline"
                >
                  <span className="font-sans text-body-lg md:text-lead text-ink-body">
                    {meta ? (
                      <IngredientLink name={row.name} summary={meta.summary} slug={meta.slug} />
                    ) : (
                      row.name
                    )}
                  </span>
                  <span className="font-sans text-body-lg md:text-lead font-semibold text-primary-deep text-right md:text-left tabular-nums">
                    {row.amount}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {list.footnote.trim() && (
        <p className="px-1 font-sans text-small text-ink-mute italic leading-relaxed whitespace-pre-line max-w-[640px]">
          {list.footnote}
        </p>
      )}
    </div>
  );
}

function IngredientLink({
  name,
  summary,
  slug,
}: {
  name: string;
  summary: string;
  slug: string;
}) {
  return (
    <span className="group/ing relative inline-block">
      <Link
        href={`/kunskap/ingredienser/${slug}`}
        className="inline-flex items-baseline gap-1 text-ink-body underline decoration-accent/50 decoration-from-font underline-offset-[3px] hover:text-primary-deep hover:decoration-accent transition-colors"
      >
        {name}
        <span
          aria-hidden
          className="text-micro text-ink-soft group-hover/ing:text-accent-deep transition-colors translate-y-[-1px]"
        >
          ↗
        </span>
      </Link>
      <span
        role="tooltip"
        className="invisible opacity-0 group-hover/ing:visible group-hover/ing:opacity-100 group-focus-within/ing:visible group-focus-within/ing:opacity-100 transition-opacity duration-150 absolute left-0 top-full mt-2 z-20 w-[320px] max-w-[80vw] rounded-xl bg-primary-deep text-white text-small leading-relaxed font-sans px-4 py-3 shadow-xl pointer-events-none"
      >
        <span className="block font-display text-body-lg font-medium tracking-tight mb-1">
          {name}
        </span>
        {summary}
        <span className="block mt-2 text-accent text-micro uppercase tracking-[0.18em] font-semibold">
          Läs mer →
        </span>
      </span>
    </span>
  );
}
