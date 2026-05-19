# Per-tenant DR runbook (Korg)

**Status:** documented procedure, manual ops. Code follows in
slices.
**Owns:** ADR 0033 Part A3 (per-tenant DR) + A4 (backup integrity
check).
**Cross-refs:** ADR 0029 (whole-DB PITR + role split),
ADR 0028 (multi-tenant substrate), ADR 0032 (RLS seam),
ADR 0033 (this resilience programme), `lib/tenant/export.ts` (A2),
`lib/gdpr/core.ts` (per-subject pattern A2 generalises).

## What this is for

The shared-DB + RLS substrate (ADR 0032) gives per-query isolation
but not per-tenant point-in-time recovery: a backup chain is one
backup chain for the whole cluster. ADR 0029 already promises
whole-DB PITR (pgBackRest / WAL-G). This runbook describes the
*coarse-but-real* procedure to recover a **single tenant** to a
target time using whole-DB PITR + the A2 per-tenant export as the
extract step. Cheap, manual, slow — by design. Move-out and a fast
per-tenant restore path stay out of scope until ADR 0033 Part B
triggers.

## When to invoke

1. A tenant reports data loss / accidental destructive action and
   asks for a partial restore.
2. A platform admin needs to roll back a tenant's state without
   reverting the whole cluster (touching other tenants).
3. A tenant offboarding request asks for a clean extract before
   row-anonymisation (the same A2 export, no PITR step).

## Procedure (coarse PITR + per-tenant re-import)

The whole procedure is operator-driven from a workstation with
platform-plane DB credentials. Estimate 30–90 min depending on
cluster size and the gap between target time and now.

### 1. Provision a side instance

- Spin up a clean Postgres instance at the same major version as
  prod (`prisma migrate deploy` will fail across major versions).
- Restore the most recent base backup via pgBackRest (or WAL-G),
  then replay WAL up to the **target time** the tenant specified.
  See ADR 0029 §"Backup/restore" for the exact tool invocation
  once the hosting build lands.
- Run `prisma migrate deploy` against the side instance using the
  `biomax` (migrate) role to bring schema to current; pure DDL,
  zero data movement.
- Provision `korg_app` on the side instance via the bootstrap
  migration so RLS policies apply identically to prod
  (`prisma/migrations/20260519180000_app_role_rls/`).

### 2. Take the per-tenant export against the side instance

- Point a one-off process at the side `DATABASE_URL` and run
  `exportTenant(tenantId)` (`lib/tenant/export.ts`).
- The export wraps every owned-model read in `tenantScope` →
  FORCE RLS guarantees we extract exactly that tenant's rows + its
  Better Auth Organization/Member/Invitation + Tenant +
  TenantPaymentCredential rows + object-storage manifest
  (currently empty per the deferred ADR 0028 D7 file-namespacing).
- Snapshot the resulting JSON to encrypted long-term storage
  (S3 + KMS) with the LSN of the side instance noted.

### 3. Re-import into prod

> **Open follow-up:** there is no automated importer companion to
> A2 today. Implementing one (`lib/tenant/import.ts`) is part of
> ADR 0033 Part B move-out — defer until the trigger fires or DR
> usage justifies it.

Manual re-import options, in order of safety:

- **Targeted SQL:** drop the affected owned-model rows for the
  tenant inside a single `tenantScope` write tx (RLS guards the
  scope), then `COPY` rows back from the export JSON. Keep the
  rollback window (step 5) open before purging.
- **Selective Prisma:** stand up a short tsx script that reads
  the JSON and replays it through `prisma.<model>.createMany`
  inside `tenantScope`. RLS will reject any rows whose `tenantId`
  doesn't match the GUC — additional fail-safe.

In both cases the re-import MUST run as the migrate role
(`biomax`) because some owned models have FKs to library-owned
tables (User → Order via Order.userId, etc.) and the runtime role
is DML-only with RLS forced; the migrate role bypasses RLS and
can stage rows under the right tenantId.

### 4. Verify

- `SELECT COUNT(*) FROM <owned_table> WHERE tenantId = $1` for
  every model that should have changed; diff against the export
  counts.
- Run the cross-tenant integration suite scoped to the recovered
  tenant if available (ADR 0032 D5 contract: "any read without
  tenantScope returns zero rows").
- Spot-check the highest-value entities: Orders + OrderItems
  (Bokföringslagen records), Subscriptions, LoyaltyAccount.

### 5. Rollback window + tear-down

- Keep the side instance running (read-only) for 24h so we can
  re-extract if the import revealed gaps.
- Tear it down after the rollback window closes. Encrypted JSON
  stays in long-term storage per the platform retention policy.

## Assumptions + dependencies

- **PITR available on the cluster.** Whole-DB pgBackRest/WAL-G is
  per ADR 0029. Until that hosting build ships, this runbook
  cannot execute against prod; it is a paper procedure for now.
- **Operator-only.** No self-service tenant-time-travel surface;
  the platform UI exposes A2 export, not restore.
- **Offboarding flow.** A tenant deletion request runs A2 against
  prod → archives the JSON → then anonymises in place via the
  existing `lib/gdpr/core.ts` patterns extended per-tenant.
  Bokföringslagen-retained financial rows (Orders) stay
  pseudonymised in the live DB.

## A4 — Weekly backup-integrity check

ADR 0033 Part A4. The cheapest acceptable verification is a
documented cron (NOT yet implemented in code) that proves the
backup chain can actually be turned into a tenant snapshot.

**Contract:**

1. **Cadence:** weekly, off-peak.
2. **Action:** restore the latest base backup + WAL to a side
   instance (steps 1-2 above), run `exportTenant(biomax)`, and
   diff:
   - Owned-model row counts vs. the live cluster's counts (same
     query, run against prod just before the side-restore).
   - Drift > 0.5% on `orders`, `orderItems`, `subscriptions`,
     `loyaltyAccounts` → page the on-call.
3. **Output:** persist the count diff + restore wall-clock time
   to an internal artefact (CloudWatch / Better Stack / wherever
   the ADR 0029 hosting build lands its observability).
4. **Failure modes worth paging on:**
   - Side restore fails (backup unreadable, WAL gap).
   - `exportTenant` throws (schema drift, RLS regression).
   - Row count diff exceeds threshold (silent corruption /
     replication lag in the backup chain).

The implementation is deferred — a small GitHub Actions /
scheduled task runner is enough once ADR 0029 ships, and lives in
infra-as-code, not the application repo. Until then this contract
documents the trigger so the first quarterly review can stand it
up without re-deriving requirements.
