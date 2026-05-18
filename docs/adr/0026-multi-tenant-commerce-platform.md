# ADR 0026 — Korg: Multi-Tenant Commerce Platform ("Shopify for Swedish mom-and-pop stores")

**Date:** 2026-05-18
**Status:** Proposed — strategic direction, needs explicit go/no-go before any code
**Varumärke:** `docs/varumarke/korg.md` (position + tonläge, på svenska)
**Strategi:** `docs/strategi/korg-gtm-validering.md` (marknadsväg +
bytesutlösar-validering; gates this ADR's Phase 2+)
**Roadmap:** ADR 0027 (competitive parity & differentiation vs
Quickbutik — sorts feature gaps into gated downstream ADRs)
**Foundation:** ADR 0028 (multi-tenant architecture/coupling),
ADR 0029 (hosting & multi-provider HA — NUC is disqualifying for SaaS),
ADR 0030 (architecture changes + modular-monolith vs microservices),
ADR 0031 (authority planes & RBAC — platform/tenant/customer)
**Related:** ADR 0001 (tech stack), ADR 0003 (auth), ADR 0004/0009/0020/0021
(Kustom payments + shipping), ADR 0017 (PostNord), ADR 0023–0025 (GDPR),
ADR 0022 (preview/staging)

## Context

biomax.nu today is a **single-tenant** bespoke storefront: one Postgres
database, one shop's catalog/orders/customers, one Kustom merchant
account, one admin, one domain, sv-SE only. It is getting strong
validation as a shop. The proposal is to turn the *platform underneath
it* into a product: a hosted commerce SaaS for small Swedish merchants —
"Shopify, but Swedish-first."

This ADR exists because that is **not an incremental feature**. It is a
re-platforming and, more importantly, a change of business: from running
one shop to operating shared infrastructure that other businesses depend
on for their livelihood. The engineering is the smaller half; the larger
half is becoming a payment-adjacent, data-processor, on-call SaaS vendor.

It is also a change of *legal entity*. The platform would be a distinct
product owned by **Ampliosoft AB**, not by Biomax HB. **Biomax HB becomes
a customer of the platform like any other** — the first tenant and the
dogfood canary, but not its owner and not architecturally privileged.
The codebase, repository, and IP move under Ampliosoft AB; biomax.nu the
shop is migrated onto the product as tenant #1.

### Market reality (researched 2026-05-18) — no strawman

- **The competitors are already Swedish.** Wikinggruppen (~3 % of all
  Swedish e-merchants, largest), Abicart/Textalk (since 1998, 3 800+
  customers), Quickbutik (~2 %) — Swedish-built, Swedish support, Klarna
  + PostNord already. So **"we're Swedish" is not a wedge** — they are
  too. Their weakness is age and inertia, not missing Swish.
- **Shopify's Swedish gaps are concrete:** Klarna only in base currency
  and only on email checkout; Fortnox/Visma needs a 3rd-party app
  (~3 000–8 000 SEK/yr) that still isn't full automation. Stitched,
  metered, accounting never truly closed.
- **Checkout is solved everywhere; bookkeeping is not.** The real,
  validated pain for a one-person shop is the chain order → moms →
  Fortnox/Visma/Bokio → Bokföringslagen-safe archive — done today with
  an accountant, an app, or duct tape.
- **Precedent: Tictail.** The original "Swedish Shopify for small
  shops" — loved product, ~$33M raised — still shut down and fire-sold.
  Lesson: *Swedish + nice product is not a moat*; a freemium model that
  ate the margin killed it.

### Why this is defensible (the wedge — sharpened)

Not "Swedish" (so are the incumbents). The moat is **how deep the
Swedish goes** — Korg owns the chain all the way into the books, as
platform foundation, not an app:

- **moms** correct at basis points, per-order, rate-change safe
  (`lib/checkout/vat.ts`).
- **Bokföringslagen** 7-year retention correct in the data model +
  erasure path (ADR 0025 / `lib/gdpr/core.ts`) — and exported as
  SIE/Fortnox-native, the part nobody does for small merchants without
  an add-on.
- **Kustom/Klarna + Swish** native checkout (table stakes, not the
  wedge — included so it's not a gap).
- **PostNord** service points native (ADR 0020/0021).
- **sv-SE only** (`project_swedish_only`) — narrowness is the strategy,
  not a limitation; no i18n/multi-currency to dilute.

The pitch is narrow on purpose: a baker in Kållered is selling in 20
minutes *and the moms and bookkeeping are already done* — the thing
neither the dated Swedish incumbents nor app-stitched Shopify deliver.
And the business model must not repeat Tictail's freemium mistake:
pricing that carries from customer #1 (see platform billing, §7).

## Decision (proposed)

Adopt a **shared-database, row-level multi-tenancy** model with hard
isolation enforced in the data layer, owned by Ampliosoft AB with
Biomax HB as customer #1, and a deliberately narrow Swedish-only feature
scope.

### 0. Entity, ownership, and product identity

- The platform is an **Ampliosoft AB** product named **Korg**, on
  **`korg.nu`** (chosen 2026-05-18). The domain doubles as the tagline
  — *"korg nu"* = "cart now" — and keeps the Ampliosoft `.nu` portfolio
  (biomax.nu → korg.nu) coherent. *Korg* = "basket," the one object
  every Swedish shopper already touches (*"lägg i korgen"*), so it needs
  zero explanation to the target merchant. Repo/org scope: `korg`.
  Merchant shops default to `{shop}.korg.nu`; biomax.nu becomes
  `biomax.korg.nu` internally (tenant #1). **Commitment is gated on the
  KORG Inc. trademark clearance — see open questions.**
- IP, repository, and any contracts sit with Ampliosoft AB. Biomax HB
  signs the same merchant terms + DPA as every other customer — no
  implicit entitlement, no special-cased code path, no billing
  exemption baked into the platform (any Biomax HB commercial
  arrangement is a billing-config concern, not an architectural one).
- Internally, biomax.nu is "tenant #1 / dogfood canary"; **legally and
  architecturally it is just a tenant.** Wherever this ADR says "tenant
  zero," read it as "first customer," not "owner."
- Practical consequence: nothing in `schema.prisma`, auth, payments, or
  pricing may hardcode "biomax". The current single-tenant code's
  biomax-specific assumptions (branding, Kustom creds in env, contact
  info, the knowledge base) become tenant data, not platform code.

### 1. Tenancy model — shared DB, `tenantId` everywhere

> **Mechanism pinned by ADR 0028 D1.** RLS as the boundary is
> **confirmed correct** — Watchtower runs it in production on the same
> Better Auth + Prisma + `pg.Pool` stack. The mechanism is
> **transaction-scoped `SET LOCAL app.current_tenant_id` inside a
> Prisma interactive `$transaction`** (not a bare session GUC, which
> *would* leak across pooled connections) + `FORCE ROW LEVEL
> SECURITY` + a `SECURITY DEFINER` bootstrap. An optional Prisma
> `$extends`/`AsyncLocalStorage` layer is ergonomic sugar, not the
> boundary. See ADR 0028.

Add a `Tenant` table. Every tenant-owned row gets a non-null `tenantId`
FK. Isolation is enforced **by Postgres RLS** keyed on a per-request
transaction-scoped `SET LOCAL` (ADR 0028 D1) — the database refuses
cross-tenant rows, so a missing app-layer `where` cannot leak.

- *Rejected: schema-per-tenant* — thousands of schemas make migrations
  (Prisma) and connection pooling operationally hostile at the
  mom-and-pop price point.
- *Rejected: database-per-tenant* — strongest isolation but the
  per-tenant cost/ops floor is incompatible with sub-€30/mo customers.
- *Chosen: shared DB + app-enforced query scoping* (ADR 0028 D1) — the
  only model whose unit economics work for the target segment, with a
  structural boundary that doesn't depend on per-query discipline.
  Revisit DB-per-tenant only for enterprise outliers, never as the
  default.

This touches **every model** in `prisma/schema.prisma`. It is the single
largest and riskiest change in this ADR.

### 2. Tenant resolution — subdomain + custom domain, at the edge

`{shop}.biomax.app` by default; merchant-mapped custom domains
(`butik.example.se`) via a `Domain` table + automated TLS. `middleware`
resolves the tenant from the host, sets the request tenant context (the
RLS GUC), and 404s an unknown host. No tenant id is ever taken from a
client parameter — same IDOR-proofing principle as ADR 0025.

### 3. Identity — split platform accounts from shop customers

Two distinct identity planes:

- **Merchant/staff accounts** — platform-level, belong to a `Tenant`,
  role-scoped per shop. Better Auth org/tenant scoping; admin 2FA stays
  mandatory (existing `lib/admin/guard.ts` posture, generalized).
- **Shop customers** — scoped to one tenant. The same email may exist as
  a separate customer under different shops; uniqueness becomes
  `(tenantId, email)`, not global `email`. This is a breaking change to
  the `User` model and Better Auth assumptions and must be designed
  explicitly, not migrated implicitly.

### 4. Payments — merchant-connected, platform is NOT a PSP

Today: one Kustom account in env vars. SaaS: **each merchant connects
their own Kustom/Klarna account**; we orchestrate, we never hold or route
their funds. This deliberately keeps us *out* of payment-facilitator /
PSP licensing and money-transmission scope — a hard line, not a
phase-2 nicety.

- Per-tenant payment credentials in a secrets vault (KMS-encrypted),
  never plaintext env. The single-account `isKlarnaConfigured()` boundary
  (ADR 0009) generalizes to per-tenant credential resolution.
- Stub mode stays for onboarding/dev.
- Swish is table-stakes for this segment and should be scoped in early
  even though biomax.nu itself doesn't use it.

### 5. Legal posture — we become a data processor (the big one)

Single-shop, biomax is a data **controller**. As a platform we are a
**processor** acting for each merchant (the controller). This is a
material legal lift, not a checkbox:

- A Data Processing Agreement per merchant, a maintained sub-processor
  list (Postgres host, Kustom, PostNord, Brevo, Sentry, etc.).
- ADR 0023–0025 work (consent log, retention purge, export/erasure)
  becomes **per-tenant** and must be exposed *to merchants* so they can
  serve their own customers' DSRs — our compliance core becomes a
  product surface, which is good, but it must be tenant-scoped end to end.
- Bokföringslagen retention is now per-merchant bookkeeping data we hold
  on their behalf — clarify in the DPA who exports/retains on exit.
- Tenant offboarding = full data export + hard delete on a defined SLA.

Recommend legal review of the processor model **before** build, not after
first paying customer.

### 6. Theming — token-driven, not arbitrary

Per-tenant branding via the existing design-token system (ADR 0006/0007):
logo, palette, type within a curated, accessible range. Explicitly
**not** an arbitrary theme/liquid engine or app marketplace in v1 — that
is Shopify's complexity moat and the opposite of "selling in 20 minutes."

### 7. Platform billing — separate from shop subscriptions

Merchants pay us on a subscription/usage plan. This is its own billing
domain — do **not** overload the customer-facing `Subscription` model
(ADR 0019 / prenumerationer); that is a shop feature, not platform
billing. Likely our own Kustom/Stripe-Billing account at the platform
level.

### 8. Scope discipline — what we deliberately will NOT build

Out of scope, on purpose: i18n / multi-currency / non-SE markets,
arbitrary theme engine, third-party app marketplace, B2B/multi-warehouse,
marketplace/multi-vendor. Each of these erodes the "narrow Swedish wedge"
and turns us into a worse Shopify. The sv-SE-only stance
(`project_swedish_only`) is now a strategic asset; protect it.

### Migration path

0. **Entity/IP move** (non-engineering, gates the rest): Ampliosoft AB
   ownership of repo + IP, product name chosen, merchant terms + DPA
   drafted with Biomax HB as the pilot signatory. Phase 1 can spike in
   parallel, but no external tenant onboards until this closes.
1. Introduce `Tenant` + RLS with biomax.nu as the sole tenant (customer
   #1). No behavior change; proves isolation under real traffic.
2. Generalize the env-var-singletons (payments, Brevo, PostNord,
   secrets) to per-tenant resolution, biomax.nu still the only tenant.
3. Tenant onboarding + subdomain routing + theming behind a flag.
4. Custom domains + automated TLS.
5. Merchant-facing DSR/compliance surfaces.
6. Platform billing + self-serve signup → first external pilot merchant.

Each phase ships with biomax.nu still live and unaffected — it is the
canary for every step.

## Consequences

**Positive**
- A defensible, narrow niche Shopify structurally won't serve well: a
  Swedish-first, compliant-by-default shop in minutes.
- The Swedish constraints already built (moms, Kustom, PostNord,
  Bokföringslagen, GDPR core) flip from "work we did" to "the product."
- Compliance tooling (ADR 0023–0025) becomes a sellable surface.

**Negative / risk (do not understate)**
- This is a **re-platform and a company pivot**, not a feature. Every
  model, the auth model, payments, and the legal posture all change.
- **Blast radius**: in a shared DB, an isolation bug is a multi-tenant
  data breach. RLS mitigates but raises the security bar permanently.
- **Operational burden**: 24/7 expectations, per-merchant incidents,
  support, onboarding, TLS automation, secrets management — a different
  company than "run one shop."
- **Legal/financial**: processor obligations, DPAs, sub-processor
  governance, staying out of PSP/money-transmission scope. Mis-scoping
  here is existential, not a bug.
- **Incumbent displacement is hard**: merchants rarely re-platform a
  working shop. The wedge must be a *new-shop* and *fed-up-switcher*
  play (bookkeeping pain + Shopify app-tax), not "we're a bit nicer."
  This is the Tictail failure mode — validate the switching trigger,
  not just the product.
- biomax.nu the shop must not regress while its platform is rebuilt
  underneath it; tenant-zero dogfooding is the mitigation but also a
  constant constraint.

**Open questions (resolve before go/no-go)**
- **KORG Inc. trademark clearance (blocking).** Name chosen (Korg,
  korg.nu) but KORG Inc. is a globally famous mark in musical
  instruments. Need a PRV (Sweden) + EUIPO search in the relevant Nice
  classes (35 retail/marketing services, 42 SaaS) and a confusion-risk
  read before "Korg" enters merchant terms, branding, or the repo
  rename. "Korg" is also a plain Swedish common noun ("basket"), which
  strengthens the position in SE specifically — confirm, don't assume.
  Domain being free ≠ trademark being clear. Must close before Phase 0
  completes; a fallback name should be held in reserve.
- IP/asset transfer mechanics from Biomax HB → Ampliosoft AB: is the
  existing codebase contributed/assigned cleanly, and does biomax.nu's
  shop content stay with Biomax HB as tenant data?
- Who owns the processor/DPA legal work, and on what timeline?
- Pricing/segment + switching trigger validated with real prospective
  merchants, or assumed? **Owned by
  `docs/strategi/korg-gtm-validering.md`** — its Gate 2 is the go/no-go
  for this ADR's Phase 2+; build order follows validated demand, not
  hope.
- Is the team resourced to run a SaaS on-call, or is this a
  fund/hire-gated decision?
- Swish in v1 or fast-follow?

**Recommendation:** worth doing, *if* it is consciously taken as a
business pivot with legal + ops investment, not framed as "make biomax
multi-tenant." Approve Phase 1 (Tenant + RLS, tenant zero) as a
low-risk, reversible spike that de-risks the hardest technical question
before any external commitment. Defer Phases 2+ behind the open-question
answers.
