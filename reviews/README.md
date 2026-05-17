# Independent Codebase Review — biomax.nu

**Date:** 2026-05-18 · **Commit:** `2fb7538` · **Mode:** read-only

Eight specialist agents independently reviewed the codebase and project direction. Individual reports:

| Report | Agent | Verdict |
|---|---|---|
| [Next.js architecture](2026-05-18-nextjs-architecture.md) | nextjs-developer | Cohesive, no structural flaws |
| [Code quality](2026-05-18-code-quality.md) | code-reviewer | Senior-grade, trending healthier |
| [Security audit](2026-05-18-security-audit.md) | security-auditor | Moderate→strong; one SSRF |
| [Performance](2026-05-18-performance.md) | performance-engineer | Solid; index gap is the cliff |
| [Database](2026-05-18-database.md) | database-administrator | Well-designed; index/retention gaps |
| [QA & testing](2026-05-18-qa-testing.md) | qa-expert | High-quality but sparse; no CI gate |
| [Accessibility](2026-05-18-accessibility.md) | accessibility-tester | ~70–75% AA; interactive gaps |
| [UI / design system](2026-05-18-ui-design-system.md) | ui-designer | Coherent, maturing |

## Overall

Unanimous: this is a **well-engineered, deliberately built codebase** punching above its weight for a solo/small-team operation. No agent found a Critical structural defect. The strengths recur across reviews — server-component discipline, layered caching, threat-modelled checkout/auth, deliberate money math, documented design tokens. The work to do is concentrated and mostly known; the codebase is **trending healthier, not accruing rot**.

## Cross-cutting findings (independently corroborated)

These were flagged by **more than one agent** — highest confidence:

1. **`getShippingRules()` uncached hot-path** — nextjs (H2) + performance (H1). ~6 DB round-trips per PDP via root layout/top-bar/hero. Wrap in `React.cache` + `unstable_cache`.
2. **Missing Product/Order DB indexes** — performance (C1) + database (M2/H1/H2). Invisible now, a non-linear query cliff as catalogue/orders grow. One migration.
3. **`generateOrderNumber` collision risk, duplicated, no retry** — code-quality (High) + qa (High). `Math.random()` suffix; generic error to blameless customer on `@unique` clash.
4. **CSP `'unsafe-eval'`/`'unsafe-inline'`** — nextjs (H1) + security (M2). Undermines the otherwise-strong header investment.
5. **Serial N+1 in `sitemap.ts` / `llms.txt`** — nextjs (M1) + performance (H2). Batch with one query.
6. **No storefront `loading.tsx`** — nextjs (M5) + ui (M5). Pages stream blank until slowest fetch.
7. **Focus-visible on custom radio/tab widgets** — accessibility (High #1) + ui (M3). Rectangular ring clips `rounded-full` pills.

## Singular but high-severity

- **SSRF in `mirrorRemotePhoto`** (`lib/admin/hero-actions.ts:129–168`) — security H1. Highest single risk.
- **Rich-text regex sanitizer XSS** (`lib/sanitize.ts`) — security M1; rendered to every shopper, CMS-editable.
- **No CI gate runs unit/integration tests** — qa Critical. Money-path regressions ship undetected.
- **`User.role` free-text, not enum** — database H3; silent privilege misconfig surface.

## Consolidated priority backlog

**P0 — security & correctness**
1. SSRF guard in `mirrorRemotePhoto` (host allow-list + private-IP/redirect filtering).
2. Replace regex `sanitizeRichText` with a real HTML sanitizer.
3. Add CI workflow running `npm run test` + `tsc --noEmit` on PR/main.
4. De-dupe + harden `generateOrderNumber` (`crypto.randomInt`, retry-on-P2002).

**P1 — scale & performance**
5. Product/Order composite indexes (one Prisma migration).
6. Cache `getShippingRules` / `getTrustpilotSummary`.
7. Tighten CSP (`unsafe-eval` removal / nonce plan).
8. Parallelise sitemap/llms.txt ingredient loops.
9. `User.role` → `UserRole` enum; `WebVital` retention cron.

**P2 — UX, a11y, polish**
10. `focus-visible` on custom widgets; keyboard nav for "Efter behov" dropdown.
11. Form error association via `Input error` prop.
12. Targeted tests: `validateRedemption`, `buildKlarnaPayload`, `shippingForSubtotal`.
13. Adopt `<Section>` primitive + closed body-type scale; mobile featured-product conversion surface; storefront skeletons.

## Project direction (consensus)

The single-locale, server-component, tag-invalidation foundation is coherent and supports the visible roadmap (knowledge/editorial layer, loyalty/subscriptions, admin CMS). The data model is subscription- and loyalty-ready. The main forward risks are operational, not architectural: **index coverage**, **telemetry retention**, **test/CI safety net**, and **hardening admin-authored input for a multi-author / compromised-admin threat model**. None require a rewrite — all are incremental.
