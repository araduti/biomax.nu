# Korg — Hosting Build Plan (2 VPS providers, Docker + Terraform)

**Status:** Plan, executes ADR 0029 (graduated HA). Gated by GTM (Gate 1
= biomax-only off-NUC; Gate 2+ = cross-provider before external scale).
**Related:** ADR 0029 (hosting/HA), ADR 0028 (multi-tenant),
`docs/strategi/korg-gtm-validering.md`, memory:
`reference_watchtower_multitenant` (Watchtower's single-host
docker-compose is the starting shape).

## Provider verdict (researched 2026-05-18 — read before planning)

Strato dropped (German residency, no SLA, no backups, no Terraform).
Replaced with **GleSYS** at the user's direction.

| | **Hexabyte.se** (primary) | **GleSYS** (second) |
|---|---|---|
| Location | **Umeå, SE** (own AS, triple-replicated NVMe, 100% renewable) | **Falkenberg + Stockholm, SE** (Tier III, 2N, sovereign) |
| Wedge fit | Strong — *svenskt*, sovereign | Strong — *svenskt*, sovereign |
| Automation | **OpenStack** → `terraform-provider-openstack` | **Official `glesys/glesys` Terraform provider** (registry) + GleSYS API + cloud-init |
| SLA | confirm (object storage available) | **99.95% SLA**, tiers Basic/Bronze/Gold |
| Backups | object storage; backup = confirm | automated backup **paid add-on**; dynamic scale w/o downtime |
| Price | 35–1060 kr/mo | from ~48 kr/mo entry; larger tiers exist |

### Network / peering (PeeringDB, checked 2026-05-18)

- **GleSYS AS42708:** 15 IXPs incl. **Netnod Stockholm BLUE+GREEN**,
  **STHIX Stockholm/Gothenburg/Copenhagen**, ~358 peers, 36 facilities.
  Carrier-neutral, well-connected, verifiable.
- **Hexabyte AS215273:** **no public IX and no facilities listed in
  PeeringDB** (record stale since 2024-05), single v4+v6 prefix. Their
  "own AS / redundant connectivity" claim is **not verifiable** —
  likely plain upstream transit, or just an unmaintained PeeringDB.

**Implication — recommended primary/second flip.** Original draft made
Hexabyte primary. On network evidence, **GleSYS is the better primary**
(mature peering, real 99.95% SLA, verifiable resilience); **Hexabyte =
independent Swedish second/DR**. Both still Swedish + Terraform, so the
wedge and tooling are unchanged; this only reassigns roles to the
better-connected network. *Confirm after the diligence below — do not
finalize on marketing claims.*

**Cross-provider path matters for sovereignty too:** GleSYS sits on
STHIX/Netnod in Stockholm. If the Umeå↔Stockholm/Falkenberg
replication path rides Swedish IX fabric, inter-provider traffic stays
in Sweden (transit sovereignty — reinforces the wedge). If Hexabyte is
transit-only, that path is unverified and could hairpin abroad —
**measure, don't assume.**

**Decision:** **both providers Swedish, both Terraform-managed.**
Provider independence (different owner, different cities: Umeå vs
Falkenberg/Stockholm). **GleSYS primary (pending diligence), Hexabyte
second.** GleSYS Gold 99.95% SLA is the floor that lets ADR 0029 D6
publish a merchant SLA (can't promise above the substrate).

## Toolchain reality (no fantasy IaC)

Terraform does **not** uniformly manage these. Split honestly:

- **Terraform manages BOTH now:** Hexabyte via
  `terraform-provider-openstack`; GleSYS via the **official
  `glesys/glesys` provider** (`glesys_server` etc.). Plus **DNS**
  (API provider — Cloudflare/desec) for health-checked failover and
  TLS/edge. State in Hexabyte object storage (S3-compat) + locking,
  **not** in git. The split-toolchain caveat from the Strato draft is
  largely gone — one `terraform apply` can stand up both sides.
- **Still cloud-init for host config:** Terraform provisions the box;
  **cloud-init + git-pinned Compose** configures it. Cattle, not pets;
  rebuild on change (GleSYS supports live scale, but treat nodes as
  replaceable anyway).
- **Config/runtime layer:** Docker + **Docker Compose pinned in git**
  (Watchtower's shape: Traefik edge + app + Postgres + object store +
  scheduler). Image tags pinned by digest. Host bootstrap via
  cloud-init → pull repo → `docker compose up`. Optionally Ansible for
  host hardening if Compose-in-cloud-init gets unwieldy.
- **Secrets:** not in git, not in Terraform state plaintext. A secrets
  store/SOPS-encrypted file delivered at boot; rotate-able.
- **Immutability:** treat every node as rebuildable from
  Terraform+cloud-init (scale = launch new, drain old), regardless of
  whether the provider supports live resize.

## What you need (accounts / prerequisites)

- Hexabyte account with **OpenStack API credentials** (application
  credential) + confirm: OpenStack API exposed to customers? SLA?
  managed Postgres? snapshot/backup? → send the "provider asks" below.
- GleSYS account with **API token + userid** (the `glesys/glesys`
  Terraform provider needs both); decide SLA tier (Basic/Bronze/**Gold
  99.95%**) — this sets the ceiling for any merchant SLA (ADR 0029 D6).
- A DNS provider with an API + Terraform provider (for health-checked
  failover). Domain `korg.nu` (pending trademark, ADR 0026).
- Object storage bucket (Hexabyte) for: Terraform state, Postgres
  WAL/PITR archive, app uploads (ADR 0029 D5).
- Git repo `korg-infra` (Terraform + compose + cloud-init + runbooks),
  separate from app repo.
- A secrets mechanism (SOPS+age, or a small vault).

**Provider asks (email both before committing):**
1. Hexabyte: OpenStack API exposed on the VPS tier? rate limits?
   GleSYS: API token/userid scope + provider rate limits?
2. Hexabyte: written SLA figure? GleSYS: which SLA tier do we need for
   99.95% and at what cost? (Sets ADR 0029 D6 ceiling — no merchant
   SLA above the substrate's.)
3. *(Managed Postgres question dropped — ADR 0029 D4 rejects DBaaS;
   self-managed Patroni on plain VPS. Still ask: snapshot/volume +
   object-storage durability for pgBackRest.)*
4. **GleSYS(Falkenberg/Stockholm) ↔ Elastx(Stockholm) RTT** (sets
   sync-vs-async, ADR 0029 D4 Phase C). Both are on Netnod/STHIX
   Stockholm so the path *should* stay on Swedish IX fabric — measure
   independently via **RIPE Atlas / looking-glass**, don't assume.
5. Block storage IOPS + API-driven volume snapshots, both providers.
6. GleSYS load-balancer price (not published) + Gold-SLA cost.
   Elastx: confirm OpenStack API/Terraform scope + quote for the
   Phase-B mirror. (Hexabyte only relevant if kept as cold-DR.)

## Step-by-step build, with expansion triggers

### Decision (ADR 0029 D4)

**No managed DBaaS — plain Linux VPS everywhere; Postgres self-managed
via Patroni, Terraform from day one.** Phase A = single-provider TRUE
HA (real Patroni cluster, day one). Phase B = cross-provider
active-passive, **gated by GTM Gate 2 / first paying tenants**. The
infra € delta vs managed is modest; the real cost is owning Postgres
Day-2 ops with no managed safety net — budget the SRE/DBA skill.

### Phase 0 — Foundations (no prod traffic) — *GTM Gate-1 era*
1. `korg-infra` repo: Terraform skeleton, remote state in GleSYS
   object storage (S3-compat) + lock.
2. Terraform (`glesys/glesys`): 1 instance, network, security group
   (80/443 + SSH from bastion), object bucket.
3. cloud-init: Docker, Compose, non-root, ufw, auto security updates,
   SSH keys-only.
4. Compose stack (Watchtower-shaped): Traefik (ACME TLS) + hello app +
   Postgres 18 + object store + scheduler. Prove deploy + TLS once.
5. `pgBackRest` → object storage, **PITR**; test a restore *before* any
   real data.
   **→ Expand when:** reproducible from `terraform apply` + cloud-init
   with zero manual steps, and a restore drill passed.

### Phase A — biomax.nu off the NUC, single-provider TRUE HA (Patroni day one) — *Gate 1*
6. Terraform the full GleSYS Patroni topology: **2× Postgres
   (primary+replica) + 3-node etcd quorum + HAProxy/pgBouncer router**
   + 2× app behind Traefik. Plain VPS, no managed PG.
7. Migrate biomax.nu (tenant #1, ADR 0028; `withRLS` works — own
   superuser, no DBaaS restriction). NUC → backup target + dev only.
8. pgBackRest WAL/PITR to GleSYS object storage **and** off-site
   (Elastx + NUC), 3-2-1.
9. DNS low-TTL; **tested** automated Patroni failover (not just
   documented) + first **game-day** (kill the primary node).
   **→ Expand when:** a node-kill game-day meets RTO/RPO, biomax runs a
   week off-NUC, p95 acceptable. (RTO minutes, RPO ≈ seconds.)

### Phase B — Second provider, cross-provider active-passive — *Gate 2 / pre-external-scale*
10. Add **Elastx** as provider #2 (OpenStack → `terraform-provider-
    openstack` module; GleSYS stays `glesys/glesys`).
11. Stateless app instances live on **both** providers; Traefik on
    each; **health-checked DNS failover** (or anycast if available).
12. Postgres: async streaming replica at Elastx + **independent
    3rd-site etcd witness** (2 sites alone = split-brain); **scripted
    promotion** + fencing. Document the real RPO (> 0) — never imply
    zero (ADR 0029 D6, `feedback_no_invented_sla`).
13. Object storage replicated/copied cross-provider. Scheduler/cron =
    single leader pinned to active DB site (no double-fire,
    ADR 0029 D5).
14. Game-day: kill provider #1, measure real RTO/RPO, fix the runbook.
    **→ Expand when:** a provider-loss game-day meets the RTO/RPO you
    can *honestly* sell, and only then publish an SLA tier.

### Phase C — Synchronous / RPO≈0 — *only if a paid tier demands it*
15. Sync replication for bookkeeping-critical data
    (verifikat/SIE, ADR 0027 P0), accepting write-latency + quorum ops.
    Likely never for the base segment — revisit per pricing.

## Cost by phase (GleSYS list price, SEK/mo, ex-VAT, before commit discounts)

GleSYS units: 4 vCPU/8 GB/100 GB = **849**, 2/2/50 = **298**,
1/1/20 = **140**, object **0.62/GB**. 1–3 yr commit ≈ **−20–35 %**.

**Phase 0 — Foundations**

| Item | SEK/mo |
|---|---|
| 1 small VPS + object storage + TF state | **≈ 350–450** |

**Phase A — single-provider TRUE HA (Patroni, day one)**

| Component | Qty × unit | SEK/mo |
|---|---|---|
| Postgres primary+replica | 2 × 849 | 1,698 |
| etcd quorum | 3 × 140 | 420 |
| App nodes | 2 × 849 | 1,698 |
| Edge / HAProxy / scheduler | 1 × 298 | 298 |
| Object storage (WAL/PITR ~150 GB) | — | ~110 |
| Monitoring | 1 × 140 | 140 |
| **Total** | | **≈ 4,400** (**≈ 3,800** etcd/monitoring co-located) |

**Phase B — cross-provider active-passive (Gate 2)**

| Side | SEK/mo |
|---|---|
| GleSYS side | ~4,000 |
| Elastx side (mirror + standby) | ~3,000–4,500 *(quote pending — not fabricated)* |
| Independent 3rd-site etcd witness | ~140–300 |
| **Total** | **≈ 7,500–9,000+** (≈ 6,000–7,000 with 1-yr commit) |

**Phase C** — sync RPO≈0: only if a paid tier funds it; revisit.

The infra € delta vs managed DBaaS is modest; the load-bearing cost is
**owning Postgres Day-2 ops with no managed safety net**. Keep spend
matched to GTM-validated pricing — dual-provider HA must not precede
paying tenants (anti-Tictail; ADR 0026/0029).

## Risks / decisions to confirm

- **Day-1 self-managed Patroni = owned Day-2 ops, no safety net.**
  Decided (ADR 0029 D4), not optional. Failover/fencing/PITR-under-
  pressure/upgrades/game-days are net-new Ampliosoft capability
  (Watchtower runs single-host Compose PG today). The cost is the
  SRE/DBA skill, not the rental — fund it explicitly.
- **Two Terraform providers, not one.** GleSYS (`glesys/glesys`) and
  Elastx (OpenStack) are separate providers/modules — the Patroni/
  failover module must be abstracted or written twice. Accept it.
- **Managed PG verification no longer needed** (DBaaS rejected) — but
  self-hosted PG means we own the `SECURITY DEFINER`/BYPASSRLS RLS
  bootstrap with full superuser: a *benefit* (ADR 0028 D1 just works).
- **GleSYS SLA tier is a cost decision.** 99.95% is the *Gold* tier;
  Basic/Bronze are lower. The merchant-facing SLA (ADR 0029 D6) can't
  exceed the tier we actually pay for — decide deliberately, don't
  assume Gold.
- **Backups are a paid add-on on both** — budget it; PITR to object
  storage is still ours to run regardless.
- **Hexabyte network unverifiable (open).** No PeeringDB IX/facility
  record; resilience is a marketing claim until diligence #6 answers
  it. This is *why* GleSYS is recommended primary — revisit the
  assignment once Hexabyte's transit/peering is known. If Hexabyte is
  thin-transit-only, it stays strictly DR, not a failover target that
  serves live tenant traffic.
- **Shared Ampliosoft substrate?** Watchtower has the same NUC problem;
  decide if this infra is shared (Watchtower + Korg) or Korg-only
  (ADR 0029 open question / ADR 0026 §0).
- Nothing here runs ahead of GTM gates; Phase 0–A only until Gate 1,
  cross-provider (B) gated by Gate 2.

Sources: hexabyte.se/vps + /kb/datacenter (Umeå, OpenStack);
glesys.se KVM VPS + registry.terraform.io/providers/glesys/glesys
(official provider) + glesys.com/sla (99.95% Gold, Falkenberg/
Stockholm Tier III); **PeeringDB asn/42708 (GleSYS — 15 IXPs,
Netnod/STHIX) and asn/215273 (Hexabyte — no IX/facility listed)**;
ADR 0029 research set.
