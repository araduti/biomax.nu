# Next.js Architecture Review — biomax.nu

- **Agent:** nextjs-developer
- **Date:** 2026-05-18 · **Commit:** 2fb7538 · **Mode:** read-only

## Summary

Cohesive, deliberately constrained Next.js 16 architecture (sv-SE only, no i18n), well ahead of where a store at this stage typically is. Clean component split, layered intentional caching, mature security posture, thorough SEO. No systemic structural flaws; issues are concentrated and mostly medium/low.

## Strengths

- Server-component discipline — only 4 `"use client"` files in `/app`; client islands pushed to `/components`.
- Three-layer caching: ISR `revalidate`, `unstable_cache` with named tags, `React.cache` per-request dedupe. `lib/cache/tags.ts` centralises invalidation. `revalidateTag(tag, "max")` (Next 16 mandatory 2nd arg) used correctly.
- `lib/prisma.ts` mtime Proxy is sound; 1s stat throttle; prod-inert.
- Auth: Better Auth + mandatory admin 2FA, dual per-IP/per-email brute-force buckets, reset session revocation, DB-checked role on every admin request.
- SEO depth: full metadata API, canonicals, broad JSON-LD, dynamic llms.txt, feeds, stable sitemap lastmod.
- Security headers: HSTS preload, DENY framing, nosniff, granular Permissions-Policy, scoped CSP. Constant-time webhook compare. DB-backed rate limiting.
- Error layers: error.tsx/global-error.tsx, redirect-table-before-404, idempotent webhook/order creation, isolated side-effects.

## Findings

### Critical
None.

### High
- **H1 — `script-src 'unsafe-eval'` in prod CSP** (`next.config.ts:45`). Nullifies CSP XSS protection. Verify Kustom/Klarna actually needs eval (likely not); remove or document + ticket.
- **H2 — Root layout blocks on DB every request** (`app/layout.tsx:113` `await getShippingRules()`). Synchronous DB hit on every render incl. cached ISR pages. Wrap in `unstable_cache` (TTL ~3600s, `sitesettings` tag).

### Medium
- **M1 — `buyRoutes` serial N+1** (`app/sitemap.ts:154–167`); same in `llms.txt/route.ts:86–93`. Use `Promise.all`.
- **M2 — CategoryPage double-fetches** (`app/kategorier/[slug]/page.tsx:33–69`) — no `React.cache` wrapper unlike PDP. Add `getCategory(slug)`.
- **M3 — Checkout recommendations bypass `publicProductWhere`** (`app/checkout/page.tsx:22–32`) — could surface scheduled/date-gated products.
- **M4 — `getShippingRules` makes 3 Prisma calls** (`lib/site/settings.ts:62–84`); resolved by H2 fix.
- **M5 — No `loading.tsx` on public high-latency routes** (`/produkter`, `/kategorier/[slug]`, `/produkter/[slug]`). Add skeletons to stream shell on cache miss.

### Low
- **L1** — `rehydrateDates` manual `DATE_FIELDS` list (`app/produkter/[slug]/page.tsx:50–74`) — fragile; consider Zod-after-cache.
- **L2** — `'unsafe-inline'` script-src acknowledged but untracked; precompute JSON-LD hashes.
- **L3** — `strict:true` but not `noUncheckedIndexedAccess` (`tsconfig.json:7`).
- **L4** — Admin layout re-enters `getAdminBadges` cache each nav (by design, 60s TTL — controlled).

## Project Direction

Architecture is coherent with the three visible vectors (editorial/knowledge layer, loyalty/subscription infra, admin CMS maturation) — all share the same server-component + ISR + tag-invalidation foundation. Single-locale choice is correct for the market. llms.txt + AI-bot allowlist is a forward-looking bet fitting a knowledge-competing niche brand. Watch `lib/checkout/order-actions.ts` (1,004 lines) — concerns are well-isolated but extraction into domain modules is the next step as subscriptions grow.

## Top 3 Priorities

1. Remove `'unsafe-eval'` from `script-src` (`next.config.ts:45`).
2. Cache `getShippingRules` behind `unstable_cache` (`lib/site/settings.ts:61`).
3. Parallelise `buyRoutes`/llms.txt ingredient loops with `Promise.all`.
