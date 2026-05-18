# ADR 0024 — Data Retention Purge

**Date:** 2026-05-18
**Status:** Accepted
**Related:** ADR 0013 (telemetry-cleanup cron), ADR 0023 (consent logging),
ADR 0018 (abandoned-cart / CartSnapshot)

## Context

GDPR Art. 5(1)(e) (storage limitation) requires personal data to be kept
"no longer than is necessary". Today erasure is purely **reactive** —
`anonymizeCustomer()` only runs when an admin triggers it. Nothing
proactively ages out personal data that no longer has a purpose.

Concrete gaps found in the 2026-05-18 GDPR audit:

- **`CartSnapshot`** — the schema comment promises "auto-expire after 30
  days" but *nothing enforces it*. `telemetry-cleanup` doesn't touch it;
  the abandoned-cart cron only reads/updates, never deletes. Rows
  (email + cart contents = personal data) accumulate forever.
- **`StockNotificationRequest`** — email addresses retained indefinitely.
  `anonymizeCustomer()` itself notes there is "no bookkeeping reason to
  retain" these, yet absent anonymisation they live forever.
- **`ConsentEvent`** (new in ADR 0023) — grows unbounded by design.

`telemetry-cleanup` (ADR 0013) already establishes the pattern for
unbounded *non-personal* tables (WebVital, GscSnapshot). This ADR adds
the equivalent for *personal-data* tables, kept as a separate cron so the
retention windows and their legal rationale aren't buried next to
telemetry tuning.

## Decision

### New cron `/api/cron/data-retention`

Same auth + shape contract as every other `/api/cron/*` route
(`cronAuthorized`, fail-closed in prod). Weekly schedule in `vercel.json`.
Index-range deletes only (all target date columns are indexed).

Retention windows:

| Table | Window | Rationale |
|---|---|---|
| `CartSnapshot` | 30 days | Enforces the policy the schema already documents; abandoned-cart flow is done after 72 h |
| `StockNotificationRequest` | 180 days | A back-in-stock interest is stale long before this; no bookkeeping basis to keep |
| `ConsentEvent` | `CONSENT_RETENTION_DAYS` (730) | Proof of consent is only useful while the consent (or its withdrawal) is legally relevant; 24 months balances provability vs. minimisation |

### Explicitly NOT automated here

- **Order rows / order-linked PII** — legally *required* to retain 7 years
  (Bokföringslagen 7 kap). Untouched. Erasure of these is the
  anonymise-in-place path, admin-triggered, unchanged.
- **Inactive-account anonymisation** — automatically anonymising dormant
  customer accounts is destructive, irreversible, and a business/CRM
  decision (it kills loyalty balances, subscription history, re-marketing
  reach). It needs explicit product + legal sign-off on the inactivity
  threshold and notice flow. Deliberately deferred — a retention cron must
  not be the thing that silently deletes customers.
- **Expired `Session`/`Verification` rows** — Better Auth + the existing
  `auth-expiry` concerns own auth lifecycle; not duplicated here.

## Consequences

**Positive**
- Closes the Art. 5(1)(e) gap for the three unbounded personal-data
  tables; makes the `CartSnapshot` schema comment true.
- Bounded table growth → cheaper backups/vacuum, consistent with the
  telemetry-cleanup precedent.

**Negative / risk**
- A misconfigured window could delete still-useful data. Mitigated by
  conservative windows and per-table constants with inline rationale.
- Deleting `CartSnapshot` rows slightly shortens the abandoned-cart tail,
  but 30 d >> the 72 h the flow needs.

**Out of scope**
- Inactive-account lifecycle (deferred above, needs sign-off).
- Per-user retention overrides / legal holds.
