# ADR 0016 — Editorial Control Surfaces (Ecommerce v1)

**Date:** 2026-05-11
**Status:** Accepted (in progress)
**Related:** ADR 0008 (build roadmap), ADR 0009 (Klarna), ADR 0011 (monograph trust)

## Context

The product editor (ADR 0008's "Drift" surface) covers the obvious editorial axes — copy, pricing, status, SEO, FAQ, dosing, gallery, badges, categories, related products, slug, availability window. Outside the product editor we still have hardcoded behaviour that requires a developer to change:

- **Hero/seasonal pick** — homepage `SEASONAL_PICK_SLUG` is a code map per season.
- **/kop ingredient landings** — product lists are auto-derived from `findProductsForIngredient`; no editorial pinning.
- **Low-stock threshold** — "Få kvar" badge fires at a hardcoded number (≤5).
- **Weight & dimensions** — only `weight` exists on Product; no length/width/height for shipping.
- **Internal notes** — no place to record "next batch arrives v.24" or "supplier changed Q3".
- **Homepage curation** — hero eyebrow, headline, featured-product copy hardcoded.
- **Shipping rules** — `STANDARD_SHIPPING_SEK = 49` and `FREE_SHIPPING_THRESHOLD` are constants in [`lib/klarna/cart-to-order.ts`](../../lib/klarna/cart-to-order.ts).
- **Discount codes** — `Coupon` model exists in the schema but has no admin UI and no checkout wiring.

Each of these is a "I had to ping a developer" scenario that an editor should own. We'd rather build a new ecommerce system that an editor can run than ship faster surfaces that calcify into developer-only knobs.

## Decision

### Tier the changes by cost and visibility

We split this work into three waves so the user-visible polish (hero, shipping, coupons) lands first, the per-product knobs land alongside, and the more elaborate curation surfaces (programmatic landings, homepage-block layout) land in a follow-up.

**Wave 1 — per-product logistics (this PR)**

- `Product.lengthCm`, `widthCm`, `heightCm` (`Decimal?`, cm) — alongside the existing `weight` (kg). Wired into the product editor's "Pris & lager" section so warehouse staff can fix a bad import or measure a new SKU without a developer.
- `Product.lowStockThreshold Int? @default(5)` — overrides the global "Få kvar" trigger. NULL = use the site-wide default (still 5; can move to SiteSetting later if needed).
- `Product.internalNote String?` — free-text staff-only notes, never exposed publicly. Rendered in admin only.
- `Product.featured Boolean @default(false)` — replaces the hardcoded `SEASONAL_PICK_SLUG` map. The homepage picks the most recently updated featured product per season; a simple "Säsongsval" toggle on the product page lets editors flip it. NULL season fallback = no featured block.

**Wave 2 — site-wide settings (this PR)**

- New `SiteSetting` model with a `key/value` shape (`value` as `Json`). One row per setting so we can add new keys without migrations:
  - `shipping_flat_sek` (Int) — base flat rate.
  - `free_shipping_threshold_sek` (Int) — order subtotal that unlocks free shipping. NULL = never free.
  - `low_stock_default` (Int) — global "Få kvar" cutoff when a product has no override.
- New `/admin/installningar` page reads/writes these. The existing `STANDARD_SHIPPING_SEK` / `FREE_SHIPPING_THRESHOLD` constants become async lookups via a thin `getShippingRules()` helper, so existing call sites don't have to know about the DB.
- Discount codes — the existing `Coupon` model is the source of truth. New `/admin/kuponger` page provides list/create/edit/delete. Code validation in checkout becomes a server-side `validateCoupon(code, subtotal)` helper. Klarna integration is deferred to wave 3 (codes work today via order-action math; Klarna's discount line gets the same treatment later).

**Wave 3 — curation surfaces (follow-up PR)**

- `/kop/[ingredient]` cross-sells. Same UX as the product-page related-products editor, scoped per ingredient slug. New `IngredientPin` model: `(ingredientSlug, targetProductId, score)`. Order overrides the auto-derived list.
- Homepage curation. New `HomepageBlock` model (or stretched SiteSetting) with `slot`, `kind` (hero / featured-product / season-spotlight / category-rail), `payload Json`, `position`, `active`. Editors compose the homepage from a block list rather than via code.

These are deferred because they need richer UX (drag-to-reorder for blocks, search-and-pin for ingredient cross-sells, preview-before-publish) and the wave 1+2 changes already cover the highest-frequency editorial asks.

### Why a `SiteSetting` table over per-feature constants tables

Two alternatives were on the table:

1. One row per concept (`ShippingConfig`, `StoreConfig`, etc.) — typed, but a migration every time a setting is added.
2. Single key/value table — slightly weaker types, but adds-without-migrations and avoids singleton tables.

We went with (2) because the rate of "we need to make X editor-controlled" is high right now and migrations slow us down. The downside (typing) is contained: each consumer wraps its `value` lookup in a small helper that asserts the JSON shape and falls back to a default. The added types live next to the consumer, not in the database.

### Why Coupon UI now, but not Klarna integration yet

Coupons can be redeemed today against the order math we control (see [`lib/checkout/order-actions.ts`](../../lib/checkout/order-actions.ts)). What's missing is editor visibility — codes were creatable only via SQL. Wiring discount lines into the Klarna order payload is mechanical but adds verification failure modes (line totals must reconcile to the gross amount Klarna posts back). We do that in wave 3 after the editorial surface settles.

### Migration plan

One migration adds Wave 1 + 2 schema:
- Four nullable columns on `Product`.
- New `SiteSetting` table.
- A small seed step inserts the three default settings during deploy.

Public-facing reads use the existing `lib/products/availability.ts` helper pattern: a small typed lookup that the rest of the codebase calls without knowing where the value lives.

## Consequences

**Positive**
- Eight scenarios that previously required a developer become editor-self-service.
- One migration covers the schema for both immediate waves; follow-ups (ingredient pins, homepage blocks) get their own focused migrations.
- The `SiteSetting` pattern unblocks future "make X editable" requests without a schema round-trip per setting.

**Negative / risk**
- `SiteSetting` types live in code, not the database. A typo in a key string fails open (returns the default). Mitigation: a single `SETTING_KEYS` const so every consumer uses the same string.
- Discount codes that touch Klarna are still developer territory until wave 3. Editors can create codes today; their effect is computed in our order math, but Klarna's hosted page won't show the discount line until wave 3 lands.
- The featured flag is intentionally simple (one boolean, picks the freshest match per season). If marketing wants A/B testing or scheduled hero rotations later, that's wave 3 territory.

**Out of scope**
- A/B testing infrastructure.
- Multi-currency / multi-region pricing (single market, sv-SE).
- Stock auto-reorder workflows (warehouse decision, not editorial).
