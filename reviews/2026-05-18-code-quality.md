# Code Quality Review — biomax.nu

- **Agent:** code-reviewer
- **Date:** 2026-05-18 · **Commit:** 2fb7538 · **Mode:** read-only

## Summary

Notably healthy, senior-grade codebase (~383 TS/TSX files). Type discipline excellent: a single `any`/`as any` in the whole tree, and it's inside a comment. Server actions follow a consistent trust-boundary pattern (zod `safeParse` → `fail()` → typed `ActionResult`). Security-sensitive paths show real threat modeling (constant-time compare, fail-closed auth, idempotency, server-recomputed prices, atomic stock reservation). Comments explain *why* and reference ADRs. Findings are refinements, not rescue work.

## Strengths

- Centralised, uniform trust boundaries (`lib/validation/shared.ts`); Swedish error copy never leaks zod paths.
- Defense-in-depth admin authz: `requireAdmin` (`lib/admin/guard.ts`) re-queries DB, mandatory 2FA, applied at layout + every mutating action.
- Idempotency taken seriously (`order-actions.ts:886–907`, `klarna/route.ts:93–111`).
- Deliberate money math — öre rounding, VAT stored as basis points per order (`order-actions.ts:365–368`).
- Near-zero debt markers: 2 TODO/FIXME total.

## Findings

### High
- **Duplicated `generateOrderNumber()` with collision risk, no retry.** Identical in `lib/checkout/order-actions.ts:99` and `app/api/cron/subscription-renewals/route.ts:35`. `Math.random()` 4-digit suffix (~9000/day); `orderNumber` is `@unique` (`schema.prisma:385`) but `placeOrder` catch (`order-actions.ts:463–469`) doesn't distinguish a unique collision and returns a generic error to a blameless customer. *Fix: one `lib/orders/order-number.ts`, `crypto.randomInt`, retry-on-P2002.*

### Medium
- **Read-only admin loaders rely on ambient layout guarding.** `lib/admin/seo-analysis.ts`, `stats.ts`, `content-backlog.ts`, `web-vitals.ts`, `uptime.ts` query admin data with no `requireAdmin`. Safe only via guarded layout; fragile if reused in a route handler. *Fix: add cheap `await requireAdmin()` (React-cached, near-free).*
- **Orphaned `eslint-disable`** at `app/api/cron/subscription-renewals/route.ts:66` — dead from a prior refactor, misleading. *Fix: delete.*

### Low
- Repeated `parseFloat(decimal.toString())` for Prisma `Decimal`→number across ~10 files — consolidate to `decimalToKr()` in `lib/format.ts`.
- `ensureOrderFromKustomOrder` ~390 lines (`order-actions.ts:617–1004`) — extract line-resolution + merchant_data parsing into pure, testable functions.

## Project Direction

Trending healthier, not accruing debt. Zero meaningful `any`, two TODOs, ADR references, integration tests beside risky modules, Prisma-discipline note in AGENTS.md from hard-won ops knowledge. Existing debt is the good kind — small duplications and a couple organic god-functions in the highest-churn area (checkout), not architectural rot. Reads like a codebase consistently maintained by someone applying review feedback.

## Top 3 Priorities

1. De-duplicate + harden `generateOrderNumber` (one module, `crypto.randomInt`, retry-on-collision). Highest customer impact.
2. Add explicit `requireAdmin()` to read-only admin loaders.
3. Decompose `ensureOrderFromKustomOrder` into testable units (riskiest money path, currently only integration-testable).
