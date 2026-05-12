# ADR 0011 — Monograph Trust Signals (Author Byline & OG Imagery)

**Date:** 2026-05-10
**Status:** Deferred — to revisit after Tier 2 SEO ships
**Related:** ADR 0005 (SEO & AI SEO), ADR 0007 (Design System Foundations)

## Context

Tier 1 of the SEO programme (sitemap, robots, JSON-LD on every editorial surface, /llms.txt) shipped in this session. Two adjacent improvements were identified at the same time but pulled out of scope to keep Tier 1 focused:

1. **Author byline + reviewed-by metadata** on the ingredient monographs ("Skriven av Biomax-redaktionen · Senast granskad YYYY-MM-DD"). The visual byline is cheap; the implication is not — once we name a reviewer or attach a `reviewedBy` to the JSON-LD, we are taking on an editorial workflow obligation.
2. **Open Graph fallback images** for the monographs. Today only product pages have OG images; sharing a monograph URL on social or in chat renders without imagery, which lowers click-through and looks unbranded.

Neither of these is blocking; both touch policy questions that benefit from being decided deliberately rather than landed in a code session.

## Why we defer

### Author byline / reviewer signal

The trust value of the byline depends on it being **honest** — the user has explicitly pushed back on credential overclaims (see memory: `feedback_no_unverified_credentials`). Three open questions:

- **Who is the named reviewer?** "Biomax-redaktionen" is safe but generic. A named individual gives more E-E-A-T but requires an actual person attached to the review.
- **What is the review SLA?** A `dateModified` and `reviewedBy` claim only carries weight if the workflow actually happens. Quarterly? Yearly? Triggered by ingredient updates? Without an answer the metadata becomes stale-on-arrival.
- **What schema?** `Person`, `OrganizationRole`, or just `Organization`? Each has different downstream implications when LLMs cite us.

Until the editorial workflow is decided, the byline is theatre. Better to ship nothing here than ship a stale claim.

### OG fallback images for monographs

Three implementation paths exist; each has tradeoffs:

- **Static per-category fallback** (5–6 images, mapped from `IngredientCategory`). Cheap, low-noise, but every Vitamin shares the same hero — unbranded by ingredient.
- **Dynamic OG via Next 16's `opengraph-image.tsx`** — generated from the ingredient name + category as edge-rendered SVG/PNG. Branded per page, no asset management, but image rendering at the edge has cold-start behaviour and font/icon decisions that need design input.
- **Hand-designed assets** (1 per monograph). Highest visual quality, highest content debt — 19 monographs today, more later, all needing redesign if the brand evolves.

The right answer probably depends on a design call we haven't made yet about whether monograph imagery is *categorical* (mineral / vitamin / växt) or *individual* (the actual plant or molecule).

## Decision (when we revisit)

When this ADR is reactivated, we should answer in order:

1. Who reviews ingredient monographs, and on what cadence? Document in this ADR.
2. Pick one of the three OG paths above; document the tradeoff that drove the choice.
3. Land both changes in a single PR so the trust signal is coherent.

Until then, monographs ship without bylines (the "Senast granskad" line in [`app/kunskap/ingredienser/[slug]/page.tsx`](../../app/kunskap/ingredienser/[slug]/page.tsx) is intentionally absent) and without OG-specific imagery (default site OG applies).

## Pending editorial work — citations for 14 monographs

The SEO Tier 3 push curated references for 15 of the 29 ingredient monographs. The remaining 14 — listed below — need PubMed / EFSA / Cochrane references added by someone with access to verify the URLs, since these aren't covered by the predictable NIH ODS / NCCIH URL patterns we used for the easy cohort.

Ingredients still needing references: `bjorkglukos`, `fenylalanin`, `glutamin`, `glycin`, `griffonia`, `k3-vitamin`, `korall-kalcium`, `kycklingkollagen-typ-ii`, `l-arginin`, `l-lysin`, `l-prolin`, `l-tyrosin`, `stevia`, `svart-peppar-extrakt`.

For each: 1–2 references is sufficient. Prefer (in order) Cochrane/systematic reviews → primary PubMed studies → EFSA Scientific Opinions → consumer-grade NIH/MedlinePlus pages. Add via the `references: []` field on the corresponding entry in [`lib/knowledge/ingredients.ts`](../../lib/knowledge/ingredients.ts) — the rendering and JSON-LD pickup are already wired.

## Consequences

- **Today:** Slight underperformance on social previews and on E-E-A-T. Acceptable trade for not making claims we can't keep.
- **When implemented:** Need to also retrofit `dateModified` and `author`/`reviewedBy` into `definedTermLd()` in [`lib/jsonld.ts`](../../lib/jsonld.ts). The schema helper already publishes via `publisher: Organization` — add the new fields without breaking existing emitters.
- **Tooling:** If we go with dynamic OG, add a small image rendering test so the monograph route doesn't silently break image generation in production.
