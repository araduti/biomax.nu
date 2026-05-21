# Kine — "Amazon infra at a fraction", deep dive on the 4 shapes

**Status:** Brainstorm/analysis for ADR 0029. No decision committed —
input for picking the launch→scale ladder. Researched 2026-05-18.
**Related:** ADR 0029 (hosting/HA), `docs/infra/kine-hosting-plan.md`,
ADR 0028 (multi-tenant), ADR 0026 (platform), GTM validation.

Goal stated by the user: **AWS-class capability, fraction of the cost,
purpose-built for (Swedish) ecommerce.** That is achievable — *because*
we are single-market (sv-SE wedge): we don't need AWS's global breadth,
so we don't pay for it.

## AWS → Kine parity map (the heart of "Amazon at a fraction")

| AWS service | Kine self-hosted (Swedish) | Cost shape |
|---|---|---|
| ALB / NLB | Traefik (or HAProxy) on the nodes | included in VPS |
| EC2 / ECS / Fargate | plain VPS + **Docker Swarm** | GleSYS VPS |
| RDS Multi-AZ Postgres | **GleSYS Managed PG** *or* **Patroni (RAFT, no etcd)** | 725 managed / ~2×849 self |
| ElastiCache (Redis) | **Valkey** (Redis fork) co-located or 1 small VPS | 0–298 |
| S3 | **Garage** (already in Watchtower stack) / SeaweedFS / GleSYS object | 0.62/GB or self-on-disk |
| CloudFront | **Bunny.net** (EU/Slovenia, GDPR, $0.005/GB) | usage, €1/mo min |
| Route 53 | GleSYS/deSEC/Cloudflare DNS API | ~free |
| ACM (TLS) | Let's Encrypt via Traefik | free |
| CloudWatch / X-Ray | **Prometheus + Grafana + Loki** (+ existing Sentry) | 1 small VPS |
| SQS / EventBridge | self-hosted **Inngest** (Watchtower already runs it) | included |
| Secrets Manager | SOPS+age / Infisical | ~free |
| WAF | Traefik+Coraza, or Elastx WAF (Phase D) | included/provider |
| Auto Scaling Group | Swarm `service scale` + Terraform add-VPS | scripted, not elastic |
| Backup / PITR | **pgBackRest** → object storage, 3-2-1 | storage only |

**2026 corrections from research:** MinIO went maintenance-mode/
archived (Feb–Apr 2026) — **do not use MinIO**; use **Garage**
(lightweight, geo-distributed, S3, already Watchtower's choice) or
SeaweedFS. **Bunny.net** beats Cloudflare on the sovereignty wedge
(EU-domiciled vs US/CLOUD-Act) at $0.005/GB EU.

## The AWS cost anchor (so "a fraction" is honest, not a slogan)

A *modest but real* AWS production ecommerce (ALB + RDS Multi-AZ +
2× ECS + CloudFront + ElastiCache) lands ≈ **$400–1,200+/mo**
(~SEK 4,300–13,000): ALB alone ~$16 floor and ~$250 at real ecommerce
traffic; Multi-AZ doubles the DB; CloudFront $0.085/GB EU. Kine Shape B
(below) ≈ **SEK ~1,600 (~€140)**. That is **~¼–⅛ of AWS** — the
"fraction" is real, with the honest caveats in the last section.

---

## Shape A — Mono-node (Kamal)

**Topology:** 1 VPS (4 vCPU/8 GB/100 GB) running the whole Compose
stack (Next app + Postgres 18 + Traefik + Valkey + Inngest) deployed
via **Kamal 2** (SSH+Docker, zero-downtime rolling, free). Bunny CDN in
front. pgBackRest WAL/PITR → GleSYS object storage + off-site.

- **Cost:** 849 + object ~60 + Bunny ~€5 ≈ **~950 SEK/mo**.
- **AWS-equivalent:** single EC2 + local services ≈ $150–300/mo.
- **HA:** none. Host dies → **restore from PITR, ~10–30 min RTO**, RPO
  ≈ seconds (WAL). Reproducible via Terraform+cloud-init.
- **Ops:** ~0.05 FTE.
- **Ecommerce fit:** fine for **launch with biomax (tenant #1)** and a
  handful of small tenants, *including* a small-shop Black Friday if
  the box is sized with headroom (vertical slack is cheap: jump to
  6/20/250 = 1,979 for a weekend).
- **Scale/lego:** vertical only. This is the floor, not the future.
- **Graduate when:** first *paying external* tenant, or minutes-RTO
  becomes unacceptable.

## Shape B — Managed-PG + Kamal app  ← recommended launch

**Topology:** **GleSYS Managed PG** (2 vCPU/8 GB, HA + daily backups +
patching by provider) + 1 app VPS (Kamal) + Valkey co-located + Bunny
CDN + pgBackRest *also* shipping WAL off-site (don't outsource your
only copy).

- **Cost:** 725 (managed PG) + 849 (app) + ~60 obj + €5 CDN ≈
  **~1,600 SEK/mo** (start app at 2/2/50=298 → ~1,050).
- **AWS-equivalent:** RDS Multi-AZ + 1 EC2 + CloudFront ≈ $400–700/mo.
  **This is the headline "fraction": ~€140 vs ~$500.**
- **HA:** the part that matters (orders, bokföring/SIE data) is HA +
  backed up + patched by the provider. App is single (Kamal redeploy
  ~minute; add a 2nd app node anytime).
- **Ops:** ~0.05 FTE — *no database Day-2 ops*.
- **Ecommerce fit:** strong. For ecommerce the data is the crown
  jewel (Bokföringslagen, ADR 0027 P0); buying its HA for 725 with
  zero ops is the best money in the whole plan.
- **Caveats (verify, don't assume — spike):** (1) GleSYS Managed PG
  must allow a CREATEROLE admin + `SECURITY DEFINER` for the ADR 0028
  RLS bootstrap — research says managed PG generally supports this
  (you don't need superuser for RLS), but confirm per-provider.
  (2) Managed lock-in only bites at **cross-provider** (Shape D) — at
  single-provider launch it is a non-issue.
- **Scale/lego:** app → Swarm (Shape C fabric) when >1 node; DB →
  bigger managed plan or read-replica.

## Shape C — Lean self-HA (Patroni RAFT + Swarm)  ← when a paid SLA needs it

**Topology (research-corrected, leaner than my earlier 4,400):**
2× Postgres running **Patroni in RAFT mode — no external etcd cluster**
(consensus embedded; +1 tiny witness for quorum), HAProxy/pgBouncer
router, **Docker Swarm** for the app/stateless tier (3 managers for
quorum, app co-located on managers to start), Valkey, Garage for
object, Prometheus/Grafana/Loki on a small node.

- **Cost:** 2×849 PG + 140 witness + 2×849 app/Swarm + ~140 monitor +
  ~110 obj ≈ **~3,000–3,800 SEK/mo** (RAFT removes the 3 etcd boxes
  the textbook build assumed).
- **AWS-equivalent:** self-managed RDS-MultiAZ + ASG + ElastiCache ≈
  $800–1,500/mo.
- **HA:** automatic Postgres failover < 60 s, RPO ≈ 0–seconds; Swarm
  reschedules app on node loss. Single-provider (survives node, not
  provider, loss).
- **Ops:** ~0.2–0.3 FTE — **you now own Postgres Day-2** (failover
  drills, PITR-under-pressure, upgrades, game-days). Net-new Ampliosoft
  capability (Watchtower runs single-host Compose PG today).
- **Ecommerce fit:** full single-region HA; zero-downtime deploys via
  Swarm `--update-order start-first --update-failure-action rollback`;
  blue-green < 30 s for Black Friday.
- **Scale/lego:** **this is the lego fabric** — `docker service
  scale` + Terraform-add a 298–849 VPS as a Swarm worker when CPU/RAM
  saturates. Tenants are pooled (one RLS DB, ADR 0028) so new
  customers add ≈ **zero** infra; you scale by *load*: vertical PG →
  read-replica → (only at thousands of tenants) Citus/shard.
- **Graduate when:** GTM Gate 2 / provider-loss risk must be covered.

## Shape D — Cross-provider (GleSYS + Elastx)

**Topology:** Shape C mirrored to Elastx, **independent 3rd-site etcd/
RAFT witness** (2 sites alone = split-brain), health-checked DNS
failover, Garage geo-replicated, scheduler single-leader pinned to
active DB site.

- **Cost:** ≈ **7,500–9,000+ SEK/mo** (Elastx half quote-pending — not
  fabricated; −20–35 % with 1-yr commit).
- **AWS-equivalent:** multi-region RDS + cross-region infra ≈
  $2,000–4,000+/mo.
- **HA:** survives a whole provider; RTO low-minutes, RPO small but
  > 0 (document it; never imply zero).
- **Ops:** ~0.3–0.5 FTE + cross-provider game-days.
- **Graduate when:** paying tenants / sold SLA fund it (ADR 0029 D6).
  Not before — this is the anti-Tictail line.

---

## What you do NOT get vs AWS — and whether it matters

| Lose vs AWS | Matters for Kine? |
|---|---|
| Infinite elastic autoscale | **Mostly no.** Swedish retail load is predictable; pre-provision headroom + Swarm scale + a weekend vertical bump covers Black Friday. True elasticity is for spiky global apps — not a Kållered-shop platform. |
| Global anycast / 300 PoPs | **No — it's a *win*.** Single-market SE; Bunny EU PoPs are plenty, and keeping data in Sweden is the *wedge*, not a gap. |
| "Someone else's pager" (managed everything) | **Partly.** Shape B keeps the DB pager with the provider. Shape C/D you own it — budget the SRE/DBA capability honestly. |
| 200+ AWS services breadth | **No.** Ecommerce needs ~12 primitives (table above); we have all of them. |
| US-hyperscaler compliance paperwork | **Inverted.** Swedish/EU self-host *is* the compliance story (GDPR processor, Bokföringslagen) — sovereignty as product. |

Net: for a **single-market ecommerce SaaS**, ~all the AWS *value* is
replicable at ¼–⅛ the cost. The parts you give up are the parts a
Swedish mom-and-pop platform structurally doesn't need — and one of
them (data stays in Sweden) is the actual moat.

## Recommended ladder

**B at launch** (~1,600/mo, HA where it matters, ~zero DB ops) →
**C when a paid SLA appears** (~3–3.8k, own the DB, Swarm = lego
scale) → **D at GTM Gate 2** (~7.5–9k, provider-loss). Bunny CDN +
Garage + Prom/Grafana/Loki from day one (cheap, AWS-parity). Kamal
from A/B, Swarm from C.

---

# Part 2 — engineering depth (dig-further on all four)

## Cross-cutting (true for every shape — decide once)

- **PCI scope is unchanged by host choice.** Card data never touches
  us (Kustom-hosted checkout → SAQ-A, per the PCI ADR work). AWS vs
  Swedish VPS makes **zero** PCI difference — don't let anyone argue
  "AWS is more secure for payments"; it's irrelevant here.
- **Bokföringslagen durability (7 yr) is non-negotiable, all shapes.**
  pgBackRest full+diff+WAL, **3-2-1**: local repo + GleSYS object +
  off-site (Elastx/NUC), retention-locked bucket. **Monthly restore
  drill is a hard requirement** — research is blunt: "the only way to
  know your RTO/RPO are realistic is to practice restores." Untested
  backup = no backup.
- **Zero-downtime deploys:** Kamal `kamal-proxy` rolling (A/B); Swarm
  `--update-order start-first --update-failure-action rollback` (C/D).
  DB migrations **expand-contract only** — never a destructive change
  in the same deploy as the code that needs the old shape.
- **Observability + SLOs:** Prometheus+Grafana+Loki + existing Sentry.
  Define SLOs now (checkout-success %, order-write success, p95 TTFB)
  — these *are* the ceiling for any merchant SLA (ADR 0029 D6).
- **Secrets:** SOPS+age, git-encrypted, delivered at boot; documented
  rotation. No plaintext in Terraform state.
- **Tenant cache/file isolation (ADR 0028 D7) applies on every shape**
  — Bunny cache keys + Garage paths prefixed `t:{tenantId}` or it's a
  cross-tenant leak regardless of how cheap the box is.

## Shape A — mono-node, deep

**Inventory (1× GleSYS 4 vCPU/8 GB/100 GB):** Kamal app + **Postgres
as a Kamal accessory** bound `127.0.0.1:5432` with a mounted volume
(documented best practice, not a hack) + Valkey + kamal-proxy/Traefik
+ self-hosted Inngest + pgBackRest sidecar.

| Line item | SEK/mo |
|---|---|
| VPS 4/8/100 | 849 |
| Object storage (PITR ~50 GB @0.62) | ~31 |
| Bunny CDN (low volume, €1 min) | ~55 |
| **Total** | **~935** |

**Failure modes → RTO/RPO (derived, not asserted):**
- container crash → Docker auto-restart, seconds.
- host/disk loss → Terraform+cloud-init rebuild (~10–20 min) +
  pgBackRest restore. Launch DB is small (biomax ≈ <20 GB) → base
  restore **<15 min over 1 Gbps** + WAL replay → **RTO ≈ 20–40 min,
  RPO ≈ seconds** (`archive_timeout`). Honest, and already far better
  than the NUC.
- provider outage → rebuild at other provider from off-site backup =
  **hours**. Accepted at launch only.
**Black Friday (1 small shop):** vertical bump 4/8 → 6/20/250 (1,979)
for the weekend via one `terraform apply`; Bunny absorbs catalog
reads; pgBouncer caps PG connections. Sufficient for a single shop.
**Migrate-off trigger (quantified):** first paying *external* tenant,
OR sustained CPU > 60 %, OR 20–40 min RTO becomes unacceptable.

## Shape B — managed-PG + Kamal app, deep  ← recommended launch

**Inventory:** GleSYS Managed PG (2 vCPU/8 GB/50 GB, HA + daily backup
14-day) + app VPS (Kamal) + Valkey co-located + Bunny + **our own**
pgBackRest/`pg_dump` off-site copy (never rely solely on the
provider's backup — Bokföringslagen control + exit).

| Line item | SEK/mo |
|---|---|
| Managed PG 2/8/50 (HA+backups incl.) | 725 |
| App VPS 4/8/100 (or 2/2/50 = 298 to start) | 849 |
| Object (own backup copy ~50 GB) | ~31 |
| Bunny CDN | ~55 |
| **Total** | **~1,660** (~1,100 small app) |

**Failure → RTO/RPO:** DB node fail → **provider auto-failover
(seconds–minute, per their SLA — verify the number)**, RPO per
provider. App fail → Kamal redeploy (~1 min) or add a 2nd app node.
Provider outage → both down (single provider; accepted pre-Gate-2).
**Why best for launch:** the data that matters (orders, SIE/verifikat)
is HA + backed-up + patched **with the provider holding that pager**
for 725 SEK. Lowest ops of any HA option.
**Go/no-go spike (load-bearing):** GleSYS Managed PG must allow a
CREATEROLE admin + `SECURITY DEFINER`/`BYPASSRLS` for the ADR 0028 RLS
bootstrap, **and** logical-replication/`pg_dump` egress for our own
off-site copy. If either is blocked → fall to Shape C at launch.

## Shape C — Patroni-RAFT + Swarm, deep  ← when a paid SLA needs it

**Inventory:** 2× Postgres (Patroni **RAFT**, consensus embedded — no
etcd cluster) + 1 tiny RAFT witness + HAProxy/pgBouncer (co-located on
app) + Docker **Swarm** (3 managers, app co-located) + Valkey + Garage
(object; **MinIO is out as of 2026**) + Prom/Grafana/Loki node.

| Line item | Qty×unit | SEK/mo |
|---|---|---|
| Postgres (Patroni RAFT) | 2 × 849 | 1,698 |
| RAFT witness | 1 × 140 | 140 |
| App / Swarm managers | 2 × 849 | 1,698 |
| 3rd Swarm manager (quorum) | 1 × 140 | 140 |
| Monitoring (Prom/Grafana/Loki) | 1 × 140 | 140 |
| Object storage | — | ~70 |
| **Total** | | **~3,886** (~3,000 co-located/smaller) |

**Failure → RTO/RPO:** PG primary loss → Patroni RAFT election
**< 30–60 s**, HAProxy reroutes; RPO ≈ 0 (sync) / ≈ seconds (async).
RAFT quorum = 3 voting members (2 PG + witness) → survives 1 loss.
Swarm node loss → reschedule (manager quorum = 3). Provider loss →
still down (single provider; that's Shape D).
**Owned Day-2 runbooks (the real cost):** monthly failover game-day;
PG **minor** upgrade = rolling via replica (no downtime); PG **major**
upgrade = `pg_upgrade`/logical with a **brief, scheduled** window
(honest: not zero — plan it); pgBackRest verify; replica lag alerts.
**Lego scale:** Swarm worker add via Terraform when sustained
CPU/RAM > ~65 %; pooled RLS DB (ADR 0028) → new tenants ≈ **zero**
infra; scale by load: PG vertical → read-replica (catalog is
read-heavy) → Citus/shard only at thousands of tenants.

## Shape D — cross-provider, deep

**Inventory:** Shape C at **GleSYS + Elastx**, **independent 3rd-site
RAFT/etcd witness** (a tiny third location — NUC or a 3rd provider —
so quorum survives losing a whole provider), async streaming
GleSYS→Elastx, health-checked DNS failover, Garage geo-replication,
scheduler single-leader pinned to the active DB site.

| Side | SEK/mo |
|---|---|
| GleSYS side (full Shape C) | ~3,900 |
| Elastx side (mirror + standby) | ~3,000–4,500 *(quote pending)* |
| Independent 3rd-site witness | ~140–300 |
| **Total** | **~7,500–9,000+** (−20–35 % w/ 1-yr commit) |

**Failure → RTO/RPO:** provider loss → scripted promotion at Elastx,
**RTO low-minutes, RPO > 0** (async — document it, never imply zero);
independent witness + fencing prevents split-brain.
**Gating measurable:** GleSYS(Falkenberg/Stockholm)↔Elastx(Stockholm)
RTT via **RIPE Atlas** decides whether sync (RPO≈0, D4 Phase C) is
ever viable; both on Netnod/STHIX so the path *should* stay on Swedish
IX fabric (sovereignty for replication traffic — verify).
**Gate:** GTM Gate 2 / a sold SLA funds it. Not before (anti-Tictail).

## Honest RTO/RPO summary

| Shape | RTO | RPO | Survives | Owns the pager |
|---|---|---|---|---|
| A | ~20–40 min | ~seconds | process/disk (via restore) | us (low) |
| B | seconds–min (DB) | provider SLA | node | **provider** (DB) |
| C | < 60 s (DB) | ~0–seconds | node | **us** (DB Day-2) |
| D | low-minutes | > 0 (async) | **provider loss** | us (high) |

## Capacity model + scaling levers (what ~€150 launch holds)

**It is not "N customers" — it is aggregate peak load.** The cluster
doesn't care how many tenants exist (pooled RLS, ADR 0028); it cares
about concurrent req/s, DB writes/s, and working-set/storage. Swedish
mom-and-pop shops are individually tiny (often <1 req/s, mostly idle),
so the multiplier is large but driven by *statistical multiplexing of
idle-ish tenants*, not a per-tenant quota.

**Binding constraints, in order (launch box: 3×2 vCPU/2 GB app + Managed
PG 2 vCPU/8 GB + Bunny):**

| Constraint | Headroom | Bites when |
|---|---|---|
| App RAM (2 GB/node) | floor — Next + Swarm agent | often first → bump to 4 GB tier |
| Origin CPU (~4–5 usable vCPU) | Bunny absorbs cached catalog → origin = cart/checkout/account/admin/search; ~200–400 dyn req/s | synchronized peaks |
| Managed PG (2 vCPU/8 GB) + pgBouncer | ~low-hundreds OLTP q/s | real concurrent checkout volume |
| PG storage 50 GB | orders accrue (Bokföringslagen 7 yr) — slow | never (cheap plan bump) |
| Object storage | linear, ~free/GB | never |

**Planning estimate (hypothesis, not an SLA):** with typical
low-volume shop traffic ≈ **100–400 small shops** (a few hundred) on
the ~€150 box, large headroom. Breaks if: a few *busy* shops dominate
(5 busy ≫ 200 idle), or **everyone's Black Friday is the same
weekend** (the one real risk — handled by levers, not by year-round
over-provisioning).

**Unit economics:** ~€150 ÷ a few hundred shops ≈ **€0.40–1.50 infra
/shop/mo** — a rounding error vs any plan price. The wall is a knob,
not a rebuild.

**Scaling levers (cheap, revenue-tied — the lego payoff):**

| Signal | Lever | Cost step |
|---|---|---|
| App CPU/RAM > ~65 % sustained | add a Swarm worker (Terraform, zero-downtime) | ~€15–30/mo/node |
| Checkout/DB load climbs | bump Managed PG one tier / add read-replica | ~€60/mo step |
| Catalog read-heavy | already on Bunny; raise ISR TTLs | ~0 |
| Provider-loss risk must be covered | Shape D (2nd provider) | Gate-2 / paid-SLA only |

Each lever fires only when paying demand has already arrived → infra
scales with revenue, not ahead of it (anti-Tictail).

## Verification spikes before committing

1. **GleSYS Managed PG**: confirm CREATEROLE admin + `SECURITY
   DEFINER`/`BYPASSRLS` role creation for the ADR 0028 RLS bootstrap;
   real backup-restore RTO; replica/scaling options. (Decides B vs C
   at launch.)
2. **Object storage**: Garage vs SeaweedFS pick (MinIO is out, 2026);
   confirm S3 API coverage for our uploads + pgBackRest target.
3. **Bunny.net**: Nordic PoP/latency test from SE; confirm EU-only
   data path for the sovereignty claim.
4. **Pre-launch biomax load test (blocking, with a target).** Replay
   biomax's real request mix against the launch box (3×2 vCPU/2 GB +
   Managed PG + Bunny). **Targets to validate before go-live:**
   sustained **≥ 300 dynamic req/s** at p95 TTFB < 500 ms with the
   catalog Bunny-cached, **≥ 50 concurrent checkouts/s** without PG
   connection exhaustion, and graceful behaviour at 1.5× peak. Output:
   the validated "shops the box holds" number (replaces the
   ~100–400 hypothesis) + the Black-Friday vertical-bump runbook.
   *Until this passes, the capacity model is a hypothesis, not a
   commitment (no SLA implied — ADR 0029 D6).*
5. **GleSYS↔Elastx RTT** (RIPE Atlas) — only gates Shape D.
