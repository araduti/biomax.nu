# ADR 0032 — Tenant Data-Access Enforcement Model

**Date:** 2026-05-19
**Status:** Accepted (supersedes the implicit approach in ADR 0028 D1's
"$extends sugar" aside; the enforcement *model* is now explicit)
**Related:** ADR 0028 (tenancy mechanism / RLS), ADR 0030 (modular
monolith, D3 module boundaries), ADR 0033 (blast-radius / move-out),
`lib/tenant/rls.ts`, `lib/tenant/context.ts`, migrations
`20260519160000_rls_bootstrap`, `…170000_rls_product_pilot`,
`…180000_app_role_rls`

## Context

3b proved, in dev, that tenant isolation works end-to-end:
`tenantId` + `FORCE ROW LEVEL SECURITY` + `withTenantRLS`
(`SET LOCAL`) + a least-privilege role → `demo` cannot see `biomax`'s
data. The open question is **how isolation is *guaranteed* across ~32
owned models and hundreds of call sites — production-grade, no
workarounds.**

Two naïve options were evaluated and **rejected as the primary
guarantee**:

- **Manual `withTenantRLS` per accessor.** Guarantee = "every developer
  remembers, forever." One miss = silent leak (permissive) or outage
  (strict). Fails regression-safety by construction. Fine as a *call
  pattern*, unacceptable as the *guarantee*.
- **Fully automatic `$extends` + ALS, zero call-site changes.** Next
  App Router has no single choke point (unlike Watchtower's tRPC
  `createContext`); RLS needs `SET LOCAL` inside the query's
  transaction (a request-wide interactive tx breaks RSC streaming and
  hits Prisma tx timeouts); `$extends` does not see `$queryRaw`, the
  checkout 5-domain `$transaction`, or cron/Inngest code. "Magic, zero
  changes" hides the gaps it cannot cover — itself a workaround.

### Alternatives considered — why not Shopify-style sharding

Shopify isolates via **MySQL sharded by `shop_id` + Pods** (physically
isolated datastores; shared compute reaches one pod at a time; the
"shop isolation principle"), with the guarantee in **topology +
app-level scoping + heavy tooling/tests** — not a per-query DB ACL.
That model exists to solve *planetary scale* (no single DB holds
millions of shops) and *platform blast-radius containment*. At Kine's
scale (hundreds–low-thousands of small SE tenants, single region) it
is massive premature complexity, and notably its per-query safety is
*weaker* than DB-enforced RLS (a forgotten filter can leak within a
shard; they spend enormous tooling to prevent it). We deliberately
choose the opposite end, right-sized. The Shopify "shop mover"
escape-hatch is adopted, but deferred and trigger-gated — ADR 0033.
(Counter-view acknowledged: PlanetScale argues against RLS-as-primary
— policy misconfig, pooling pain. Our compensating controls below
answer exactly that.)

## Decision

The guarantee lives in the **database (fail-safe)**; the application is
made **correct-by-construction and CI-enforced** — not by discipline.

### D1 — RLS is the hard boundary: strict, fail-safe, everywhere

Every tenant-owned model gets `ENABLE` + `FORCE ROW LEVEL SECURITY`
with **strict** `USING` *and* `WITH CHECK` policies keyed on
`app.current_tenant_id()`. **No permissive `OR … IS NULL` branch in
production.** Forgetting the context yields **zero rows / a write
error**, never another tenant's data. The boundary does not depend on
application correctness.

### D2 — One sanctioned data-access seam, lint-enforced

All tenant-owned reads/writes go through a thin per-domain
repository / `tenantDb()` layer that internally runs `withTenantRLS`.
**Direct `prisma.<ownedModel>` outside the seam is banned by an ESLint
rule + a dependency-cruiser arch test that fails CI.** This realises
ADR 0030 D3 (module boundaries) and converts "did we remember?" into a
build failure. Better Auth identity tables, `Tenant`, `PlatformAdmin`,
and global infra/telemetry are explicitly outside the seam (not
tenant-scoped).

### D3 — Tenant context resolved at real entry points

RSC loaders pass the resolved tenant explicitly into the seam (correct
for the framework — not a workaround); server actions, route handlers
and per-tenant cron iterations use `lib/tenant/context` ALS where the
boundary is clean. The D2 lint guarantees the seam is used, so context
is always required to satisfy types.

### D4 — Cache isolation is codified, not remembered

A `tenantCache()` helper that **always** prefixes the tenant into the
key; raw `unstable_cache` (and ad-hoc route caching) for tenant data
banned by lint. Tenant-scoped routes are `dynamic` (or per-tenant
tagged) — Next's route cache is path-keyed, not Host-keyed, so a
non-dynamic tenant route is a cross-tenant HTML leak (proven on the
PDP, 3b-3b).

### D5 — Permanent cross-tenant test suite

Seed ≥2 tenants with data; assert, per domain, that reads **and**
writes cannot cross. Runs in CI. This is what keeps D1–D4 true over
time and catches RLS policy misconfiguration (the PlanetScale risk).

### D6 — Least-privilege role is mandatory in every environment

Runtime connects as a `NOSUPERUSER NOBYPASSRLS` role. Missing app-role
config **fails boot** — it must not silently fall back to a privileged
connection (the current `APP_DATABASE_URL ?? DATABASE_URL` fallback is
dev scaffolding, removed at lock-down).

### D7 — The checkout atomic transaction stays atomic

`withTenantRLS` becomes the *outer* transaction of the existing
5-domain checkout write (`SET LOCAL` then the current order/stock/
loyalty/subscription writes in the same tx). `WITH CHECK` blocks
cross-tenant writes. No nested-tx hackery.

## Must un-ship before production (currently transitional — on the record)

- Permissive RLS policy branch (`OR app.current_tenant_id() IS NULL`)
  → strict (D1).
- `APP_DATABASE_URL` falling back to `DATABASE_URL` → mandatory (D6).
- Dev role password in a migration → infra/vault-provisioned (ADR 0029).
- `notFound()` → HTTP 200 on tenant-scoped PDP (flagged, separate task).

## Consequences

**Positive**
- Isolation is guaranteed by Postgres (fail-safe on developer error)
  and regressions are prevented by CI (correct-by-construction) — the
  only model that is *both*. Stronger per-query safety than Shopify's
  app-level scoping, at a fraction of the tooling cost.
- The seam (D2) doubles as ADR 0030 D3's module-boundary enforcement.

**Negative / risk**
- Upfront infrastructure (seam + lint + arch-test + test suite) before
  the per-domain rollout is mechanical. Accepted: it is the cost of a
  guarantee vs a hope.
- RLS-as-primary has known critiques (policy misconfig, pooling);
  mitigated by D1 strictness, D5 tests, the proven `SET LOCAL`-in-tx
  pattern, and D6.
- Shared-DB blast radius / noisy-neighbour is **out of scope here** and
  owned by ADR 0033 (the Shopify-pod gap, consciously deferred).

**Revisit trigger:** a tenant large enough to warrant physical
isolation → adopt the ADR 0033 move-out (Shopify "shop mover"), not a
platform-wide re-architecture.
