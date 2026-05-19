# ADR 0033 — Tenant Blast-Radius, Noisy-Neighbour, DR & Move-Out

**Date:** 2026-05-19
**Status:** Accepted (now-mitigations) + Proposed (move-out: design
only, build trigger-gated)
**Related:** ADR 0028 (tenancy), ADR 0029 (hosting/HA — whole-DB PITR),
ADR 0030 D6 (tenant lifecycle), ADR 0032 (enforcement model),
ADR 0025 (`lib/gdpr/core.ts` per-subject export), `docs/infra/*`

## Context

The chosen model — shared Postgres + RLS (ADR 0032) — is right-sized
for per-query isolation but, unlike Shopify's pod/shard topology, has a
**shared blast radius**: one DB incident or one hot tenant affects
everyone. As of now this is a documented *intention* (ADR 0028's
one-line deferral), not a documented *capability*: there is no
move-out runbook/infra/code, no per-tenant noisy-neighbour control,
and DR is whole-DB PITR only (ADR 0029), not per-tenant. For
"production-grade, no workarounds" the design, the trigger, and the
cheap-now mitigations must be explicit — not hand-waved.

This ADR owns that. It deliberately splits **do-before-launch** (cheap,
not deferrable) from **design-now / build-on-trigger** (do not
pre-build).

## Decision

### Part A — Now-mitigations (before launch; config, not re-architecture)

- **A1 Noisy-neighbour controls.** Per-tenant query budget via:
  Postgres `statement_timeout` (global default + tighter for the app
  role), a per-tenant connection ceiling at the pooler/app layer, and
  the existing rate-limit buckets keyed by **tenant** (not just IP).
  Goal: one tenant cannot exhaust connections/CPU for all.
- **A2 Per-tenant export.** A whole-tenant logical extract reusing the
  3b `tenantId` scoping + the ADR 0025 GDPR-core pattern (generalised
  from per-subject to per-tenant): emits every owned-model row for one
  tenant **+** its Better Auth `Organization`/`Member`/`Invitation`
  rows + object-storage manifest. This single capability serves three
  needs: tenant offboarding (ADR 0030 D6), per-tenant DR, and the
  first half of move-out (Part B).
- **A3 Per-tenant DR procedure (documented, coarse is acceptable).**
  Whole-DB PITR (ADR 0029) restores the cluster; a *single tenant*
  point-in-time recovery is: restore to a side instance → A2-export
  the tenant at the target time → re-import into prod. Slow but real;
  documented as a runbook, not assumed.
- **A4 Backups verified per the ADR 0029 cadence** include a periodic
  A2 per-tenant export integrity check (not just whole-DB).

A1–A4 are in scope for the pre-launch hardening (3b-5).

### Part B — Tenant move-out (the Shopify "shop mover"): design now, build on trigger

**Not pre-built.** Designed and runnable-on-paper now; implemented only
when the trigger fires.

- **Trigger (explicit):** a single tenant exceeds a defined share of DB
  size or sustained load (set the concrete % at the first capacity
  review), **or** a tenant buys a contractual isolation/SLA tier.
  Absent the trigger, do not build it.
- **Target topology:** the over-large tenant moves to its **own
  Postgres** (own pod, ADR 0029 graduated model); the platform keeps
  routing by host → that tenant's connection string instead of the
  shared cluster. Same codebase; per-tenant DB resolution at the data
  seam (ADR 0032 D2 is the natural injection point).
- **Procedure (runbook outline):**
  1. Provision target DB + the least-privilege role (ADR 0032 D6),
     run migrations.
  2. A2 logical export of the tenant (consistent snapshot, LSN noted).
  3. Import into target; verify row counts + the cross-tenant test
     suite (ADR 0032 D5) against the target.
  4. Brief write-freeze for that tenant (status `SUSPENDED`,
     ADR 0030 D6), ship the delta since the snapshot.
  5. Cutover: tenant's host → target connection (config flip at the
     seam); flip status `ACTIVE`.
  6. Verify; keep source rows read-only for a rollback window; then
     purge from the shared cluster (RLS-scoped delete).
  - **Rollback:** at any step before purge, revert the host→DB mapping;
    source data is still authoritative until the purge window closes.
- **Ordering / hazards to encode in the runbook:** the 32 `tenantId`
  tables in FK-safe order; Better Auth `Organization`/`Member`
  (library-owned, not `tenantId`-scoped — keyed via the org→tenant
  link); object storage (per-tenant prefix copy); idempotency for
  resumable transfer; the checkout atomic-tx invariant must not be
  mid-flight during the freeze.

## Consequences

**Positive**
- Closes the honest "documented intention, not capability" gap: the
  resilience story is now explicit, with the cheap parts scheduled and
  the expensive part designed + trigger-gated (no premature build).
- A2 is high-leverage: one capability = offboarding + DR + move-out
  half. Build it once.
- Mirrors Shopify's proven "move a shop out" without adopting
  pods/sharding platform-wide.

**Negative / risk**
- Shared blast radius persists until a tenant actually triggers Part B.
  Accepted at launch scale; A1 limits the common noisy-neighbour case;
  whole-DB HA/PITR (ADR 0029) covers infra failure.
- Move-out is genuine distributed-cutover engineering; the runbook
  reduces but doesn't remove risk — first execution must be rehearsed
  on a non-critical tenant (e.g. `demo`) before a real one.

**Open questions**
- Concrete trigger thresholds (DB %, load) — set at first capacity
  review with real data, not guessed now.
- Pooler choice for A1 per-tenant connection ceilings (pgbouncer vs
  app-layer) — decide in 3b-5 alongside the ADR 0029 hosting build.
