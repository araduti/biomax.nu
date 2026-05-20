# ADR 0036 — Consolidated Bill of Materials (Korg Platform Stack)

**Date:** 2026-05-21
**Status:** **Proposed** — meta-ADR. Consolidates the toolstack
across the platform; defers all already-decided choices to their
authoritative ADRs and records new (or previously implicit) choices
made in conversation. Not a substitute for the underlying ADRs.
**Related:** ADR 0002 (deployment), ADR 0003 (own the auth stack),
ADR 0007 (design system), ADR 0010 (email/Brevo), ADR 0013 (observability),
ADR 0014 (Google Search Console), ADR 0017 (PostNord), ADR 0018
(marketing automation), ADR 0020 (Kustom-managed shipping), ADR 0022
(preview environment — pre-launch, single-tenant scope), ADR 0023
(consent logging), ADR 0024 (retention/purge), ADR 0025 (DSR),
ADR 0026 (multi-tenant commerce platform), ADR 0027 (competitive
roadmap), ADR 0028 (multi-tenant foundational architecture),
ADR 0029 (hosting & multi-provider HA — **compute is decided
there**), ADR 0030 (architecture changes ST→MT), ADR 0031 (authority
planes & RBAC), ADR 0032 (tenant data-access enforcement seam),
ADR 0033 (tenant blast radius / noisy neighbour / DR moveout),
ADR 0034 (per-tenant payment credentials), ADR 0035 (Zod v4 only).

## Purpose

There is now ~35 ADRs each making one decision well. A new
contributor (or future-self) needs a single page that answers "what
is the whole Korg stack, and which ADR owns each piece?" without
re-reading 35 documents. This ADR is that page.

It also records four choices that have been made implicitly in
working memory or this week's design conversation, but not formally
ADR'd: the monorepo layout, the background-job substrate, the
intra-process RPC layer, and the AI platform substrate.

This ADR **does not override** any prior ADR. Where a prior ADR
disagrees with anything below, the prior ADR wins.

## Context

The Korg stack splits into four layers that have evolved separately
and now need reconciliation:

1. **Infra & deploy** — owned by ADR 0029 (Swedish-first, two
   providers, graduated HA gated by GTM revenue).
2. **Data & tenant isolation** — owned by ADRs 0028, 0030, 0031,
   0032, 0033.
3. **Application stack** — partial coverage (auth in 0003, design in
   0007, deployment in 0002, Zod in 0035) but no single map.
4. **Domain integrations** — owned in pieces (email 0010, shipping
   0017/0020, payments 0034, GSC 0014, consent 0023).

Recent design work added six new substrates not yet ADR'd:
monorepo split (apps + packages), background-job queue, intra-process
RPC layer, AI platform package, advanced theming, advanced SEO. Some
of these will warrant their own ADRs (flagged D-numbers below
"future-ADR"); this one records the consolidated picture so the
future ADRs can reference a shared baseline.

## Decision

Twelve sub-decisions, grouped by layer. Each cites the authoritative
ADR if one exists, or marks itself as a new proposal needing its own
ADR.

### D1 — Compute, hosting, DNS, CDN (defers to ADR 0029)

- **VMs:** plain Linux VPS at **GleSYS (primary, SE-owned, Falkenberg
  + Stockholm DCs) + Elastx (secondary, SE-owned, Vallentuna)** per
  ADR 0029 D2 PeeringDB analysis. Hexabyte was explored as a
  third candidate during 2026-05-20 brainstorm and remains on the
  shortlist for **optional cold-DR only** (no PeeringDB IX/facility
  record) — it is **not** primary or secondary. The earlier
  conversational suggestion of "Hexabyte primary" predates ADR 0029
  and is superseded.
- **OS:** Ubuntu 24.04 LTS; bootstrap via cloud-init (provider-portable
  — same YAML works at GleSYS, Elastx, Hexabyte, Hetzner; this is the
  ADR 0029 D1 portability guarantee).
- **Container runtime:** Docker + Docker Compose v2; matches the
  Watchtower precedent referenced in ADR 0029. Kubernetes deferred
  (rationale: until ≥4 long-running deployables or multi-region
  active-active is required; both gated by GTM revenue per ADR 0026).
- **Reverse proxy / TLS:** Traefik per ADR 0029 D3 (per-provider
  Traefik). Caddy `on_demand_tls` was discussed conversationally as
  an alternative for tenant custom-domain TLS; if Traefik's
  on-demand-cert support proves insufficient for the tenant custom
  domain flow (ADR 0026 §2), this is a candidate **future ADR**
  ("on-demand TLS provider for tenant custom domains").
- **DNS + CDN + DDoS:** Cloudflare. Free tier through GTM Gate 1;
  Pro tier when image-resize / WAF rules are needed (gate 2 era).
  ADR 0029 D3 names "anycast / health-checked DNS failover" as the
  multi-provider routing primitive — Cloudflare is the assumed
  provider unless a Swedish-sovereign DNS provider is preferred for
  the wedge (open question, see below).
- **Object storage (assets):** Garage (in the Watchtower precedent
  referenced by ADR 0029 D5) for the platform-internal store; **R2
  remains under evaluation** for shopper-facing assets where
  Cloudflare's CDN-front + zero-egress economics matter. Not decided.
- **Object storage (backups):** Cross-provider replication per
  ADR 0029 D5. Off-site immutable backup of bookkeeping-critical
  data is mandatory regardless of phase (ADR 0029 D4 / ADR 0027 P0).

### D2 — Database, cache, queue, search (mixed; new where noted)

- **Database:** Postgres (currently 17 in dev; 18 in the Watchtower
  precedent — pin to be aligned across Korg + Watchtower) per
  ADR 0029 D4. Self-managed Patroni from day one. **No managed
  DBaaS** (ADR 0029 D4 resolved).
- **Migration role split:** `DATABASE_MIGRATE_URL` (DDL + BYPASSRLS)
  vs `DATABASE_URL` (DML, RLS-bound). Already production (`prisma.config.ts`,
  prisma adapter pg). Per ADR 0032.
- **ORM:** Prisma 7 + `@prisma/adapter-pg`. Self-heal helper at
  `lib/prisma.ts` (Prisma 7 / Turbopack dev-server issue documented
  in `AGENTS.md`) — preserved on the planned move into `packages/db`.
- **Pooling:** PgBouncer in transaction mode (planned, not yet in
  prod). Per-tenant pools when concurrent tenant count exceeds the
  no-pooling envelope — sizing decision deferred to GTM Gate 2.
- **Cache / sessions / rate-limit / idempotency:** Redis 7
  (planned). Better Auth session store (ADR 0003), per-tenant rate
  limits, webhook dedup keys.
- **Background-job queue (NEW — future ADR):** **pg-boss**
  (Postgres-backed) is the proposed substrate. Rationale: transactional
  enqueue (e.g. enqueue `order.placed` in the same tx as the order
  insert), no second SPOF, no Redis-as-broker dependency. Watchtower
  uses Inngest (ADR 0029 §Context); Korg's lean-toward-pg-boss is a
  conscious divergence — needs its own ADR to record the
  why-not-Inngest analysis. **Open until that ADR exists.**
- **Search:** Postgres FTS + `pgvector` extension (`pgvector` is
  shared with the AI substrate, D6). Abstracted behind a
  `@korg/search` adapter so Meilisearch or Typesense can swap in
  when FTS hits its ceiling.

### D3 — Multi-tenancy & auth (defers to ADRs 0028, 0031, 0032, 0033, 0034)

- **Tenancy model:** single Postgres schema + `tenantId` on owned
  models + RLS, per ADR 0028 D1 / ADR 0032.
- **Tenant resolution:** Host header parsed at the Next 16 Proxy
  (`proxy.ts`, ADR 0028 D3), forwarded as `x-korg-tenant`, resolved
  server-side via `currentTenant()` cache.
- **Data-access seam:** every owned-model read/write routes through
  `lib/tenant/db.ts`. ESLint `no-restricted-syntax` enforces this;
  ADR 0032 D2 lists every owned model. Rule planned to flip from
  `warn` → `error` once the 3b backlog clears.
- **Cache scoping:** `unstable_cache` is forbidden tenant-side
  (cross-tenant key poisoning); use `tenantCache()` from
  `lib/tenant/cache.ts`. ESLint enforced. Per ADR 0032 D4.
- **Authority planes:** two Better Auth instances, separate cookie
  prefixes, separate domains. Storefront `__korgsf` on tenant
  hosts; platform `__korgadm` host-scoped to `admin.korg.nu` only
  with 2FA mandatory. Per ADR 0031 / ADR 0003. The cleanup pass to
  un-`biomax`-ify the storefront `auth.ts` (cookie prefix, TOTP
  issuer, `baseURL` fallback, loyalty auto-enrol) is **prerequisite**
  to any `@korg/auth-storefront` package extraction.
- **Per-tenant config plane:** secrets / integration credentials
  encrypted at rest; webhook→tenant resolution by merchant marker
  per ADR 0034 (payments) — pattern extends to other integrations as
  they're tenanted.

### D4 — Code layout: monorepo (NEW — future ADR)

The current single-package layout (`name: "biomax.nu"` at the root,
all code under `app/`, `lib/`, `components/`, `prisma/`) is
becoming a structural bottleneck. The platform/storefront/worker
split (D7, D9) needs package boundaries to land cleanly.

Proposed layout, gated by its own ADR:

```
apps/{shop,console,worker}
packages/{core,db,auth,tenancy,shop,payments,mail,storage,search,
          queue,observability,rpc,ui,blocks,theme,seo,ai,content,
          audit,feature-flags,config,plugin-sdk,testing}
plugins/biomax-rockland             # tenant-specific extensions
prisma/                             # single schema at root
ops/{caddy,docker,cloud-init,wal-g}
terraform/                          # Cloudflare + GitHub + Sentry
secrets/                            # SOPS + age, encrypted at rest
```

**Package manager:** pnpm 9, workspaces. `.npmrc` hoists `*prisma*`
so the `lib/prisma.ts` self-heal `statSync` path keeps resolving
when the module moves into `packages/db`.

**First extraction target:** `@korg/db` (lib/prisma.ts + lib/tenant/*).
ESLint already pins this as the seam — the import-site sweep is
mechanical. **Storefront `auth.ts` cleanup must precede
`@korg/auth-storefront` extraction** so the package boundary
doesn't lock in `biomax` hardcoding.

App split rationale: `apps/shop` hosts the storefront engine
*including* the merchant `/admin`; `apps/console` is Korg-operator-only
(`admin.korg.nu`); `apps/worker` is the cron + queue consumer. Three
apps, not two, because the worker has a different runtime profile
(no HTTP listener, different scaling axis) even though it shares
~95% of the code.

### D5 — RPC layer (NEW — future ADR)

**tRPC** is the proposed RPC layer between merchant admin UI ↔
domain packages, and between Korg console ↔ platform packages.
Server Actions stay for storefront forms (RSC-aware, progressive
enhancement). The same tRPC routers also serve as the **AI agent
tool surface** (D6) — single source of truth, three consumers
(admin UI, AI agent, future public REST/GraphQL wrapper for tenant
integrations).

This is a divergence from "all-Server-Actions"; needs its own ADR.

### D6 — AI substrate (NEW — future ADR)

Anthropic SDK as the model provider (current contracts;
`adrian.raduti@ampliosoft.com` org). `@korg/ai` package owns: prompt
registry, prompt-caching policy (mandatory — every Anthropic call
that can be cached must be), per-tenant cost metering, agent
runtime, tool registry sourced from the tRPC routers (D5).

Three product surfaces depend on this substrate:
1. **Onboarding-as-conversation** — free-text → structured tenant
   config (theme tokens, category structure, copy drafts, integrations
   stack).
2. **In-admin merchant assistant** ("Korg Assist") — chat sidebar with
   tool access via the tRPC mutation surface, gated by merchant role,
   audit-logged, every change reversible via Korg Historik
   (separately-proposed boring-lockin feature).
3. **Optional per-tenant shopper-side assistant** — RAG over the
   tenant's catalog, on the AI-Pro tier.

**Hard rule:** AI calls run inside `withRLS(tenantId)` — never cross-tenant
data in a prompt. Same enforcement seam as everything else.

Embeddings model not yet decided (Voyage v3 multilingual vs OpenAI
`text-embedding-3` vs Anthropic-native when available) — needs the
AI ADR.

### D7 — Theming (5-layer; new conversationally, needs its own ADR)

Per-tenant theming via:
1. **Tokens** in `Tenant.theme` JSONB (color, font, space, radius,
   shadow, motion, breakpoints), Zod-validated, emitted at runtime
   as CSS custom properties at the root layout. No per-tenant build.
2. **Blocks** (`@korg/blocks`) — composable page sections consuming
   tokens + content props. Generalises the existing `HomepageBlock`.
3. **Per-page layout overrides** — block order/content stored per
   page in DB; drag-drop reorder in admin.
4. **Asset uploads** — logo, favicon, hero, photography — to object
   storage (D1).
5. **Sandboxed custom CSS** — scoped class on `<body>`, server-side
   CSS-parser allow-list, no `position: fixed`/`@import`/excessive
   `z-index`. Plus tier only.

### D8 — SEO (`@korg/seo` — new conversationally, needs its own ADR)

Generalisation of the existing `lib/jsonld.ts`, `LLMCitationProbe`
(ADR 0015), `lib/seo/*`, sitemap/robots route handlers, and GSC
integration (ADR 0014). New capabilities to design under their own
ADR: AIO/GEO citation-readiness linter, internal-linking automation,
programmatic-SEO landing pages with quality gates, per-tenant
Core Web Vitals RUM, hreflang scaffolding (sv-only year 1; schema
ready for sv-NO/sv-DK).

### D9 — Per-tenant rehearsal environment ("Korg Repetition" — new, needs its own ADR)

**Not the same as ADR 0022** (which is the single-tenant pre-launch
staging cutover for biomax.nu). Korg Repetition is a per-tenant
copy-on-write workspace primitive: `TenantWorkspace { kind:
PRODUCTION | REPETITION }` and a `workspaceId` column on every
owned model. RLS extended with `app.workspace_id` alongside
`app.tenant_id`. Reads prefer the workspace row, fall back to
production. Promotion is atomic, audit-logged, schedulable, and
auto-archives the prior production state as a snapshot.

Lockin-tier feature; pairs with AI agent (every AI-proposed change
lands in a Repetition first) and with Korg Historik (D10).

### D10 — "Boring lockin" data primitives (new conversational class, needs ADRs per feature)

A coherent set of audit/history/multi-year-data features that
compound: **Korg Historik** (field-level change log with revert),
**Korg Tidslinje** (unified per-customer event timeline), **Korg
Lagerbok** (audit-grade inventory ledger), **Korg Bokslut** (quarterly
+ annual close: moms / OSS / FTI / Bokföringslagen-aligned),
**Korg Snapshot** (merchant-grade PITR over WAL-G), **Korg Inkorgen**
(support inbox with AI templates), **Korg Pulsen** (multi-year cohort
analytics).

Each gets its own ADR when work begins. Listed here because the
data primitives (append-only event tables, field-level history,
workspace column) need a coherent design across them — a future
"boring-lockin data model" meta-ADR will unify the schema choices
before implementation diverges.

### D11 — Domain integrations (defers to feature ADRs; lists the Swedish wedge)

Year-1 required (the wedge — ADR 0026 §1):

| Integration | ADR | Status |
|---|---|---|
| Klarna / Kustom | 0020, 0021, 0034 | In place |
| PostNord | 0017 | In place |
| Brevo (email) | 0010 | In place |
| Google Search Console | 0014 | In place |
| Stripe Connect (Standard) | future | Partnership target |
| BankID (+ Freja eID fallback) | future | Year 1 must |
| Swish | future | Year 1 must |
| Fortnox + Visma + Bokio | future | Year 1 must |
| Skatteverket OSS report | future | Year 1 must (Bokslut, D10) |
| Instabox / Budbee / Bring / Early Bird | future | Year 1 |
| 46elks (SMS) | future | Year 1 |

Year-2+:

- FTI/EPR packaging fees, Konsumentverket/ARN templates, Meta/TikTok/
  Pinterest commerce, Vipps+BankID-NO+VOEC (Norway expansion).

Each gets its own ADR when implementation begins.

### D12 — Observability, CI/CD, secrets, IaC

- **Errors:** Sentry, tenant-tagged. ADR 0013.
- **Logs:** Grafana Cloud Loki (free tier) or self-hosted Loki on the
  HA substrate. Tenant-tagged via `@korg/observability`. Needs its
  own ADR if the choice is made before the free-tier ceiling is hit.
- **Metrics:** Prometheus node_exporter on VMs + Grafana Cloud
  Prometheus.
- **RUM (Core Web Vitals):** custom `/api/rum` endpoint → Postgres
  rollups per tenant. Per D8.
- **Uptime:** Self-hosted (Uptime Kuma) on the substrate.
- **Tracing:** OpenTelemetry → Tempo, deferred to year 2.
- **Audit log:** `@korg/audit` writes to a dedicated table; the
  primitive D10 features depend on this.
- **CI:** GitHub Actions. **Image registry:** GHCR. **Deploy:** SSH
  + `docker compose pull && up -d` to the active provider. Migrations
  run as a pipeline step ahead of the app deploy.
- **Secrets at rest:** SOPS + age, encrypted files in repo
  (`secrets/`). **Secrets at runtime:** `/etc/korg/app.env` on the
  VM, mode 0600, hydrated by `sops -d` on deploy.
- **IaC:** Terraform owns Cloudflare + GitHub + Sentry + R2/Garage
  buckets. Terraform **does not** provision the GleSYS/Elastx VMs
  (no first-class providers, one-off provisioning); cloud-init handles
  bootstrap. Terraform state on R2 / Garage (S3-compatible) — not
  AWS.

## Consequences

**Positive**

- One page maps every layer to its owning ADR; new contributors
  don't re-derive.
- Surfaces six substrates (monorepo, queue, RPC, AI, theming, SEO)
  that have been decided implicitly and now need their own ADRs —
  this ADR is the forcing function.
- Reconciles the 2026-05-20 conversational Hexabyte recommendation
  with ADR 0029's GleSYS+Elastx decision; future-self won't be
  confused about which is authoritative.
- Lists every Swedish domain integration in one table — the wedge
  is visible at a glance.

**Negative / risk**

- A meta-ADR can drift from its underlying ADRs. Mitigation: this
  ADR cites and defers; it makes no decision that overrides another.
  Underlying ADR updates do not require updating this one unless
  the deferred surface changes.
- "Future ADR" markers (D2 queue, D4 monorepo, D5 RPC, D6 AI, D7
  theming, D8 SEO, D9 Repetition) risk becoming a backlog that
  never lands. Mitigation: implementation of any of those substrates
  is **gated** on its ADR existing first.

## Open questions

- DNS provider — Cloudflare assumed, but a Swedish-sovereign DNS
  provider would strengthen the wedge (sales asset). Worth a
  side-investigation alongside ADR 0029 follow-up.
- Object storage choice for shopper-facing assets — Garage
  (in-stack) vs R2 (CDN-fronted, zero-egress) vs Swedish-sovereign
  S3-compatible. Not decided.
- Postgres version pin — 17 (current Korg dev) vs 18 (Watchtower
  precedent referenced in ADR 0029). One number across Ampliosoft.
- Background-job substrate — pg-boss vs Inngest (Watchtower
  precedent). Needs its own ADR with the divergence analysis.
- Embeddings model — Voyage v3 multilingual (best for Swedish?) vs
  OpenAI `text-embedding-3-large` vs Anthropic-native when shipped.
- HA tier ↔ SLA tier ↔ price tier is one decision (ADR 0029 D6) —
  this ADR doesn't change that, but pricing tier names mentioned
  conversationally (Korg Start / Växa / Plus / Enterprise) are
  **not** ADR'd yet and conflict with ADR 0027's pricing discussion
  if any. Needs the GTM ADR to resolve.
- Repo rename `biomax.nu` → `korg` — `package.json:2` still reads
  `"name": "biomax.nu"`. Mechanical change, but downstream (CI,
  Docker image tags, Sentry project names) needs sequencing.

## Sources (this conversation)

- 2026-05-20/21 design conversation, summarised in this ADR.
- ADR 0029 (PeeringDB analysis dated 2026-05-18) overrides
  Hexabyte-as-primary; conversational suggestion noted and corrected.
- `docs/infra/korg-hosting-plan.md` and `docs/infra/korg-infra-shapes.md`
  cited by ADR 0029 for the concrete substrate ladder.
