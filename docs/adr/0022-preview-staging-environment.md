# ADR 0022 — `preview.biomax.nu` Staging Environment & DNS Cutover

**Date:** 2026-05-17
**Status:** **Accepted.** Pre-launch. `main` is the deployable trunk;
`preview.biomax.nu` is the staging origin until the DNS cutover.
**Related:** ADR 0003 (own the auth stack), ADR 0020 (Kustom-managed
checkout), ADR 0021 (Express checkout — tabled), `.env.example`
(environment reference), `.github/workflows/lighthouse.yml`

## Context

We launch imminently. The app is built and merged to `main`. We need a
production-like environment to (a) smoke-test the real Kustom +
PostNord + Brevo integrations against live-but-isolated credentials,
(b) validate the auth/session/2FA stack on a real HTTPS origin, and
(c) rehearse the go-live so the public DNS switch is a no-op rather
than a first run.

Constraints / facts driving this:

- We host on our own Docker infrastructure (not Vercel), so the app
  runs as a container behind a TLS-terminating reverse proxy.
- `biomax.nu` DNS still points at the legacy WordPress site until
  cutover. We cannot test on the real domain without taking the old
  site down.
- Several integrations validate the **public origin**, not just
  credentials:
  - Better Auth `trustedOrigins` / `baseURL` must match the browsing
    origin exactly (ADR 0003; see `lib/auth.ts`).
  - Kustom rejects a non-public-HTTPS `merchant_urls.push`
    (`KUSTOM_MERCHANT_BASE_URL`) and requires the host registered in
    its portal.
  - Brevo and the cron endpoints authenticate by a shared
    secret/origin (`BREVO_WEBHOOK_SECRET`, `CRON_SECRET`).
- A real subdomain is therefore required — `localhost`/ngrok is not
  representative of the launch topology.

## Decision

Stand up a dedicated **staging environment served at
`preview.biomax.nu`**, identical in shape to production, and cut over
to `www.biomax.nu` by DNS once it is validated.

### Topology

- **DNS:** add a `preview` A/AAAA (or CNAME) record at the registrar
  pointing at the Docker host's ingress. The apex/`www` records are
  **left untouched** (still legacy WP) until cutover.
- **TLS:** issue a certificate for `preview.biomax.nu` (and, ahead of
  cutover, also provision `biomax.nu` + `www.biomax.nu` so the switch
  needs no cert dance). ACME/Let's Encrypt via the reverse proxy.
- **Container:** the same image we deploy to production. Environment
  is the only thing that differs (below).
- **Database:** a **separate** staging Postgres (not the production
  volume). Schema via `prisma migrate deploy`. Seed only what staging
  smoke tests need; never copy production customer data into staging
  (GDPR — see ADR 0019 / data-minimisation posture).

### Environment policy (staging vs production)

Driven entirely by env vars (no code branches). Per `.env.example`:

| Var | `preview.biomax.nu` (staging) | `www.biomax.nu` (prod) |
|---|---|---|
| `BETTER_AUTH_URL` / `NEXT_PUBLIC_SITE_URL` | `https://preview.biomax.nu` | `https://www.biomax.nu` |
| `BETTER_AUTH_SECRET` | staging-only secret (`openssl rand -hex 32`) | distinct prod secret |
| `KUSTOM_API_URL` | playground host | production host |
| `KUSTOM_MERCHANT_BASE_URL` | `https://preview.biomax.nu` | unset (falls back to `BETTER_AUTH_URL`) |
| `KLARNA_WEBHOOK_SECRET` / `CRON_SECRET` / `BREVO_WEBHOOK_SECRET` | staging secrets | distinct prod secrets |
| Brevo / GSC / Plausible / Sentry | stub or staging keys; `SENTRY_ENVIRONMENT=staging` | prod keys; `SENTRY_ENVIRONMENT=production` |

`trustedOrigins` in `lib/auth.ts` already locks to
`BETTER_AUTH_URL` in production, so setting the var correctly per
environment is sufficient — no code change.

Portal-side registration (manual, owner action): register
`preview.biomax.nu` (and later the prod domain) in the Kustom portal
(checkout host + Elements "My domains") and as the Brevo webhook URL.

### Branch / deploy model

- `main` is the single deployable trunk. **This PR (#2) merges to
  `main`.** Staging deploys from `main`; production deploys the same
  commit/image once staging is signed off.
- No long-lived `staging` branch — the environment, not the branch, is
  what differs. A release is "promote the image `preview` validated".

### Cutover procedure (rehearsed on staging first)

1. Pre-provision TLS for `biomax.nu` + `www.biomax.nu`.
2. Bring the production container up on the prod env table, reachable
   internally, not yet DNS-pointed.
3. Final staging smoke: a real Kustom checkout (playground) → push
   webhook → `/checkout/bekraftelse` → one `Order` row; auth signup +
   2FA; a transactional email; the cron auth-expiry + subscription
   renewal endpoints with the prod-shaped `CRON_SECRET`.
4. Flip `biomax.nu`/`www` DNS to the Docker ingress; lower TTL ~24h
   beforehand so propagation is fast and reversible.
5. Swap Kustom to the **production** API host + production client; flip
   `KUSTOM_*` and unset `KUSTOM_MERCHANT_BASE_URL`.
6. Keep the legacy WP reachable (e.g. `old.biomax.nu`) for a short
   rollback window; rollback = revert the DNS record (TTL-bounded).

## Consequences

- **Positive:** the public switch is a DNS change against an already
  validated, identical environment — not a first boot. Origin-sensitive
  integrations (auth, Kustom push, webhooks) are proven on a real
  HTTPS subdomain before customers hit them. Rollback is a single
  TTL-bounded DNS revert.
- **Negative:** duplicate infra (second DB + container + certs) and
  secret set to manage for the staging window; some checks
  (Kustom production entitlement, real PostNord booking key) can only
  be fully exercised after the prod swap, not on playground staging.
- **Out of scope:** Express checkout stays tabled (ADR 0021 — env
  vars unset in both environments). Live PostNord label booking
  remains manual until the Booking API key lands. Production
  observability/alerting hardening is a separate follow-up.
