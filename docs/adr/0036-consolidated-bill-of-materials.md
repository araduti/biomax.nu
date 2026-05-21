# ADR 0036 — Consolidated Bill of Materials (Kine Platform Stack)

**Date:** 2026-05-21
**Status:** **Proposed** — meta-ADR. The tables below are the
single-page snapshot of every layer of the Kine stack. Each row
either cites the authoritative ADR or marks itself as a future-ADR
forcing function. Does not override any prior ADR.
**Related:** ADR 0002 (deployment), ADR 0003 (own the auth stack),
ADR 0007 (design system), ADR 0010 (email/Brevo), ADR 0013
(observability), ADR 0014 (Google Search Console), ADR 0017
(PostNord), ADR 0018 (marketing automation), ADR 0020 (Kustom-managed
shipping), ADR 0022 (preview environment — single-tenant pre-launch
scope), ADR 0023 (consent logging), ADR 0024 (retention/purge),
ADR 0025 (DSR), ADR 0026 (multi-tenant commerce platform), ADR 0027
(competitive roadmap), ADR 0028 (multi-tenant foundational
architecture), ADR 0029 (hosting & multi-provider HA — **compute is
decided there**), ADR 0030 (architecture changes ST→MT), ADR 0031
(authority planes & RBAC), ADR 0032 (tenant data-access enforcement
seam), ADR 0033 (tenant blast radius / noisy neighbour / DR moveout),
ADR 0034 (per-tenant payment credentials), ADR 0035 (Zod v4 only).

## Purpose

One page that answers "what is the whole Kine stack?" without
re-reading 35 ADRs. Tables are the primary content; prose is
limited to reconciliations and forcing-functions.

---

## 1. Runtime / hosting

| Layer | Choice | Owning ADR / status |
|---|---|---|
| VPS (primary) | **GleSYS** — SE-owned, Falkenberg + Stockholm DCs | ADR 0029 D2 |
| VPS (secondary) | **Elastx** — SE-owned, Vallentuna | ADR 0029 D2 |
| VPS (optional cold-DR) | Hexabyte — Umeå (no PeeringDB IX/facility record) | ADR 0029 D2 |
| OS | Ubuntu 24.04 LTS | this ADR |
| VM bootstrap | cloud-init YAML (provider-portable) | ADR 0029 D1 |
| Container runtime | Docker + Docker Compose v2 | ADR 0029 / Watchtower precedent |
| Reverse proxy / TLS | Traefik (per-provider) | ADR 0029 D3 |
| DNS + CDN + DDoS | Cloudflare (Free → Pro at GTM Gate 2) | this ADR — open: SE-sovereign DNS? |
| Object storage (assets) | Garage (Watchtower precedent) — R2 under evaluation for CDN-fronted shopper assets | open |
| Object storage (backups) | Cross-provider replicated; immutable off-site for bookkeeping data | ADR 0029 D5 / ADR 0027 P0 |
| Orchestrator | None (Docker Compose). Kubernetes deferred until ≥4 long-running deployables or multi-region active-active | this ADR |

**Reconciliation:** A 2026-05-20 brainstorm suggested Hexabyte as
primary VPS. ADR 0029 D2's 2026-05-18 PeeringDB analysis already
demoted Hexabyte to optional cold-DR. ADR 0029 wins; the brainstorm
suggestion is superseded.

---

## 2. Data & state

| Layer | Choice | Owning ADR / status |
|---|---|---|
| Database | Postgres (17 in Kine dev / 18 in Watchtower — version pin alignment is open) | ADR 0029 D4 |
| HA | Self-managed Patroni from day one; no managed DBaaS | ADR 0029 D4 |
| Migration role split | `DATABASE_MIGRATE_URL` (DDL + BYPASSRLS) vs `DATABASE_URL` (DML, RLS-bound) | ADR 0032 (in prod) |
| ORM | Prisma 7 + `@prisma/adapter-pg` | in prod |
| Prisma self-heal | `lib/prisma.ts` — Prisma 7 / Turbopack dev-server fix | in prod (see `AGENTS.md`) |
| Connection pooling | PgBouncer transaction mode (planned) | this ADR |
| Cache / sessions / rate-limit / idempotency | Redis 7 (planned) | this ADR |
| Background-job queue | **pg-boss** (transactional enqueue; no Redis broker) — divergence from Watchtower's Inngest | **future ADR (D-queue)** |
| Search | Postgres FTS + `pgvector`; abstracted behind `@kine/search` | this ADR |
| Backups | WAL-G, dual-destination (cross-provider per ADR 0029 D5) | ADR 0029 D5 |

---

## 3. Multi-tenancy & isolation

| Concern | Choice | Owning ADR |
|---|---|---|
| Tenancy model | Single schema + `tenantId` on owned models + RLS | ADR 0028 D1 / ADR 0032 |
| Tenant resolution | Host parsed at Next 16 Proxy (`proxy.ts`), forwarded as `x-kine-tenant`, resolved via `currentTenant()` React.cache | ADR 0028 D3 |
| Data-access seam | All owned reads/writes via `lib/tenant/db.ts`; ESLint-enforced | ADR 0032 D2 |
| Tenant-aware cache | `tenantCache()` from `lib/tenant/cache.ts`; `unstable_cache` forbidden | ADR 0032 D4 |
| Authority planes | Two Better Auth instances, cookies `__kinesf` vs `__kineadm`, host-scoped, platform 2FA mandatory | ADR 0031 / ADR 0003 |
| Per-tenant config plane | Encrypted credentials at rest; webhook→tenant resolution by merchant marker | ADR 0034 (payments) — pattern extends per integration |
| Blast radius / DR moveout | Per-tenant noisy-neighbour controls + tenant exit path | ADR 0033 |

---

## 4. Application stack

| Layer | Choice | Status |
|---|---|---|
| Framework | Next.js 16 (App Router, RSC, Server Actions, `output: "standalone"`) | in prod |
| Edge | Next 16 Proxy (`proxy.ts`) → tenant by Host | ADR 0028 D3 (in prod) |
| Runtime | Node.js 22 LTS | in prod |
| Language | TypeScript 5.6, `strict` + `noUncheckedIndexedAccess` + ES2022 target | this ADR (TS upgrade gaps from current) |
| Linter | ESLint with tenant-seam `no-restricted-syntax` + `no-restricted-imports` rules | ADR 0032 (in prod, `warn` → `error` planned) |
| Package manager | pnpm 9 + workspaces; `.npmrc` hoists `*prisma*` for self-heal | **future ADR (D-monorepo)** |
| Validation | Zod v4 only (no v3 surface) | ADR 0035 |
| RPC layer | tRPC (merchant admin ↔ packages, console ↔ packages, AI agent tools) — Server Actions stay for storefront forms | **future ADR (D-rpc)** |
| UI primitives | `@kine/ui` (shadcn/radix-level) | ADR 0007 |
| Theming | 5-layer: tokens (DB JSONB) → blocks → page overrides → assets → sandboxed custom CSS | **future ADR (D-theming)** |
| i18n | sv-SE only year 1; schema-ready for sv-NO/sv-DK | wedge per ADR 0026 |

---

## 5. Monorepo layout (proposed — `D-monorepo` ADR pending)

```
apps/
  shop/                    Storefront engine + merchant /admin (single Next app)
  console/                 Kine-operator-only (admin.kine.se)
  worker/                  Cron + queue consumer (no HTTP listener)

packages/
  core/                    Domain types, value objects, errors
  db/                      Prisma + RLS + tenant-scope (FIRST extraction)
  auth/                    Two Better Auth instances (shop + console)
  tenancy/                 Tenant lifecycle, domains, plans, branding
  shop/                    Catalog + commerce + marketing (one big domain pkg)
  payments/                Interface + Stripe + Klarna + Swish (subfolder adapters)
  mail/                    Mailer interface + Brevo adapter
  storage/                 Storage interface + Garage/R2 adapters
  search/                  Search interface + Postgres FTS adapter
  queue/                   pg-boss-backed scheduler & worker contract
  observability/           Sentry + structured logging + tenant tagging
  rpc/                     tRPC routers (shared by admin + console + AI agent)
  ui/                      Headless primitives + design tokens
  blocks/                  Composable page blocks
  theme/                   Token schema + CSS-var emitter + font loader
  seo/                     JSON-LD, sitemaps, OG, AIO, internal linking
  ai/                      Anthropic SDK + agent runtime + tool registry
  content/                 Blog, knowledge entries, FAQ, programmatic pages
  audit/                   Audit log writer/reader
  feature-flags/           Per-tenant feature toggles
  config/                  Env Zod + runtime config
  plugin-sdk/              Plugin contract types
  testing/                 Factories + RLS isolation harness

plugins/
  biomax-rockland/         Tenant-specific extensions (first-party plugin)

prisma/                    Single schema at root (RLS-aware)
ops/
  caddy/                   Caddyfile (on_demand_tls for tenant custom domains)
  docker/                  Multi-stage Dockerfile + docker-compose.prod.yml
  cloud-init/              Provider-portable VM bootstrap
  wal-g/                   Backup config (cross-provider)
terraform/                 Cloudflare + GitHub + Sentry (NOT compute)
secrets/                   SOPS + age, encrypted at rest
docs/adr/                  This ADR set
```

**First extraction:** `@kine/db` (today's `lib/prisma.ts` + `lib/tenant/*`).
**Hard prerequisite to `@kine/auth-storefront`:** un-`biomax`-ify
`lib/auth.ts` (cookie prefix, TOTP issuer, `baseURL` fallback,
loyalty auto-enrol).

---

## 6. Identity, payments, messaging

| Layer | Choice | Status |
|---|---|---|
| Auth (tenant plane) | Better Auth, cookie `__kinesf`, per-tenant domain | ADR 0003 (in prod, needs un-`biomax`-ify) |
| Auth (platform plane) | Better Auth, cookie `__kineadm`, host-scoped to admin.kine.se, 2FA mandatory | ADR 0031 |
| Identity (Swedish, future) | **BankID** primary + **Freja eID** fallback — login, KYC, age verification, terms signing | year-1 must (no ADR) |
| Payments (default, future) | **Stripe Connect (Standard)** + Stripe Tax + Stripe Radar — Kine as platform, merchants as connected accounts | partnership target (no ADR) |
| Payments (current) | Klarna / Kustom (per-tenant credentials) | ADR 0020, 0021, 0034 |
| Payments (SE must) | **Swish** (sub-100-SEK + Swish refund delight) | year-1 must (no ADR) |
| Payments interface | `PaymentSession` = `redirect` ∣ `embed` ∣ `qr`; community-pluggable | this ADR — needs payments-interface ADR |
| Email | Brevo (transactional + lifecycle) | ADR 0010 (in prod) |
| SMS | 46elks (Swedish numbers) | year-1 must (no ADR) |
| Search | Postgres FTS + pgvector (semantic, Swedish stemming) | this ADR |

---

## 7. AI substrate (proposed — `D-ai` ADR pending)

| Concern | Choice |
|---|---|
| Model provider | Anthropic SDK (Claude Opus 4.7 / Sonnet 4.6) |
| Package | `@kine/ai` — prompt registry, mandatory prompt caching, per-tenant cost metering, agent runtime |
| Tool surface | Reuses tRPC routers (one API, three consumers: admin UI / AI agent / future public REST/GraphQL) |
| Vector store | pgvector (same Postgres — no second store) |
| Embeddings | **Open** — Voyage v3 multilingual vs OpenAI `text-embedding-3-large` vs Anthropic-native when shipped |
| Tenant isolation | AI calls run inside `withRLS(tenantId)` — same seam as everything else; cross-tenant data in a prompt is impossible by construction |
| Product surfaces | (1) Onboarding-as-conversation, (2) merchant in-admin assistant ("Kine Assist"), (3) optional per-tenant shopper-side assistant (AI-Pro tier) |

---

## 8. Observability, CI/CD, secrets, IaC

| Layer | Choice | Status |
|---|---|---|
| Errors | Sentry, tenant-tagged | ADR 0013 (in prod) |
| Logs | Grafana Cloud Loki (free tier) → self-hosted Loki on substrate when ceiling hit | this ADR |
| Metrics | Prometheus node_exporter + Grafana Cloud Prometheus | this ADR |
| RUM (Core Web Vitals) | Custom `/api/rum` → Postgres per-tenant rollups | this ADR — D8 (SEO ADR) consumes |
| Uptime | Self-hosted Uptime Kuma on substrate | this ADR |
| Tracing | OpenTelemetry → Tempo, year 2 | deferred |
| Audit log | `@kine/audit` → dedicated table; D10 lockin features depend on it | this ADR |
| CI | GitHub Actions | in prod |
| Image registry | GHCR | this ADR |
| Deploy | SSH + `docker compose pull && up -d` to active provider; migrations as a pre-deploy CI step | ADR 0002 / ADR 0029 |
| Secrets at rest | SOPS + age, encrypted in `secrets/` | this ADR |
| Secrets at runtime | `/etc/kine/app.env` on VM, mode 0600, hydrated by `sops -d` | this ADR |
| IaC | Terraform: Cloudflare + GitHub + Sentry + buckets — **NOT** compute (no GleSYS/Elastx TF providers; cloud-init handles bootstrap) | this ADR |
| Terraform state | R2 / Garage (S3-compatible) — not AWS | this ADR |

---

## 9. Swedish wedge — domain integrations

Year-1 required (per ADR 0026 §1 / ADR 0027):

| Integration | ADR | Status |
|---|---|---|
| Klarna / Kustom (payments) | 0020, 0021, 0034 | in place |
| PostNord (shipping) | 0017 | in place |
| Brevo (email) | 0010 | in place |
| Google Search Console | 0014 | in place |
| Stripe Connect (Standard) | future | partnership target |
| BankID (+ Freja eID fallback) | future | year-1 must |
| Swish | future | year-1 must |
| Fortnox + Visma + Bokio (accounting sync) | future | year-1 must |
| Skatteverket OSS quarterly report | future | year-1 must (Kine Bokslut, §11 D10) |
| Instabox + Budbee + Bring + Early Bird (carriers) | future | year 1 |
| 46elks (SMS) | future | year 1 |

Year-2+:
- FTI/EPR packaging fees, Konsumentverket/ARN dispute templates,
  Meta/TikTok/Pinterest commerce, Vipps + BankID-NO + VOEC
  (Norway expansion).

Each gets its own ADR when implementation begins.

---

## 10. Per-tenant rehearsal — "Kine Repetition" (proposed — `D-repetition` ADR pending)

**Distinct from ADR 0022** (which is the single-tenant pre-launch
DNS cutover for biomax.nu).

| Concern | Choice |
|---|---|
| Primitive | `TenantWorkspace { kind: PRODUCTION ∣ REPETITION }` + `workspaceId` column on every tenant-owned model |
| Isolation | RLS extended with `app.workspace_id` alongside `app.tenant_id` |
| Read rule | Prefer workspace row, fall back to production (`workspaceId IS NULL`) |
| Promotion | Atomic; auto-archives prior production state as a snapshot |
| Time-travel | `as_of` parameter against `validFrom`/`validUntil` columns — rehearse Black Friday at 09:00 |
| AI synthetic shoppers | Personas browse the Repetition, report failures (Stripe forced test-mode) |
| Shareable preview | `kine.se/r/abc123`, password-gated, watermarked, `noindex`, auto-expire |
| Diff + revert | Per-field diff; toggle individual changes pre-promotion; one-click rollback |
| A/B promote | 50/50 traffic split between Repetition and production for N days |
| Migration target | All Shopify/WooCommerce migrations land in a Repetition first |

---

## 11. "Boring lockin" data primitives (proposed — per-feature ADRs pending)

Audit / history / multi-year-data features whose value compounds with
time-on-platform. Each needs its own ADR; a future "boring-lockin
data model" meta-ADR will unify schema primitives across them.

| Name | Function | Lockin mechanism |
|---|---|---|
| Kine Historik | Field-level change log + revert on every editable thing | Audit trail accountants rely on; foundation for the others |
| Kine Tidslinje | Unified per-customer event timeline | After 18 months, irreplaceable customer-context |
| Kine Lagerbok | Audit-grade inventory ledger | Bokföringslagen-required; accountants become Kine sales reps |
| Kine Bokslut | Quarterly + annual close: moms / OSS / FTI / Bokföringslagen-aligned | Highest-leverage lockin; replaces quarter-long spreadsheet hell |
| Kine Snapshot | Merchant-grade PITR over WAL-G | Once experienced, switching feels unsafe |
| Kine Inkorgen | Support inbox + AI templates trained on tenant's voice | Two years of saved replies = a junior support hire's worth of IP |
| Kine Pulsen | Multi-year cohort + LTV + per-product margin analytics | Worthless until ~18mo of data — then irreplaceable |

---

## 12. Pricing tiers (proposed — needs GTM ADR; conflicts with ADR 0027 must be resolved)

Conversational only; **not** an ADR-grade decision yet:

| Tier | Monthly | Payment take-rate | Notes |
|---|---|---|---|
| Kine Start | 0 SEK | 1.4% + 1.50 SEK / Kine-payments txn | Subdomain only, full features, AI Assist Basic |
| Kine Växa | 199 SEK | 0.4% + 1.50 SEK | Custom domain, AI Assist Pro, advanced SEO |
| Kine Plus | 799 SEK | 0% (cost only) | B2B, subscriptions, POS, headless API, dedicated CSM, Kine Repetition (unlimited + AI synthetic shoppers) |
| Enterprise | Custom | Negotiated | SLA (gated on ADR 0029 D6 HA tier), multi-store, API to spin Repetitions from CI |

HA tier ↔ SLA tier ↔ price tier is one decision (ADR 0029 D6).
No SLA number published until the HA phase backs it
(`feedback_no_invented_sla`).

---

## What's NOT in the stack (deliberate exclusions)

| Excluded | Why |
|---|---|
| Kubernetes | Until ≥4 long-running deployables or multi-region active-active (gated by GTM revenue) |
| Vercel / Netlify | Cedes edge control, loses on-demand TLS path for tenant custom domains, 5-10× cost for less |
| AWS / GCP | Too expensive, no Swedish-data-residency win (wedge per ADR 0026) |
| Managed Postgres (Neon, Supabase) | ADR 0029 D4 — custom RLS roles + cross-provider Patroni demands self-managed |
| Vault / Doppler / 1Password Secrets Automation | SOPS + age sufficient at this scale |
| Ansible / Salt / Chef / Puppet | cloud-init + Docker Compose suffices |
| Datadog / New Relic | Sentry + Grafana Cloud free tier covers it |
| Auth0 / Clerk / WorkOS | Better Auth + BankID owns more of the stack at lower cost (ADR 0003) |
| Shopify Hydrogen / Medusa / Saleor | Kine builds the engine, doesn't consume one |
| Strapi / Contentful / Sanity | Content lives in Postgres next to commerce |

---

## Future-ADR placeholders (forcing function)

Implementation of any of these substrates is **gated** on its ADR
existing first:

| Marker | Substrate | Why a separate ADR |
|---|---|---|
| **D-monorepo** | §5 layout, pnpm workspaces, package extraction sequence | Touches every file; rename `biomax.nu` → `kine` |
| **D-queue** | §2 pg-boss vs Watchtower's Inngest | Conscious divergence; needs why-not-Inngest analysis |
| **D-rpc** | §4 tRPC + Server Actions split | Divergence from "all-Server-Actions"; AI tool surface dependency |
| **D-ai** | §7 AI substrate + embeddings choice | Cost, vendor lock-in, cross-tenant isolation rules |
| **D-theming** | §4 5-layer theming + sandboxed custom CSS | Security review needed for layer 5 |
| **D-seo** | `@kine/seo` package, AIO/GEO, programmatic SEO | Quality gates for programmatic pages |
| **D-repetition** | §10 per-tenant workspaces | Schema + RLS extension; promotion atomicity |
| **D-lockin-data** | §11 unified schema for Historik / Tidslinje / Lagerbok / etc. | Schema coherence across 7 features |
| **D-pricing-gtm** | §12 tier names + take-rates | Reconcile with ADR 0027 |

---

## Open questions

- DNS provider — Cloudflare assumed; Swedish-sovereign alternative
  worth investigating as a wedge asset.
- Object storage for shopper-facing assets — Garage in-stack vs
  R2 CDN-fronted vs Swedish-sovereign S3-compatible.
- Postgres version pin — 17 (Kine dev) vs 18 (Watchtower) — one
  number across Ampliosoft.
- pg-boss vs Inngest — `D-queue` ADR.
- Embeddings model — `D-ai` ADR.
- Repo rename `biomax.nu` → `kine` — `package.json:2` still reads
  `"name": "biomax.nu"`. Mechanical, but CI / image tags / Sentry
  project names need sequencing.
- HA tier ↔ SLA tier ↔ price tier ↔ §12 pricing — one decision,
  needs a single GTM ADR.

---

## Sources

- 2026-05-20/21 design conversation summarised here.
- ADR 0029 PeeringDB analysis (2026-05-18) — overrides any
  Hexabyte-as-primary suggestion; conversational suggestion noted
  and corrected in §1.
- `docs/infra/kine-hosting-plan.md`, `docs/infra/kine-infra-shapes.md`
  — cited by ADR 0029 for the concrete substrate ladder.
