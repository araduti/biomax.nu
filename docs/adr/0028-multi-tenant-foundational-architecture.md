# ADR 0028 — Multi-Tenant Foundational Architecture & Single-Tenant Coupling Audit

**Date:** 2026-05-18
**Status:** Proposed — foundational. **Pins ADR 0026 §1's mechanism**
(RLS confirmed correct; mechanism = tx-scoped `SET LOCAL`, proven in
Watchtower — see D1).
**Related:** ADR 0026 (platform), ADR 0027 (feature roadmap),
ADR 0003 (auth), ADR 0022 (preview env), ADR 0023–0025 (GDPR/consent),
`docs/strategi/kine-gtm-validering.md` (gates build)
**Basis:** evidence-based code audit of the single-tenant codebase
performed 2026-05-18 (two independent passes: data/identity, and
config/infra).

## Why this ADR exists

ADR 0026 §1 recommended **Postgres RLS as the security boundary** as a
strategy-level assertion without reading the runtime. The code audit
(below) is broader than "add `tenantId`" and initially suggested RLS
was unsafe on the pooled stack. That intermediate conclusion was
**wrong**: Watchtower (in-house, same stack) runs exactly this in
production. ADR 0026 §1's RLS instinct was right; what was missing was
the *mechanism* (transaction-scoped `SET LOCAL`, not a bare session
GUC) and the breadth of non-DB coupling. This ADR records the real
basis and pins the proven mechanism.

## The coupling, with evidence (not a sketch)

**1. Schema — ~17 global `@unique` constraints break.**
`prisma/schema.prisma`, 45 models. Globals that must become composite
`@@unique([tenantId, x])`: `User.email` (38), `Category.slug` (139),
`Product.sku` (153), `Product.slug` (154), `BlogPost.slug` (377),
`Order.orderNumber` (399), `Order.paymentReference` (408),
`Order.trackingToken` (456), `Coupon.code` (582),
`NewsletterSubscriber.email` (608), plus bundle/cross-sell/wishlist FKs.
**Hard constraint:** `User/Session/Account/Verification/TwoFactor`
(36–135) schema is dictated by Better Auth's Prisma adapter — fields
cannot be renamed and `Session.token`/`Account` uniqueness is library-
owned. Tenant scoping of identity cannot be done by schema edit alone.

**2. Isolation mechanism — ADR 0026 §1 is wrong as written.**
`lib/prisma.ts` uses `@prisma/adapter-pg` (pooled) behind a Proxy that
*rebuilds the client* on dev regenerate, with no `$extends`/query
middleware. A per-request `SET app.tenant_id` GUC for native RLS is
**unsafe on a pooled connection** — the GUC leaks across requests that
reuse the connection unless every request is wrapped in an explicit
transaction issuing `SET LOCAL`, or runs on a dedicated connection.
True RLS is therefore not free here; it costs a transaction-per-request
wrapper or connection-per-tenant pooling.

**3. Identity/session — no tenant context anywhere.**
`lib/session.ts` resolves the session by token globally via
`auth.api.getSession`; `lib/admin/guard.ts` re-queries the user by id
with no tenant check; **no `middleware.ts` exists**. Email is globally
unique, so the same person cannot be a customer of two shops.

**4. ~13 config singletons** read once from `process.env`: Klarna/
Kustom creds + webhook secret (`lib/klarna/client.ts:36,61`,
`cart-to-order.ts:54`), Brevo (`lib/email/client.ts:13`), PostNord
(`lib/postnord/booking.ts:44`, with `"Biomax HB"` baked into the label
envelope at :135/:140), Plausible, Trustpilot, GSC, Sentry, Unsplash,
`CRON_SECRET`, `BETTER_AUTH_*`. None is request-scoped.

**5. Biomax-the-shop is currently code, not data.** `lib/site/settings.ts`
defaults, `lib/jsonld.ts:20` (`Biomax Handelsbolag`), domain hardcoded
in `app/robots.ts`/`app/sitemap.ts`/`lib/auth.ts`, brand tokens in
`app/globals.css`, root metadata in `app/layout.tsx:67`, the knowledge
base `lib/knowledge/ingredients.ts`, the anonymization sentinel domain
`@anonymized.biomax.nu` (`lib/gdpr/core.ts:67`), even a hardcoded
`COMEBACK10` coupon in `abandoned-cart`.

**6. Every cron is an untenanted global sweep.**
`abandoned-cart`, `low-stock-alert`, `review-requests`,
`subscription-renewals`, `welcome-series` all `findMany` with no shop
filter and send from the global `FROM_EMAIL`.

**7. Cache + files are a cross-tenant leak vector.** `lib/cache/tags.ts`
tags are slug-only (`product:${slug}`) — revalidating shop A's product
poisons shop B's identical slug. Images write to flat
`public/products/{slug}-…` and labels to `public/labels/{orderNumber}`
— collisions across shops. `next.config.ts` CSP/image domains are
build-time singletons; per-tenant custom domains/trackers need
per-request headers.

**8. GDPR scope inversion.** `lib/gdpr/core.ts` aggregates/erases by
global user/email; `data-retention` purges globally; `AdminAuditEntry`
has no tenant. As a *processor* (ADR 0026 §5) every one of these must be
tenant-scoped and authorization must prove the actor administers *that*
tenant.

## Reference implementation: Watchtower (proven, in-house)

The two scariest items below are **not unknowns** — Ampliosoft already
runs them in production in Watchtower (`/Users/adrian.raduti/watchtower-dev`),
on the *same* stack (Better Auth + Prisma + `pg.Pool` + Postgres). The
audit's "RLS infeasible" verdict reasoned about a *naive* session GUC;
Watchtower solves it. Kine ports this pattern rather than inventing one.

- **Identity:** Better Auth **`organization` plugin** maps Organization
  1:1 to a Workspace/tenant; `activeOrganizationId` rides in the
  session; `Workspace.betterAuthOrgId → Workspace.id` translation in
  session resolution; `member`/`invitation` tables + `ac`/roles RBAC.
  Evidence: `packages/auth/src/auth.ts:178` (organization plugin),
  `packages/auth/src/session.ts:50-84` (org→workspace mapping).
- **RLS, made pool-safe:** `withRLS()` runs work inside a Prisma
  **interactive `$transaction`** and issues `SET LOCAL
  app.current_workspace_id = '…'` — `SET LOCAL` is cleared on
  commit/rollback, so it **cannot leak across pooled connections**.
  Evidence: `packages/db/src/rls.ts:60-115`. Identifiers are
  regex-validated before interpolation (`SET` can't be parameterised).
- **Chicken-and-egg bootstrap:** the Workspace lookup needed to set the
  RLS variable can't itself be RLS-gated, so a `SECURITY DEFINER`
  function `app.resolve_workspace_from_org(orgId)` (BYPASSRLS) resolves
  it. Evidence: `packages/auth/src/session.ts:61-72` + RLS migrations
  under `watchtower-dev/prisma/migrations/*rls*`.

## Decisions

### D1 — Isolation: Postgres RLS via transaction-scoped `SET LOCAL` (re-affirms ADR 0026 §1's instinct; fixes the mechanism)

The enforced boundary **is** Postgres RLS — ADR 0026 §1 was
directionally right; my earlier audit-derived reversal was wrong
because it assumed a *bare* session GUC. The correct, proven mechanism
is Watchtower's `withRLS()`: every tenant-scoped operation runs in a
Prisma interactive `$transaction` that first issues `SET LOCAL
app.current_tenant_id`. `FORCE ROW LEVEL SECURITY` policies on every
tenant table do the enforcement; a missing app-layer `where` cannot
leak because the database itself refuses cross-tenant rows.

**Accepted cost (not infeasibility):** every tenant-scoped request is
wrapped in a transaction. Watchtower pays this in production; it is the
price of a real boundary, not a blocker. An optional Prisma `$extends`
+ `AsyncLocalStorage` layer is *ergonomic sugar* on top (so call sites
don't pass tenant id explicitly) — **not** the security boundary.

**Consequence:** the ADR 0026 §1 annotation is updated — RLS is
restored as the boundary, with the mechanism pinned to
transaction-scoped `SET LOCAL` per Watchtower, not a bare GUC.

### D2 — Identity: port Watchtower's Better Auth `organization` pattern (no spike needed)

The "highest-risk unknown" is resolved. Adopt the Better Auth
`organization` plugin: Organization 1:1 `Tenant`, `activeOrganizationId`
in session, `Tenant.betterAuthOrgId` mapping, `member`/`invitation` +
`ac`/roles for merchant staff RBAC. The library-owned
User/Session/Account schema is **left untouched** — tenancy rides on
the plugin's `organization`/`member` tables and the active-org session
field, exactly as Watchtower does, *not* by tenant-scoping the User
table. Shop-customer-vs-merchant-staff is modelled as
membership/role, not a User schema change. Work item is a **port**,
not research; biomax differences (Next server actions/RSC instead of
tRPC; the `lib/prisma.ts` rebuild Proxy) are the real porting effort —
see risks.

### D3 — Tenant resolution

New `middleware.ts`: resolve tenant from host (`{shop}.kine.se` /
custom domain), reject unknown hosts, put `tenantId` into
`AsyncLocalStorage`. `currentUser()`/`requireAdmin()` validate
membership of the resolved tenant.

### D4 — Per-tenant config plane

A KMS-encrypted per-tenant credential/config store replaces the ~13
env singletons; integration clients take tenant context, not module-
load env. Per-request CSP/image-domain headers move into middleware.

### D5 — Extract "biomax-the-shop" into tenant data

Settings, branding tokens, contact, SEO, knowledge base, anonymization
domain, hardcoded coupons become rows owned by a tenant. No string
`"biomax"` in platform code (ADR 0026 §0).

### D6 — Crons become per-tenant

Single dispatcher iterating tenants (or per-tenant schedule), every
sweep gains a tenant filter, sender resolved per tenant.

### D7 — Namespace cache + files by tenant

All cache tags prefixed `t:{tenantId}:`; all file paths under
`shops/{tenantId}/`. Treated as a security control (cross-tenant cache
poisoning / file collision), not cleanup.

## Revised migration (risk-first, supersedes ADR 0026 §"Migration" ordering)

0. **Port Watchtower `@…/auth` + `@…/db` rls pattern** — organization
   plugin + `withRLS()` (tx-scoped `SET LOCAL`) + `SECURITY DEFINER`
   bootstrap, biomax as sole tenant. A port of proven code, not a spike.
1. **Apply RLS policies + `withRLS` wrapper** across biomax's data
   access (server actions / RSC loaders), biomax as the sole tenant;
   `FORCE ROW LEVEL SECURITY` on tenant tables, behaviour unchanged.
   Proves the boundary under real traffic. Optional `$extends`/ALS
   sugar so call sites don't thread tenant id.
2. Schema: composite uniqueness; `Tenant`/`Membership`; audit gains
   tenant.
3. Config plane (D4) + biomax-as-data extraction (D5), still single
   tenant.
4. Crons (D6), cache/file namespacing (D7).
5. Middleware tenant resolution + custom domains.
6. Per-tenant GDPR/processor surfaces.

Phases 0–1 are the reversible spike ADR 0026 Phase 1 / GTM **Gate 1**
authorizes. Everything from 2 on is gated by **Gate 2**.

## Risk register

- **Catastrophic: cross-tenant data leak.** One unscoped query or
  poisoned cache tag exposes another merchant's customers. RLS (D1) +
  D7 make this structurally hard; it remains the defining risk and the
  reason RLS must be the DB-enforced boundary, not a convention.
- **Porting surface, not feasibility (the real risk).** Watchtower
  proves the pattern but on tRPC, where one `createTRPCContext` wraps
  every call in `withRLS`. biomax has **no equivalent choke point** —
  many Next server actions + RSC loaders each hit Prisma directly.
  Retrofitting the transaction wrapper across all of them (without
  missing one) is the actual hard work; mitigation is the optional
  `$extends`/ALS sugar so the wrapper is implicit, plus a lint/test
  that fails on un-wrapped tenant-table access.
- **Proxy ↔ transaction.** `lib/prisma.ts`'s rebuild Proxy binds
  methods to the live client; `$transaction` + `SET LOCAL` must work
  through it, and the flagged Prisma-7 self-heal-path bug interacts
  here — verify early.
- **Performance.** Every tenant-scoped request becomes a transaction
  (Watchtower's accepted cost). Measure under biomax's RSC read volume;
  it is a known tradeoff, not an unknown.

## Open questions

- Shared catalog vs per-tenant catalog (audit flagged Order/Review →
  Product FKs could cross tenants if catalog is shared). Decide before
  schema work; affects RLS policy shape.
- Reuse Watchtower's `@watchtower/auth` + `@watchtower/db` as shared
  packages, or fork/port into the Kine repo? (Cross-repo coupling vs
  duplication — an Ampliosoft-level decision, ADR 0026 §0.)
- ADR 0026 §1 annotation updated to "RLS via tx-scoped SET LOCAL per
  ADR 0028 D1 (proven in Watchtower)" — done; confirm wording.
