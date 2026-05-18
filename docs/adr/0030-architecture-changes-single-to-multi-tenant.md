# ADR 0030 — Architecture Changes: Single-Tenant → Multi-Tenant (and the Monolith vs Microservices decision)

**Date:** 2026-05-18
**Status:** Proposed
**Related:** ADR 0026 (Korg platform), **ADR 0028** (multi-tenant
coupling audit + RLS/identity — *the tenancy mechanism lives there;
this ADR does not restate it*), ADR 0029 (hosting/HA), ADR 0027
(feature roadmap), memory `reference_watchtower_multitenant`
**Basis:** fresh domain-boundary + transaction-coupling analysis of
the biomax codebase, 2026-05-18.

## Context

ADR 0028 audited *what is coupled to single-tenant assumptions* and
fixed the isolation mechanism (RLS via tx-scoped `SET LOCAL`, Better
Auth org-plugin identity — Watchtower-proven). This ADR answers the
next question: **what does the application architecture itself have to
become**, and specifically — **monolith or microservices?**

The codebase analysis is decisive on the second point, so it leads.

### The structural reality (evidence)

biomax is a **tightly-coupled transactional monolith**, and that
coupling is a *correctness asset*, not accidental debt:

- **Order placement is one atomic 5-domain transaction**
  (`lib/checkout/order-actions.ts:378–888`): a single
  `prisma.$transaction` writes address + order + items + **stock
  decrement** + **loyalty burn** + **subscription create**. All-or-
  nothing.
- **Order status change** (`lib/admin/order-actions.ts:81–164`)
  orchestrates Klarna settle/refund + loyalty reversal around the DB
  mutation.
- **Loyalty** (`lib/loyalty/…`) keeps ledger + cached balance coherent
  in one transaction; idempotent on `kind+orderId`.
- **No data-access layer.** Every server action / RSC imports `prisma`
  directly; the only seam is the `lib/prisma.ts` proxy.
- Domains are otherwise reasonably clean: `products` is read-only wrt
  orders; `loyalty`/`subscriptions` don't import `checkout`; external
  integrations (Kustom, PostNord, Brevo) are each behind a single
  client facade.

## Decision

### D1 — Modular monolith. **Not** microservices. (decided)

Stay a single deployable, single database. Splitting order/stock/
loyalty/subscription into services would convert one ACID transaction
(`order-actions.ts:378–888`) into a **distributed saga with
compensations** — replacing a database guarantee with hand-rolled
eventual consistency in the exact path where money, stock and
bookkeeping must not drift. Estimated 4–6 weeks of architecture work
plus a permanent operational tax (sagas, dead-letter queues,
distributed tracing, replay/idempotency) for **no benefit at this
scale** (one shop at launch; pooled small tenants after — ADR 0028).
Microservices solve team-scaling and divergent-scaling problems we do
not have. The atomic transaction is the feature.

### D2 — Introduce the one missing abstraction: a tenant-aware data seam

The single highest-leverage change. Today there is no DAL — every
handler hits `prisma` directly, so tenant scoping has nowhere to live.
Add the request-scoped tenant context + `withTenant`/`withRLS`
wrapper **exactly per ADR 0028 D1** (Watchtower `withRLS`: interactive
`$transaction` + `SET LOCAL`, FORCE RLS, `SECURITY DEFINER` bootstrap).
Every entry point (server actions, route handlers, RSC loaders, crons)
acquires tenant context at the top and all `prisma`/`$transaction`
calls run inside it. This is pervasive but mechanical, and it is the
prerequisite for everything else. (Mechanism: see ADR 0028 — not
restated here.)

### D3 — Harden module boundaries (the modular in modular-monolith)

Make domain boundaries explicit so the monolith stays maintainable
*and* a future single-domain extraction is possible without a rewrite:

- Each domain exposes an explicit module API (functions); other
  domains call that, not each other's tables.
- **One documented exception, deliberately preserved:** the checkout
  atomic transaction may write order+stock+loyalty+subscription
  directly — that is the intentional consistency boundary, annotated
  as such in code.
- Add an architecture test / lint rule that fails when a domain
  reaches into another domain's tables outside its module API or the
  documented checkout boundary. This is cheap, prevents rot, and is
  the *only* "microservices-readiness" investment worth making now
  (boundaries, not processes).

### D4 — Split the *process*, not the *data*

Where scaling axes genuinely diverge, run extra **processes of the
same codebase against the same DB** — no new services, no RPC, no
distributed txn:

- **Stateless web/catalog**: N replicas, Bunny-cached, horizontally
  scaled (ADR 0029 / infra-shapes). Same code, same DB.
- **Async/scheduled workers**: the `app/api/cron/*` jobs become
  per-tenant-iterating workers run as their own process/schedule
  (subscription renewals, abandoned-cart, review-requests, welcome-
  series, data-retention). They are the natural async seam and are
  already separate handlers.

### D5 — Make non-atomic side-effects a reliable in-process outbox

Side-effects that are *already* fire-and-forget (transactional email,
GSC/LLM probes, webhook fan-out, loyalty-reversal-on-cancel) become a
**transactional outbox** (DB-backed) drained by the existing
Inngest/worker — reliable + per-tenant, **not** a Kafka/event-mesh.
This gives at-least-once delivery for the things that legitimately
shouldn't be inside the order transaction, without distributed-systems
weight.

### D6 — Tenant lifecycle is net-new architecture

Single-tenant has no concept of this; multi-tenant requires it as a
first-class surface:

- **Provision**: create-tenant seeds the rows that ADR 0028 D5 turns
  from code into data (settings, branding tokens, contact, SEO,
  knowledge base, anonymization domain) + per-tenant integration
  credentials (ADR 0028 D4).
- **Suspend / resume**, **export** (reuse the GDPR core, now
  tenant-scoped — ADR 0028), **hard-delete** on offboarding SLA.
- Onboarding (the `{shop}.korg.nu` shell, ADR 0026 §2) is part of this
  surface.

### D7 — Tenant-scoped caching/ISR (correctness, not optimization)

Restated as an architecture change because it is load-bearing: all
cache keys/tags and revalidation are tenant-prefixed (ADR 0028 D7).
A global cache tag in a multi-tenant monolith is a cross-tenant data
leak, not a perf bug.

## Consequences

**Positive**
- Cheapest correct path: the ACID guarantees that protect money/stock/
  bokföring are *kept*, not re-implemented as sagas.
- D2/D3 are mechanical and high-leverage; the platform stays one
  reasoned codebase the small team can hold in its head.
- D3's module boundaries make a *future, surgical* single-domain
  extraction possible **if** a real scaling axis ever appears — option
  preserved without paying for it now.
- Aligns with the converged infra (single-provider self-healing pod,
  ADR 0029): a monolith + one Postgres is exactly what that substrate
  is sized for.

**Negative / risk**
- Modular-monolith discipline must be *enforced* (D3 lint/arch-test) or
  it silently rots back into a big ball of mud.
- The big atomic transaction now also threads tenant context — a
  missed path is a correctness *and* isolation bug (mitigated by D2
  RLS: the DB refuses cross-tenant rows even if app code slips).
- Scaling is per-DB (vertical → read-replica → shard-by-tenant), not
  per-service. Accepted: matches the segment (many tiny tenants) and
  ADR 0028's pooled-RLS model; sharding is a far-future, well-trodden
  path.

**Revisit microservices only when** a single domain has a scaling or
release-cadence axis that vertical+replica+shard cannot satisfy (e.g.
checkout CPU isolation under synchronized flash sales, or an
independent team owning one domain). Then extract **that one domain**
behind the module API D3 already established — never a wholesale split.
Until that trigger is concrete and measured, D1 stands.

## Open questions

- Outbox (D5): reuse self-hosted Inngest (already in the stack) vs a
  minimal DB-queue + worker — decide during D5 build, bias to Inngest
  (no new infra).
- D3 enforcement tooling: ESLint boundaries plugin vs a custom
  dependency-cruiser arch test — spike, pick the lowest-friction.
- Sequencing vs ADR 0028: D2 (tenant seam) and the 0028 RLS work are
  the same change — execute once, not twice. This ADR's D3–D7 follow.
