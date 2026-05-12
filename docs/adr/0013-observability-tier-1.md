# ADR 0013 — Observability Tier 1 (Sentry, Plausible, Postgres backups)

**Date:** 2026-05-10
**Status:** Accepted (scaffold) · Pending production credentials
**Related:** ADR 0009 (Klarna), ADR 0010 (Brevo) — same mode-boundary pattern

## Context

Phase 8 of the build roadmap calls for "polish & monitoring (Sentry, Plausible, perf)". Without these in place we ship blind: errors only surface via customer emails, traffic is invisible, and any data loss is catastrophic.

Three foundational pieces are needed before launch:

1. **Error monitoring** — catch and alert on uncaught exceptions client- and server-side, in production.
2. **Analytics** — measure traffic, conversion, and content performance from day 1 in a way that doesn't pollute the GDPR posture.
3. **Backups** — daily Postgres dumps with retention so any catastrophic data loss is recoverable.

Tier 2 (Web Vitals tracking, Lighthouse CI, axe-core a11y, uptime monitoring) is sequenced after this and gets its own follow-up ADR when we get there.

## Decision

### 1. Sentry for error monitoring

`@sentry/nextjs` 10.x, wired via the modern Next 16 instrumentation hook pattern:

- `instrumentation.ts` — server runtime, gates init on `SENTRY_DSN`. Uses dynamic `import()` so the SDK never loads in environments without a DSN. Also exports `onRequestError` to forward server-side throws via `Sentry.captureRequestError`.
- `instrumentation-client.ts` — client runtime, gates on `NEXT_PUBLIC_SENTRY_DSN`. Same dynamic-import pattern. Exports `onRouterTransitionStart` to log navigation breadcrumbs for richer error context.
- `lib/monitoring/sentry.ts` — shared helpers (`isSentryConfigured`, `getSentryDsn`, defaults). Same shape as the Klarna and Brevo mode-boundary helpers from ADR 0009 / 0010.
- `next.config.ts` is wrapped with `withSentryConfig` only when **all three** of `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` are present. Source maps upload at build time when this gate is satisfied; otherwise the bare config is exported and dev builds stay fast.

#### Sampling defaults

- `tracesSampleRate`: **0.1 in prod, 0 in dev** — 10 % performance traces is enough to spot regressions without flooding the Sentry quota.
- `replaysSessionSampleRate`: **0** — session replay off by default to keep GDPR posture clean (no recording of normal traffic).
- `replaysOnErrorSampleRate`: **1.0** — replay 100 % of error sessions so we *do* see what the user did when something broke.
- `sendDefaultPii`: **false** — explicitly opt out of PII capture; Sentry can still receive event data we attach manually.

#### Required env (production only)

```
SENTRY_DSN=                # server-side
NEXT_PUBLIC_SENTRY_DSN=    # client-side (same DSN value, just exposed to bundle)
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=         # CI/build only, NEVER commit
SENTRY_ENVIRONMENT=        # optional, e.g. "production" | "preview"
```

In development none of these are set → Sentry import never happens → zero overhead.

### 2. Plausible for analytics

Privacy-first, EU-hosted, no cookies. **No consent banner required for it specifically** because it doesn't set cookies, doesn't fingerprint, and stores only aggregate counts. Excellent fit for the sv-SE-only Biomax brand.

- `components/site/analytics.tsx` — single `<Script>` tag, mounted in `app/layout.tsx`, gated on `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`.
- Uses `script.outbound-links.js` by default so external link clicks (Klarna, PostNord, etc.) are tracked as goals out of the box.
- Self-host or proxy support via `NEXT_PUBLIC_PLAUSIBLE_HOST` for ad-blocker resilience post-launch.

#### Required env (production only)

```
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=biomax.nu      # required to enable
NEXT_PUBLIC_PLAUSIBLE_SCRIPT=               # optional, defaults to outbound-links.js
NEXT_PUBLIC_PLAUSIBLE_HOST=                 # optional, defaults to https://plausible.io
```

#### Why not Google Analytics 4

GA4 sets cookies and requires explicit consent under EU/Swedish ePrivacy + GDPR. That means a consent banner, consent state, and the analytics being half-blind for users who decline. Plausible avoids all of that and the editorial brand posture (transparency, "we don't sell data" language in `/integritet`) reads more cleanly with it.

### 3. Postgres daily backups

Operational, not a code dependency. Lives at `scripts/backup-postgres.sh`.

- Reads `DATABASE_URL` (same source of truth as the app) — no separate connection config to drift.
- `pg_dump --format=custom --no-owner --no-privileges` for the canonical "production" dump format. Pipes through `zstd -19` for an extra ~30 % compression.
- **Tiered retention**: 7 daily, 8 weekly (Sundays), 12 monthly (1st of month). Hard-linked between tiers so a backup from 2026-01-04 (a Sunday and 1st-ish) consumes one copy on disk, not three.
- Designed for cron — single command, idempotent, exits non-zero on failure.

#### Cron entry (run on the production host)

```
0 3 * * * cd /srv/biomax && DATABASE_URL=... BACKUP_DIR=/srv/backups \
  ./scripts/backup-postgres.sh >> /var/log/biomax-backup.log 2>&1
```

#### Quarterly restore drill (manual, scheduled in calendar)

Backups that are never restored are theatre. Every quarter:

```
createdb biomax_restore_test
pg_restore --clean --if-exists --no-owner -d biomax_restore_test \
  <(zstd -dc backups/daily/biomax-YYYY-MM-DD.dump.zst)
# verify row counts on Order, Product, User
dropdb biomax_restore_test
```

#### Off-site storage

The script writes to a local directory. **Production setup must replicate `BACKUP_DIR` to an off-site location** (S3 / Backblaze B2 / Hetzner Storage Box). One bash one-liner via `rclone` or `aws s3 sync` after the local dump completes. Documented as a separate cron entry rather than baked into this script because the off-site target is host-specific.

## Consequences

- **Today:** No production credentials yet → all three integrations are no-ops. The app behaves identically with or without `SENTRY_DSN` / `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` set. Dev builds are unaffected.
- **At launch:** drop the env vars in, set up the cron, run a backup drill. Site goes from "ships blind" to "production-observable" without a code change.
- **Compounding:** `lib/monitoring/sentry.ts` becomes the home for any future error/perf helpers. `components/site/analytics.tsx` is where Tier 2 Web Vitals reporting will plug in. `scripts/backup-postgres.sh` is reusable for staging dumps and one-off snapshots.

## Open questions for the next ADR

- **Self-hosted vs cloud Plausible?** Cloud is the default; self-hosted gains ad-blocker resilience but adds ops surface. Decide before launch — not now.
- **Off-site backup target.** S3, B2 or Hetzner Storage Box — depends on production hosting choice (not finalised in ADR 0002).
- **Sentry quota planning.** With the default 0.1 trace sample rate and current traffic estimates, the free Developer plan should suffice for launch. Re-evaluate after first month of real traffic.
