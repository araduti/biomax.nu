# ADR 0025 — Customer Self-Service Data Subject Requests

**Date:** 2026-05-18
**Status:** Accepted
**Related:** ADR 0003 (auth/session), ADR 0019 (loyalty), GDPR audit 2026-05-18

## Context

Today a data subject request (Art. 15 access, Art. 17 erasure) requires
the customer to email `kontakt@biomax.nu`; an admin then manually runs
`exportCustomerData()` / `anonymizeCustomer()` from the admin panel. The
GDPR audit flagged this as the top operational risk: a missed inbox =
a missed statutory one-month deadline, with no ticket trail proving
timeliness.

The hard part — correct export aggregation and Bokföringslagen-safe
anonymisation — **already exists** in `lib/admin/gdpr-actions.ts`. Only a
customer-facing, self-authenticated entry point is missing.

## Decision

### Shared GDPR core, two callers

Extract the export-aggregation and anonymise-in-place logic into
`lib/gdpr/core.ts` (`buildUserExport(userId)`, `anonymizeUser(userId)`).
The existing admin actions and the new self-service actions both call it.
Behaviour (including the 7-year order-row retention) is **identical** by
construction — there is no second implementation to drift.

### Self-service actions are session-derived, never id-parameterised

`lib/account/gdpr-self-service.ts` exposes `exportMyData()` and
`deleteMyAccount(confirmation)`. Both resolve the target user from
`currentUser()` (the Better Auth session) and **take no userId from the
client**. This structurally eliminates IDOR — a customer can only ever
export/erase their own account, regardless of what they POST.

`deleteMyAccount` requires the user to type a fixed confirmation phrase
(`RADERA`); the server re-checks it. On success it runs the same
anonymise path, then invalidates the session (the anonymise core already
deletes `Session`/`Account` rows) and the client redirects out.

### Audit trail distinguishes self-service from admin

Self-service writes `AdminAuditEntry` with `actorId = the user's own id`
and actions `customer.self-export` / `customer.self-delete`, so the log
shows the request was customer-initiated, satisfying the
"prove we acted, and when" need the manual email flow lacked.

### Surfaced under `/konto/dataskydd`

New account page + sidebar entry ("Dataskydd"). One-click data download
(JSON, Art. 15 + 20) and a gated account-deletion panel. The existing
`/gdpr` informational page stays and links here for logged-in users; the
email route remains for non-account holders.

## Consequences

**Positive**
- De-risks the manual-email bottleneck; access/erasure become immediate
  and self-served for the common case (logged-in customers).
- Single GDPR implementation shared by both callers — no drift, no second
  audit surface.
- IDOR-proof by design (no client-supplied id).

**Negative / risk**
- Self-service erasure is irreversible and customer-triggered. Mitigated
  by the typed-confirmation gate and the fact that the underlying core
  anonymises (keeps bookkeeping rows) rather than hard-deletes — a
  mistaken click loses account access, not financial records.
- Non-account holders (guest orders) still use the email route — out of
  scope here; their data is keyed by order email and handled admin-side.

**Out of scope**
- Art. 16 rectification self-service (profile edit already covers the
  common case; documented manual procedure otherwise).
- Identity step-up (re-auth/2FA) before deletion — the active session is
  the auth boundary, consistent with the rest of `/konto`.
