# Performance Review — biomax.nu

- **Agent:** performance-engineer
- **Date:** 2026-05-18 · **Commit:** 2fb7538 · **Mode:** read-only

## Summary

Solid foundations: explicit `select` projections, Promise.all-first homepage fetch, tag-based ISR on PDP, recently improved image pipeline (AVIF, deviceSizes, tuned quality). Remaining issues: missing DB indexes on Product's hot columns, uncached hot-path reads firing every render, and a render-blocking third-party font stylesheet on every storefront page.

## Strengths

- No N+1 on catalogue listing — `getRatingsByProductIds` single `groupBy`.
- Homepage `needs.has()` guard avoids queries for inactive blocks; single `Promise.all`.
- PDP `unstable_cache` + `productCacheTag(slug)`; `React.cache()` dedupes `getProduct` across metadata+body.
- Narrow 7-field select on `/produkter`.
- AVIF-first, `minimumCacheTTL: 31536000`, deviceSizes ladder, per-surface `sizes`.
- Feeds `revalidate=86400` matching Merchant cadence.
- Prisma proxy prod-inert (zero per-query overhead).

## Findings

### Critical
- **C1 — Product table missing composite indexes.** `prisma/schema.prisma:144–238` declares only `@unique` slug/sku. Public queries filter `status='PUBLISHED'` + date windows then order by `totalSales DESC`/`publishedAt DESC` → seq scan + sort every ISR revalidation. Invisible at ~20 rows, a cliff at 200–500. Add `@@index([status, totalSales])`, `@@index([status, publishedAt])`, `@@index([status, featured])`. One migration, no code.

### High
- **H1 — `getShippingRules()` 2 uncached reads × 3 callers/render** (`lib/site/settings.ts:61–84`; `layout.tsx:113`, `top-bar.tsx:12`, `product-hero.tsx:50`) → ~6 round-trips per PDP. Wrap `React.cache()` (collapse same-render) + `unstable_cache` (TTL 300s, `settings` tag).
- **H2 — `sitemap.ts buyRoutes()` N sequential queries** (`app/sitemap.ts:155–167`) — up to 86 serial queries. Batch with one `productIngredient.findMany({ where:{ ingredientSlug:{ in } } })` grouped in JS.
- **H3 — PDP `fetchProduct` bare `include` for variants** (`app/produkter/[slug]/page.tsx:77–84`) pulls unused columns on every revalidation. Add explicit `select`.

### Medium
- **M1 — Fontshare `<link rel=stylesheet>` render-blocking on every public page** (`app/layout.tsx:141–143`) but used only by admin (`[data-direction="d"]`). Move it + preconnects to `app/admin/layout.tsx`. Highest per-effort customer win.
- **M2** — `getHomepageBlocks()`/`getActiveHero()` not `unstable_cache`-wrapped (`lib/homepage/queries.ts:9–25`, `hero.ts:22–78`).
- **M3** — `/produkter` listing only time-ISR (10 min); `productListCacheTag()` defined but unused — listing stale vs PDP after admin edits.
- **M4** — Sale filter fetches all then JS-filters (`app/produkter/page.tsx:142–149`) — fine now, persist `onSale` boolean at scale.
- **M5** — `TrustpilotBar` `getTrustpilotSummary()` 3 uncached reads per homepage revalidation.

### Low
- **L1** — 3 admin-only fonts in root layout (display:swap, self-hosted — no paint delay, just class bloat).
- **L2** — No `generateStaticParams` on `/produkter/[slug]` — first visitor pays cold ISR; pre-build for LCP.
- **L3** — `getActiveHero` no `select` (small table, minor).

## Project Direction

Sound. Clear deliberate data-fetching refactor (`publicProductWhere`, bulk ratings, `needs.has()`, tag module). Next evolution: complete the caching layer (`productListCacheTag` exists but unused; settings are the most impactful uncached hot-path). The DB index gap is the one non-linear cliff as catalogue grows.

## Top 3 Priorities

1. Add `@@index([status, totalSales])` + `@@index([status, publishedAt])` to Product (C1) — one migration.
2. Wrap `getShippingRules()` + `getTrustpilotSummary()` with `React.cache()` (H1, M5).
3. Move Fontshare `<link>` + preconnects from root to admin layout (M1).
