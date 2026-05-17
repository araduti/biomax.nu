import type { Product } from "@prisma/client";
import { sanitizeRichText } from "@/lib/sanitize";
import {
  parseIngredientList,
  hasContent as ingredientListHasContent,
} from "@/lib/products/ingredient-list";
import { ProductTabs, type ProductTab } from "./product-tabs";
import { IngredientTable } from "./ingredient-table";
import { InfoBox } from "./info-box";
import { DoseChips } from "./dose-chips";
import { DoseTimeline } from "./dose-timeline";
import { findIngredient } from "@/lib/knowledge/ingredients";
import { getEffectiveDose } from "@/lib/products/dose";
import { AllergenCallout } from "./allergen-callout";
import Link from "next/link";

type Props = {
  product: Pick<
    Product,
    | "longDescription"
    | "ingredients"
    | "ingredientList"
    | "usage"
    | "dosing"
    | "storage"
    | "warnings"
    | "seoFocusKw"
    | "allergens"
  >;
  /**
   * Reviews tab payload. Rendered by the caller because review fetching
   * (list, aggregate, goal filters, viewer's existing review) is async
   * and depends on session state that doesn't belong in this presentational
   * component. When omitted the Recensioner tab simply isn't shown.
   */
  reviews?: {
    /** Tab counter — usually the aggregate review count. */
    count: number;
    /** Body rendered inside the active tabpanel. */
    content: React.ReactNode;
  };
};

/**
 * Tabbed long-form section of the product detail page.
 *
 *  - Beskrivning: long rich-text description
 *  - Innehåll: ingredient table + Dosering / Förvaring / Observera info boxes
 *  - Recensioner: review list (Phase 7+ wires real reviews)
 *
 * Tabs only render if their content exists; an empty product just shows
 * Beskrivning, no chrome.
 */
export function ProductContent({ product, reviews }: Props) {
  const html = sanitizeRichText(product.longDescription);
  const list = parseIngredientList(product.ingredientList);
  // Manual editorial override wins; falls back to parsing the usage free-text.
  const dose = getEffectiveDose({
    dosing: product.dosing,
    usage: product.usage ?? null,
  });
  const hasIngredients =
    ingredientListHasContent(list) ||
    !!product.ingredients?.trim() ||
    product.allergens.length > 0;
  const hasInfo =
    hasIngredients ||
    !!product.usage?.trim() ||
    !!product.storage?.trim() ||
    !!product.warnings?.trim();

  const tabs: ProductTab[] = [];
  if (html) {
    tabs.push({
      id: "beskrivning",
      label: "Beskrivning",
      content: (
        <article
          className="prose-biomax font-sans text-base md:text-[17px] leading-[1.75] text-ink-body max-w-[760px]"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ),
    });
  }
  if (hasInfo) {
    const hasGuidance =
      !!product.usage?.trim() ||
      !!product.storage?.trim() ||
      !!product.warnings?.trim();
    tabs.push({
      id: "innehall",
      label: "Innehåll",
      content: (
        <div className="max-w-[920px] flex flex-col gap-10 md:gap-12">
          {hasIngredients && (
            <section>
              <header className="mb-6 md:mb-7 flex items-baseline justify-between gap-6 border-b border-border-soft pb-3">
                <h3 className="font-display text-2xl md:text-[28px] font-medium tracking-tight text-primary-deep">
                  {list
                    ? `Innehåll per ${list.perUnit || "enhet"}`
                    : "Ingredienser"}
                </h3>
                <p className="font-sans text-[11px] uppercase tracking-[0.22em] font-semibold text-ink-soft hidden sm:block">
                  Innehållsförteckning
                </p>
              </header>
              {list ? (
                <IngredientTable list={list} />
              ) : product.ingredients?.trim() ? (
                <div className="bg-surface border border-border rounded-2xl px-6 md:px-8 py-6">
                  <p className="font-sans text-[15px] text-ink-body leading-relaxed whitespace-pre-line">
                    {product.ingredients}
                  </p>
                </div>
              ) : null}
              {list && list.rows.some((r) => findIngredient(r.name)) && (
                <Link
                  href="/kunskap/ingredienser"
                  className="mt-5 inline-flex items-center gap-2 font-sans text-[13px] font-semibold text-accent-deep hover:text-primary-deep transition-colors"
                >
                  <span aria-hidden className="text-base leading-none">
                    ◇
                  </span>
                  Läs mer om ingredienserna i kunskapsbanken
                  <span aria-hidden>→</span>
                </Link>
              )}
              <AllergenCallout allergens={product.allergens} />
            </section>
          )}
          {hasGuidance && (
            <section className="space-y-5 md:space-y-6">
              <header className="flex items-baseline justify-between gap-6 border-b border-border-soft pb-3">
                <h3 className="font-display text-2xl md:text-[28px] font-medium tracking-tight text-primary-deep">
                  Användning
                </h3>
                <p className="font-sans text-[11px] uppercase tracking-[0.22em] font-semibold text-ink-soft hidden sm:block">
                  Hur produkten används
                </p>
              </header>
              {(product.usage?.trim() || product.storage?.trim()) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                  <InfoBox
                    icon="dosage"
                    title="Dosering"
                    body={product.usage}
                    accessory={
                      <>
                        <DoseChips dose={dose} />
                        <DoseTimeline dose={dose} />
                      </>
                    }
                  />
                  <InfoBox
                    icon="storage"
                    title="Förvaring"
                    body={product.storage}
                  />
                </div>
              )}
              {product.warnings?.trim() && (
                <div className="rounded-2xl border border-status-error/20 bg-status-error/[0.035] px-6 md:px-7 py-5 md:py-6 flex gap-4 items-start">
                  <span
                    aria-hidden
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-status-error/12 text-status-error flex-shrink-0 mt-0.5"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-sans text-[10.5px] uppercase tracking-[0.22em] font-semibold text-status-error mb-1">
                      Observera
                    </p>
                    <p className="font-sans text-[14px] text-ink-body leading-[1.65] whitespace-pre-line">
                      {product.warnings}
                    </p>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      ),
    });
  }
  // Recensioner — same tab strip as Beskrivning / Innehåll so reviews
  // sit as a peer information surface rather than a duplicate inline
  // section below. The `#recensioner` URL hash from the hero link is
  // picked up by ProductTabs and activates this tab on mount.
  if (reviews) {
    tabs.push({
      id: "recensioner",
      label: "Recensioner",
      count: reviews.count,
      content: reviews.content,
    });
  }

  if (tabs.length === 0) return null;

  return (
    <section
      id="recensioner-anchor"
      className="bg-surface py-16 md:py-24 px-6 md:px-8 scroll-mt-6"
    >
      {/* Hash target — separate from the section id so the URL hash
          `#recensioner` survives even if we restructure the wrapper. */}
      <div id="recensioner" className="sr-only" aria-hidden="true" />
      <div className="max-w-[1240px] mx-auto">
        <ProductTabs tabs={tabs} />
      </div>
    </section>
  );
}
