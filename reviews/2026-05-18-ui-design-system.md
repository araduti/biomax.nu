# UI / Design-System Review — biomax.nu

- **Agent:** ui-designer
- **Date:** 2026-05-18 · **Commit:** 2fb7538 · **Mode:** read-only

## Summary

Coherent, intentionally architected for a premium Swedish supplement brand. Comprehensive well-annotated token contract (`app/globals.css`), cream/ink/sage palette applied consistently 90%+ of surfaces, faithful `Display`/`Eyebrow`/`Accent` typographic triad, clean admin Direction-D bridge layer. Maturing but not closed: the `Section` primitive is bypassed everywhere in favour of repeated `<section> + max-w-[1240px] mx-auto px-6 md:px-8` boilerplate, and a ~15-value `text-[Xpx]` ladder substitutes for a closed body-type scale. Craft-level issues, not structural failure — bones are right.

## Strengths

- Color-layer token discipline; no freehand hex outside gradients/Klarna badge; contrast rationale documented inline.
- Seasonal hero exactly on-brand (full-bleed photo, navy left-gradient, clamp 56–112px display, seasonal accent italic, glass featured-product card, motif caption).
- Typography depth — `Display` 6 steps + semantic `as`, `Accent`, `Eyebrow` used consistently across marketing components.
- Product card / PDP coherence — `mix-blend-darken` on `surface-warm` dissolving white photo bg matches PDP inset; honest `TAG_BY_SLUG`.
- BuyOptionsPanel scan-order matches Apotea/Bodystore conventions.
- Error/404 on-brand (`not-found.tsx` wit + 3-card recovery grid).

## Findings

### Critical
None.

### High
- **H1 — `Section` primitive universally bypassed.** Six different vertical rhythms on one homepage scroll (`bestsellers py-16/20`, `bundle-rail py-14/20`, `newsletter py-20/24`, `knowledge-teaser`/`categories py-24/28`, `founder-band py-24/32`). Reads "assembled from parts." Migrate all to `<Section tone padding>`; codify 3 padding steps.
- **H2 — Body type scale is an open range.** `text-[9px]…15px` incl. half-pixel values (`12.5/13/13.5/14/14.5`) — imperceptible noise, dev cognitive load, drift. Define 4–5 named body sizes; replace the ladder.

### Medium
- **M1** — Raw hex `text-[#7A331E]` (`info-box.tsx:119`) outside token system → add `--color-status-error-text`.
- **M2** — `global-error.tsx` detached + drifted: hardcodes `#7A8290`, the pre-accessibility-fix ink-soft that failed AA, on the most-visible crisis page. Update inline values + comment the intentional detachment.
- **M3** — BuyOptionsPanel mode toggles (`buy-options-panel.tsx:92–121`) — global focus ring renders rectangular on `rounded-full` pills (offset clip). Add `focus-visible:ring-2/offset-2`; add to Button base.
- **M4** — Hero glass card `hidden md:flex` — highest-intent conversion surface absent on mobile for a 45–70+ mobile-first audience. Add `md:hidden` below-hero strip reusing `<AddToCartButton>`.
- **M5** — No storefront skeleton/`loading.tsx` — pages stream blank until slowest fetch. Add `app/produkter/loading.tsx` + `[slug]/loading.tsx` (`animate-pulse bg-surface-warm`).

### Low
- **L1** Informal radius system (`rounded-xl` card vs `rounded-2xl` PDP for same product image). Define `--radius-card`/`--radius-card-sm`.
- **L2** Gradients hardcode `rgba(15,36,64,…)` instead of `bg-primary-deep/78` — maintenance trap.
- **L3** `FounderBand` inlines sage-on-dark button overrides — add a `sage`/`accent` Button variant.
- **L4** `knowledge-teaser.tsx:74` gradient placeholder thumbnails read unfinished for a photography-pillar brand — define where editorial photography lives.

## Project Direction

Maturing, not fragmenting. Token contract architecturally sound and growing richer (a11y-motivated ink-soft revision, dual-purpose accent annotation, Direction-D bridge). Main tension: `Section` exists but isn't adopted — a "designed-before-adopted" phase resolved by refactor-on-touch, not a rewrite. The 574-line `globals.css` doing storefront + admin in one file will get hard to audit as admin grows — a separate `admin.css` import would help legibility without behavior change.

## Top 3 Priorities

1. Adopt `<Section>` universally + 3 vertical-rhythm presets — highest visible improvement per effort; kills the "assembled from parts" seam.
2. Define a 5-step body-type scale in `globals.css`; eliminate the `text-[Xpx]` ladder — firms hierarchy below Display/Eyebrow, speeds a11y audits.
3. Add a mobile conversion surface for the featured seasonal product — highest-value missing touchpoint for the mobile-first older audience.
