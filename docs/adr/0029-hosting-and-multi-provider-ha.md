# ADR 0029 — Hosting & Multi-Provider High Availability (Swedish)

**Date:** 2026-05-18
**Status:** Proposed — foundational infra. Gated like the rest of Kine
by GTM validation; HA *tier* is bound to the SLA/pricing decision
(ADR 0026 §7).
**Related:** ADR 0026 (platform; §"operational burden", §7 billing/SLA),
ADR 0028 (multi-tenant foundation), ADR 0022 (preview env),
`docs/strategi/kine-gtm-validering.md`, memory:
`reference_watchtower_multitenant`
**Build plan:** `docs/infra/kine-hosting-plan.md` (concrete 2-provider
Docker+Terraform steps + expansion triggers; provider research)
**Shapes deep-dive:** `docs/infra/kine-infra-shapes.md` (AWS-parity map,
4 costed shapes A–D, "Amazon at a fraction" analysis) — D4 below should
be reconciled to its recommended ladder (B→C→D)

## Context — the honest starting point

biomax.nu runs on a home **NUC**. So does Watchtower
(`deploy-watchtower.sh` — "on the Ampliosoft NUC";
`docker-compose.prod.yml` is a single-host stack: Postgres 18 + Garage
S3 + Inngest behind a shared Traefik). **There is no existing HA
hosting pattern to reuse** — this gap is Ampliosoft-wide, not Kine-only.

A single NUC is fine for one shop or an internal tool. It is
**disqualifying** for a platform whose tenants depend on it for their
livelihood (ADR 0026 explicitly: "infrastructure that other businesses
depend on"). Single points of failure: one box, one power feed, one
network, one disk, one city. No failover, no SLA story, and the
support/SLA row in ADR 0027 is already flagged unanswered.

**Data residency is not just ops — it is the wedge.** "Allt det
svenska" + GDPR-processor (ADR 0026 §5) + Bokföringslagen means tenant
data must stay in **Sweden/EU**, ideally Swedish-owned providers. This
is a sales asset (sovereign, Swedish, resilient), not only a constraint.

## The actual hard problem

Multi-provider "zero downtime" splits cleanly:

- **Stateless tier (easy):** Next.js/web + workers are replaceable.
  Run N instances across ≥2 Swedish providers behind DNS/anycast +
  per-provider Traefik. Provider loss = drain traffic. Solved tech.
- **Stateful tier (the real problem): Postgres.** This is 90 % of the
  difficulty. Cross-provider synchronous replication pays the
  inter-provider RTT on *every write* (latency); asynchronous risks
  data loss (RPO > 0) — and for **bookkeeping data** (Bokföringslagen,
  the wedge) silent data loss is the worst possible failure. Object
  storage (product images, label PDFs, GDPR exports) and the singleton
  cron/Inngest scheduler are secondary stateful problems.

"Zero downtime, multi-provider, active-active" is achievable but
expensive and operationally heavy (Patroni quorum, sync replication,
split-brain fencing). At the mom-and-pop price point (ADR 0027: their
bokföring is Pro-gated at 1 249 kr/mo; we undercut by being native),
**gold-plated HA we can't afford is itself a Tictail-style
margin-killer.** HA tier must match what the validated pricing/SLA can
fund — not aspiration.

## Decision — graduated HA, Swedish-first, tier bound to SLA

### D1 — Leave the NUC for production; Swedish/EU only

Production (and tenant data) moves off the NUC to Swedish providers.
NUC is demoted to dev/CI/backup-target only. No tenant data leaves
SE/EU; processor sub-list (ADR 0026 §5) names the hosting provider(s).

### D2 — Provider shortlist (researched 2026-05-18, evaluate, don't assume)

Swedish-owned, Sweden-located, sovereignty-positioned:

- **GleSYS** — owns its DCs (Falkenberg, Stockholm; +Oulu), since 2003,
  hybrid/sovereign. Strong primary candidate.
- **Elastx** — GDPR-native, data-stays-in-Sweden claim, Vallentuna;
  OpenStack/managed. Strong primary or the second provider.
- **Binero** — Swedish, 100 % renewable, instant scale.
- **Bahnhof** — Stockholm DCs, security-classified sites.
- (Also evaluate City Network/Cleura, Safespring — not in this
  research pass; verify residency + managed-Postgres offering before
  shortlisting.)

Pick **two** for provider independence (different owners, different
DCs/cities). Selection is by **PeeringDB network strength + plain-VPS
+ Terraform** — *not* managed-Postgres (D4 rejects DBaaS). On the
PeeringDB pass (2026-05-18) the chosen pair is **GleSYS (primary) +
Elastx (second)**; Hexabyte demoted to optional cold-DR (no PeeringDB
IX/facility record). See `docs/infra/kine-hosting-plan.md`.

### D3 — Topology: stateless multi-provider now, stateful graduated

- Stateless web/workers: ≥2 instances across the two providers,
  per-provider Traefik, health-checked DNS failover (low TTL) or
  anycast. Custom-domain TLS (ADR 0026 §2) automated per provider.
- This alone removes the "one box / one city" SPOF for the part that's
  cheap to make redundant.

### D4 — Self-managed Patroni on plain VPS from day one; dual-provider gated by GTM Gate 2 (decided)

**No managed DBaaS.** Managed Postgres at GleSYS ≠ managed Postgres at
Elastx — they cannot replicate to each other, so managed DBaaS defeats
the entire reason for two providers and blocks cross-provider failover.
Managed PG would also likely restrict the superuser / `SECURITY
DEFINER` / BYPASSRLS role the ADR 0028 D1 RLS bootstrap needs. So:
**plain Linux VPS everywhere, Postgres self-managed via Patroni,
provisioned by Terraform from day one.**

- **Phase A (day one) — single-provider TRUE HA.** Patroni cluster on
  plain VPS at the primary provider: 2× Postgres (primary+replica),
  3-node etcd quorum, HAProxy/pgBouncer router, pgBackRest **PITR/WAL**
  to object storage + off-site (second provider + NUC, 3-2-1).
  Survives node failure. RTO minutes, RPO ≈ seconds. **≈ 3,800–4,400
  SEK/mo ex-VAT** (see hosting plan cost table).
- **Phase B — cross-provider active-passive. Gated by GTM Gate 2 /
  first paying tenants.** Mirror + async replica at the second
  provider, **independent 3rd-site etcd witness** (2 sites alone =
  split-brain), scripted promotion. Survives provider loss. RTO
  low-minutes, RPO small but > 0 — document it to merchants, never
  imply zero. **≈ 7,500–9,000+ SEK/mo ex-VAT** (Elastx half = quote
  pending; −20–35% with 1–3 yr commit).
- **Phase C (only if a paid SLA tier demands it):** synchronous
  cross-provider for RPO≈0, accepting write-latency + quorum ops cost.
  Likely never for the base segment.

The infra € delta vs managed is modest; the real cost of Phase A
day-one is **owning Postgres Day-2 ops with no managed safety net**
(failover, fencing, PITR-under-pressure, upgrades, game-days). This is
net-new capability for Ampliosoft (Watchtower runs single-host Compose
PG today) — budget the SRE/DBA skill explicitly. Dual-provider HA must
not precede validated revenue (anti-Tictail; ADR 0026/GTM).

Bookkeeping-critical data (verifikat/SIE, ADR 0027 P0) gets the
strictest replication + immutable off-site backup regardless of phase.

### D5 — Secondary stateful

Object storage: replicated/erasure-coded across providers (Garage
already in the Watchtower stack supports multi-node; or provider object
storage with cross-provider copy). Cron/Inngest scheduler: must be a
single active leader with failover (not double-firing across providers)
— leader election or pin to the active DB site.

### D6 — HA tier ⇒ SLA ⇒ price are one decision

We cannot promise merchants 99.9x without funding D4 Phase B/C. The
support/SLA tier (ADR 0027 "Support" row, ADR 0026 §7) and the HA phase
are the **same decision** and depend on GTM-validated willingness to
pay. No SLA number is published until the phase that backs it exists
(consistent with `feedback_no_invented_sla`).

## Migration path (gated)

1. Provider trials: stand up GleSYS + (Elastx|Binero), measure
   inter-provider RTT (sets the sync-vs-async reality for D4).
2. Move biomax.nu (tenant #1) stateless tier off-NUC, NUC → backup
   target. PITR to second provider. (Phase A.)
3. ADR 0028 multi-tenant work lands on this base.
4. Cross-provider active-passive (Phase B) before onboarding external
   tenants at scale / before any SLA is offered.
5. Revisit Phase C only if a paid enterprise tier demands RPO≈0.

Steps 1–2 are low-risk and reversible (GTM Gate-1 era). Steps 4+ are
Gate-2 / first-paying-tenant gated.

## Consequences

**Positive**
- Removes the existential SPOF; makes a Swedish-sovereign,
  resilient-hosting story a *sales* asset aligned with the wedge.
- Graduated HA keeps cost matched to validated revenue (anti-Tictail).
- Fixes an Ampliosoft-wide gap (Watchtower benefits from the same
  pattern/providers).

**Negative / risk**
- Postgres is the crux; cross-provider replication is genuine
  distributed-systems ops (split-brain, fencing, promotion drills).
  Under-investing risks data loss in exactly the bookkeeping data that
  is the wedge; over-investing kills margin.
- Two providers ≈ doubled infra cost + double the ops surface. Must be
  sized against validated pricing, not assumed.
- Operating this is a different team capability than "run a shop"
  (ADR 0026 already flags this; this ADR makes it concrete).

**Open questions**
- *(Resolved — managed-DBaaS rejected, D4: Patroni self-managed on
  plain VPS from day one.)*
- Inter-provider RTT GleSYS(Falkenberg/Stockholm)↔Elastx(Stockholm) —
  sets whether sync replication is ever viable (D4 Phase C). Measure
  via RIPE Atlas, not provider word.
- SRE/DBA capability + game-day cadence for day-one self-managed
  Patroni — who owns it (this is the real cost of D4, not the rental).
- Is hosting a shared Ampliosoft platform decision (Watchtower + Kine
  on one HA substrate) or Kine-specific? (Ampliosoft-level, ADR 0026 §0.)
- Backup/restore drill cadence + who owns the on-call (ADR 0026
  resourcing open question).

Sources (researched 2026-05-18):
- GleSYS — https://glesys.com/
- Adminor, "VPS Sweden comparison 2026" — https://adminor.net/guides/vps-sweden-comparison-2026/
- Swedish cloud / data residency — https://www.server-parts.eu/post/swedish-cloud-providers-sweden
- PostgreSQL HA (Patroni/replication/failover) — https://www.postgresql.org/docs/current/high-availability.html
- Patroni failover patterns — https://dev.to/philip_mcclarence_2ef9475/postgresql-high-availability-patroni-replication-and-failover-patterns-4f6k
