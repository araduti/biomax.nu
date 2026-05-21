# ADR 0034 — Per-Tenant Payment Credentials & Kustom→Tenant Resolution

**Date:** 2026-05-19
**Status:** Accepted — implements ADR 0028 D4 for the payment plane only.
Unblocks, but deliberately does **not** include, the checkout
atomic-transaction tenant-scoping (ADR 0032 D7 — separate slice #7).
**Related:** ADR 0028 D4 (per-tenant config plane replaces the ~13 env
singletons), ADR 0026 §4 (payments — merchant-connected, platform is
NOT a PSP) / §5 (processor posture), ADR 0029 (hosting & secrets —
prod KMS), ADR 0031 D6 (platform plane owns integration-credential
management), ADR 0032 (data-access seam; D2 "outside the seam" list),
ADR 0020 (Kustom-managed shipping), ADR 0009 (`isKlarnaConfigured()`
stub boundary). Code: `lib/klarna/client.ts`,
`lib/klarna/credentials.ts`, `lib/security/secret-box.ts`,
`lib/checkout/kustom-session.ts`, `app/api/webhooks/klarna/route.ts`,
`lib/checkout/order-actions.ts`, migration
`20260519190000_tenant_payment_credentials`.

## Context

Today payment integration is a single-tenant env singleton. ADR 0028
finding #4 lists `lib/klarna/client.ts` `credentials()` /
`resolveBaseUrl()` and `KLARNA_WEBHOOK_SECRET` among the ~13
`process.env` config singletons that block multi-tenancy: one Kustom
merchant account for the whole process. ADR 0026 §4 makes the target
state a hard line, not a nicety: **each merchant connects their own
Kustom/Klarna account**; the platform orchestrates and never holds or
routes funds (this keeps Kine out of PSP / money-transmission scope).

Two distinct problems must be solved together:

1. **Credential resolution.** Every Kustom API call
   (create/update/read/acknowledge/capture/cancel/refund) must use the
   *acting tenant's* merchant credentials and host, not a global env
   pair.
2. **The webhook has no Host.** The Kustom push notification
   (`POST /api/webhooks/klarna`) is a server-to-server call with no
   tenant subdomain and no session — the normal `middleware.ts` →
   `currentTenant()` Host resolution (ADR 0028 D3) cannot run. The
   correct tenant has to be recovered *from the Kustom order itself*.
   This is the same chicken-and-egg shape as ADR 0028's RLS bootstrap
   ("the lookup needed to set the tenant context cannot itself be
   tenant-gated").

## Decision

### D1 — A platform-plane `TenantPaymentCredential` store, secrets encrypted at rest

One row per tenant (`tenantId` unique → `Tenant`, 1:1 for v1; a
`provider` column — reusing the existing `PaymentProvider` enum,
value `KLARNA`, internal naming kept per the deliberate
Klarna→Kustom non-rename — future-proofs a second processor without a
migration). Columns: `apiKeyId` (the Kustom API key id / legacy Klarna
username — identifying, not a secret, stored plaintext so it can be a
resolution fallback), `apiSecretEnc`, `webhookSecretEnc` (sealed —
see D3), `baseUrl` (the Kustom/Klarna host; the ADR 0020 footgun guard
— a `klarna.com` host cannot run Kustom Shipping Assistant — moves
from env-only into resolution and applies to the stored value too),
`mode` (`TEST` | `LIVE`, an onboarding/audit signal; the
configured-vs-stub switch remains credential *presence*, preserving
the ADR 0009 `isKlarnaConfigured()` contract), and `encVersion`
(forward-compat for KEK rotation / the KMS swap).

### D2 — This store is **outside** the tenant data-access seam (ADR 0032 D2)

`TenantPaymentCredential` is **not** a tenant-RLS-owned model. It joins
the explicit ADR 0032 D2 "outside the seam" list alongside `Tenant`,
`PlatformAdmin`, and Better Auth identity tables. Rationale — the same
bootstrap argument as ADR 0028: the webhook resolves *which tenant*
from this table, so the table cannot be gated on a tenant context that
does not exist yet. It is **platform-plane config** (ADR 0031 D6:
"integration-credential management per tenant"), not tenant data.
Confidentiality is not provided by RLS here but by **encryption at
rest** (D3): a stray `SELECT` yields ciphertext, not a merchant's live
payment secret. Reads/writes go through a single thin module
(`lib/klarna/credentials.ts`), never ad-hoc `prisma.tenantPaymentCredential`
elsewhere — the same seam discipline, enforced by convention here
because RLS deliberately does not apply.

### D3 — Secret sealing: dev-grade AES-256-GCM now, prod KMS deferred to ADR 0029

Secrets are sealed with AES-256-GCM via `lib/security/secret-box.ts`.
The stored format is self-describing — `v<scheme>:<iv>:<tag>:<ct>`,
base64 segments — so the decrypt path is chosen by the stored value,
not by config, which makes a future re-key a data migration rather
than a code fork. `encVersion = 1` ("dev AES-GCM, KEK from env"). The
KEK is read from `KINE_PAYMENT_KEK` (32+ bytes, scrypt-stretched);
**dev-only fallback** to `BETTER_AUTH_SECRET` with a single loud
`console.warn` so local/CI keep working without new env wiring.

**This is explicitly dev-grade and on the record as a must-un-ship
item.** Production secret storage — a managed KMS / envelope
encryption, key rotation, access audit — is owned by **ADR 0029** and
is *deferred*, exactly as ADR 0032's "dev role password in a
migration → infra/vault-provisioned" is deferred. What this ADR
guarantees now: **no plaintext payment secret is ever written to the
database or to git.** Plaintext only ever exists transiently in
process memory at call time, sourced either from the sealed DB column
or (tenant zero) from env — never persisted.

### D4 — Tenant-zero fallback: env stays the source of truth for biomax

Resolution order for an outbound Kustom call, given a tenant id:

1. A `TenantPaymentCredential` row for that tenant → unseal + use it.
2. No row → fall back to the existing `process.env` KUSTOM_/KLARNA_
   pair (today's behaviour, byte-for-byte).

This mirrors the `APP_DATABASE_URL ?? DATABASE_URL` philosophy (ADR
0032 D6): env remains the source of truth for **tenant zero** until
real per-tenant onboarding exists; nothing about single-tenant biomax
changes. The biomax row is *seeded* idempotently from the same env
(D6) so both paths resolve identically — and crucially, when env is
empty **no row is created**, so `isKlarnaConfigured()` stays false and
stub mode is preserved unchanged (ADR 0009 contract intact).

### D5 — Webhook → tenant resolution: token-primary, merchant_data cross-check, env fallback

The push receiver recovers the tenant with a layered mechanism, all
signals authored or held by us:

1. **`merchant_data.t`** — we now stamp the resolved tenant id into the
   Kustom create-order `merchant_data` JSON at both `createKlarnaOrder`
   call sites (alongside the existing `uid`/`lp`/`sub`). Kustom echoes
   `merchant_data` back verbatim on read-order, so it is the
   authoritative marker. *But it is only readable after
   `getKlarnaOrder`, which itself needs credentials* — hence it is the
   **cross-check**, not the bootstrap.
2. **Per-tenant webhook token** — the push URL carries
   `?token=<tenant webhook secret>` (already the ADR-documented
   mitigation for unsigned v3 push). The receiver matches the provided
   token against `TenantPaymentCredential.webhookSecret` to pick the
   tenant **before** any Kustom API call. This needs no Host and no
   prior API call → it is the **bootstrap signal**.
3. **Env / tenant-zero fallback** — token unmatched (e.g. the legacy
   global `KLARNA_WEBHOOK_SECRET`, biomax pre-onboarding) → resolve
   tenant zero with env credentials. Single-tenant behaviour unchanged.

After `getKlarnaOrder`, if `merchant_data.t` is present it is
**validated to equal** the bootstrap-resolved tenant; a mismatch is
rejected (`409`-style, logged) — defence against a token/order
confusion. `pushAuthorized()` validates against the *resolved*
tenant's webhook secret (env fallback for tenant zero).

The resolved `tenantId` is threaded into `ensureOrderFromKustomOrder`
(new optional parameter; the confirmation page passes
`currentTenant().id`, the webhook passes its resolved id). This slice
**validates and exposes** the tenant; it does **not** wrap the
existing 5-domain checkout transaction in `withTenantRLS` — that is
ADR 0032 D7 / slice #7. A `TODO(#7)` marks the exact feed point.

## Consequences

**Positive**
- ADR 0028 finding #4 closed for the payment plane; the
  `isKlarnaConfigured()` boundary (ADR 0009) generalises to per-tenant
  resolution with the stub contract intact.
- The webhook — the one payment path with no Host — has a robust,
  no-API-call-needed bootstrap (token) plus an authoritative
  cross-check (merchant_data), failing safe to single-tenant env.
- No plaintext payment secret in DB or git, now. The prod hardening is
  a localized data/format migration (self-describing ciphertext), not
  a re-architecture.
- biomax single-tenant behaviour is byte-for-byte unchanged (D4).

**Negative / risk**
- `TenantPaymentCredential` outside RLS (D2) means its confidentiality
  rests on encryption + the thin-module discipline, not the DB
  fail-safe. Accepted and on the record: it is bootstrap config, the
  same class as `Tenant`; RLS cannot apply to the table the resolver
  reads to find the tenant.
- Dev-grade KEK (D3) is a known transitional control. Tracked below.

## Must un-ship before production (on the record)

- Dev AES-GCM KEK from env / `BETTER_AUTH_SECRET` fallback → managed
  KMS + envelope encryption + rotation + access audit (ADR 0029).
  `encVersion`/self-describing format make this a data migration.
- Per-tenant onboarding UI (ADR 0031 D6) so credentials stop being
  env-seeded for tenant zero only; until then env is authoritative for
  biomax by design (D4), not by omission.

## Deferred (explicitly out of scope here)

- The checkout atomic-tx `withTenantRLS` wrap (ADR 0032 D7 / slice #7)
  — only the resolved-tenant *feed point* is prepared (`TODO(#7)`).
- Swish (ADR 0026 §4 — table-stakes for the segment, scoped later).
- Multiple credentials per tenant / provider switching (the `provider`
  column future-proofs the schema; no resolution logic yet).
</content>
</invoke>
