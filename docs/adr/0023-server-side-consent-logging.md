# ADR 0023 — Server-Side Consent Logging

**Date:** 2026-05-18
**Status:** Accepted
**Related:** ADR 0010 (Brevo/newsletter consent), ADR 0013 (observability)

## Context

The cookie/tracking consent banner (`components/site/cookie-consent.tsx`)
persists the visitor's choice **only** in `localStorage["biomax-consent"]`.
GDPR Art. 7(1) requires the controller to be able to *demonstrate* that
consent was given. A client-only, user-wipeable, non-auditable record does
not satisfy that burden of proof.

Today the only non-functional tracker is Plausible (cookieless, EU-hosted),
so real-world exposure is low. It stops being low the moment a Meta/Google
pixel ships (the banner already has a `marketing` toggle scaffolded for
exactly that). The GDPR gap audit (2026-05-18) flagged this as the
highest-priority item to close *before* any marketing pixel launches.

Newsletter consent is already proven server-side (`NewsletterSubscriber`
with `consentedAt`). Cookie/analytics/marketing consent has no equivalent.

## Decision

### Append-only `ConsentEvent` table

Every banner save (Accept all / Only necessary / Save custom selection)
writes one immutable `ConsentEvent` row server-side, in addition to the
existing localStorage write (which stays as the client UX cache so the
banner doesn't re-prompt).

Row captures: a stable random `subjectKey` (generated client-side, stored
in `localStorage["biomax-consent-id"]` so repeat visits correlate), the
logged-in `userId` when available, the `analytics`/`marketing` booleans,
the `policyVersion` in force, `source`, and `ip`/`userAgent` for forensic
correlation. Withdrawal is just a new row with the flags flipped — the log
is **append-only**, never updated or deleted in place, so the full consent
history is reconstructable.

`policyVersion` is a single constant (`CONSENT_POLICY_VERSION`) bumped
whenever the privacy policy / banner copy materially changes, so we can
prove *which* disclosure the visitor agreed to.

### The write is best-effort and fail-soft

Mirrors the `audit()` contract (ADR 0013): a logging failure must never
block the UI or throw into the banner. The localStorage write is the
source of truth for *banner behaviour*; the DB row is the source of truth
for *legal proof*. They're written independently.

### Functional cookies are not logged

Strictly-necessary cookies (session, cart) are exempt from consent under
ePrivacy Art. 5(3)(b). We only log the discretionary categories.

## Consequences

**Positive**
- Demonstrable consent (Art. 7(1)) with timestamp, policy version, and
  category granularity — ready before marketing pixels go live.
- Append-only history proves both grant *and* withdrawal.
- Zero added latency on the critical path (fire-and-forget server action).

**Negative / risk**
- `ConsentEvent` grows unbounded. Mitigated by the retention purge in
  ADR 0024 (prune after `CONSENT_RETENTION_DAYS`).
- `subjectKey` is anonymous; we can correlate a chain of consent events
  but not always to a natural person until they log in. Acceptable —
  the obligation is to prove consent for the *visitor*, and the row is
  enough for that.

**Out of scope**
- A consent-management UI to re-open the banner (a separate small follow
  -up; see GDPR audit item 4). This ADR only covers the proof record.
- Migrating newsletter consent into `ConsentEvent` — it already has its
  own provable record; no need to duplicate.
