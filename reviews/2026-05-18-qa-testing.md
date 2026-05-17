# QA & Testing Review — biomax.nu

- **Agent:** qa-expert
- **Date:** 2026-05-18 · **Commit:** 2fb7538 · **Mode:** read-only

## Summary

Thoughtful, risk-focused QA posture: every existing test covers a financially/operationally critical invariant (oversell, refund idempotency, webhook dedupe, subscription double-claim), with genuinely high quality (no happy-path theater). But coverage is extremely sparse in absolute terms. Widest gaps: the entire loyalty math surface, 30+ admin server actions, the Kustom payload builder (`buildKlarnaPayload`), VAT arithmetic, subscription renewal cron — none have a single test. **No CI gate runs the unit/integration suites** — only Lighthouse/axe. A regression in stock/order-status/refund logic would ship undetected.

## Strengths

- Real concurrency tests at DB layer (`stock.integration.test.ts` — 10 concurrent `$transaction`, asserts oversell invariant).
- Idempotency proven not assumed (`return-actions.integration.test.ts`, `idempotency.integration.test.ts`).
- Pure-function tests are real (`status.test.ts` full state machine incl. double-settlement/resurrection).
- Production-grade infra: separate unit/integration vitest configs, DB safety rail (refuses non-`_test` URLs), serial-fork pooling.
- Strong static gates: TS strict, ESLint core-web-vitals, Zod at every boundary.
- Observability wired: Sentry DSN-gated, `onRequestError`, web-vitals reporting.

## Findings

### Critical
- **No CI gate on unit/integration tests** — only `.github/workflows/lighthouse.yml`. `npm test` / `test:integration` never run in CI.
- **`validateRedemption` zero coverage** (`lib/loyalty/burn.ts:37–58`) — pure, 5 error branches, controls customer checkout discount.
- **`buildKlarnaPayload` tax arithmetic untested** (`lib/klarna/cart-to-order.ts:41–69, 163–188`) — gross-inclusive VAT formula + discount cap; rounding error = Kustom/DB disagreement.

### High
- Loyalty `awardOrderPoints`/`reverseOrderPoints` no coverage (`lib/loyalty/earn.ts:19–150`); `redeemPointsForOrder` double-spend path uncovered despite "CRITICAL" comment.
- `shippingForSubtotal` boundary untested (`cart-to-order.ts:89–101`) — null threshold, exact-threshold, throw fallback.
- No test for any admin mutation incl. `updateOrderStatus` (`lib/admin/order-actions.ts`) — Kustom capture/refund/cancel branching.
- `generateOrderNumber` collision risk, no test (`order-actions.ts:99–107`, cron `:41`).

### Medium
- Subscription renewal cron price-recompute logic untested.
- `placeOrder` bundle discount calc untested (`order-actions.ts:267–271`).
- `pushAuthorized` constant-time compare unverified for timing-oracle correctness.

### Low
- No e2e (Playwright not installed) — no smoke for checkout/cart/login/2FA.
- Lighthouse CI seed leaves `[slug]` routes 404 — PDP/monograph/landing never perf/a11y-regression-tested.

## Recommended Test Plan (prioritized)

1. **CI gate (1 day)** — `ci.yml` running `npm run test` (+ `tsc --noEmit`) on PR/main.
2. **`lib/loyalty/burn.test.ts`** — `validateRedemption` 5 branches + boundaries (½ day, no infra).
3. **`lib/klarna/cart-to-order.test.ts`** — VAT formula, discount cap, shipping boundary (½ day).
4. **`shippingForSubtotal`** unit (2 h).
5. **`loyalty.integration.test.ts`** — earn/reverse idempotency + concurrent double-spend (1 day).
6. **`orderNumber` uniqueness** — verify constraint + dedupe test (½ day).
7. **Playwright checkout smoke** (2 days).

## Project Direction

Testing philosophy is correct (prove what costs money, at the right layer). Gap: applied only to checkout/stock/refund, not yet to loyalty/pricing/shipping which are equally load-bearing. Sentry + strict TS + Zod give defense-in-depth compensating for low count — not a test-free codebase hoping for the best.

## Top 3 Priorities

1. Add `npm run test` to CI (one-file, one-hour, immediately protects money-path invariants).
2. `lib/loyalty/burn.test.ts` for `validateRedemption` (~3 h, runs every redeeming checkout).
3. `lib/klarna/cart-to-order.test.ts` for `buildKlarnaPayload` tax (~4 h, authoritative amounts to Kustom).
