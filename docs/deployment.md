# biomax.nu — Deployment (Ampliosoft platform handoff)

This is the Part A deliverable for the Ampliosoft self-hosted platform
(Intel NUC · Docker Compose · Traefik v3 · PostgreSQL · Cloudflare DNS).
It is the authoritative reference for build args, runtime env, migrations,
seeding, health, shutdown, and resource sizing.

- **Runtime:** Node.js 22 (Next.js 16, App Router, standalone output).
- **Package manager:** **npm** (`package-lock.json` committed). Commands
  below are npm; substitute your platform's equivalent if you wrap them.
- **Auth:** Better Auth (`lib/auth.ts`, route `app/api/auth/[...all]`).
- **Web image:** `docker/biomax/web/Dockerfile` (multi-stage
  `deps → builder → runner`; final stage non-root `nextjs:1001`).
- **DB:** PostgreSQL 17 or 18.

---

## 1. Build args (§A4)

`next build` + Better Auth read these at module load. Pass **harmless
placeholders** at build time — real values are injected at runtime via
Compose `environment:` and are NOT baked into the image. The Dockerfile
already defaults them to placeholders; override only if you must.

| Build ARG | Safe placeholder |
|---|---|
| `BETTER_AUTH_SECRET` | `build-placeholder` |
| `BETTER_AUTH_URL` | `https://biomax.nu` |
| `DATABASE_URL` | `postgresql://x:x@build.invalid:5432/biomax` |
| `NEXT_PUBLIC_APP_URL` | `https://biomax.nu` |

```bash
docker build -f docker/biomax/web/Dockerfile \
  --build-arg BETTER_AUTH_SECRET=build-placeholder \
  --build-arg BETTER_AUTH_URL=https://biomax.nu \
  --build-arg DATABASE_URL=postgresql://x:x@build.invalid:5432/biomax \
  --build-arg NEXT_PUBLIC_APP_URL=https://biomax.nu \
  -t biomax-web .
```

The build is hardened against missing config: `lib/auth.ts` tolerates a
placeholder secret during `phase-production-build` and the runtime
env-validator (`lib/env.ts`) is skipped in the build phase. No
`NEXT_PUBLIC_*` value is required to be *correct* at build time.

---

## 2. Runtime environment (§A5)

Injected via Compose `environment:` on `biomax-web`. The first block is
**required** and validated at boot (`lib/env.ts` → the container exits
with a clear, variable-named error if any is missing).

| Variable | Required | Purpose |
|---|---|---|
| `NODE_ENV` | ✅ | `production` in prod containers. |
| `PORT` | ✅ | Listen port. Default `3000`. |
| `DATABASE_URL` | ✅ | `postgresql://biomax_app:…@biomax-pg:5432/biomax?schema=public` — **DML-only `biomax_app` role**, used by the running app. |
| `DATABASE_MIGRATE_URL` | ✅ (migrate container only) | DDL + RLS-bypass **`biomax_migrate` role**. Used only by the one-shot migrate container's Prisma CLI (see `prisma.config.ts`). Unused/absent on `biomax-web`. |
| `BETTER_AUTH_SECRET` | ✅ | Session signing key. `openssl rand -base64 32`. |
| `BETTER_AUTH_URL` | ✅ | Canonical public URL, e.g. `https://biomax.nu`. |
| `NEXT_PUBLIC_APP_URL` | ✅ | Same value as `BETTER_AUTH_URL` (client-side). |
| `SEED_ADMIN_EMAIL` | migrate only | Bootstrap admin email. |
| `SEED_ADMIN_PASSWORD` | migrate only | Bootstrap admin password. **Clear after first deploy** to disable the seeder. |
| `LOG_LEVEL` | ⬜ | `info` by default. |

Notes / deviations from the platform's default table:
- **No `SMTP_*`.** Transactional/marketing email goes through **Brevo's
  HTTP API**, not SMTP. Brevo is *optional* — unset `BREVO_API_KEY` →
  email runs in stub mode (logged, not sent). Set `BREVO_API_KEY` +
  `BREVO_WEBHOOK_SECRET` for live email.
- Many other **optional** integrations (Kustom checkout, PostNord,
  Plausible, Sentry, GSC, cron) each stub-mode cleanly when their keys
  are empty. `.env.example` documents every one with a comment. None are
  required for the app to boot or serve.
- No required variable defaults to `localhost` in a production code path.
- `.env.example` mirrors this table (plus the optional integrations).

---

## 3. Migrations (§A6)

Postgres **17 or 18**. Prisma schema at `prisma/schema.prisma`,
migrations committed under `prisma/migrations/`. The one-shot migrate
container runs:

```bash
npm run db:migrate:deploy      # = prisma migrate deploy
```

`prisma.config.ts` resolves the datasource to **`DATABASE_MIGRATE_URL`
when set**, else `DATABASE_URL`. So the migrate container should set:

- `DATABASE_MIGRATE_URL` → `biomax_migrate` role (DDL/RLS-bypass; used by
  `prisma migrate deploy`).
- `DATABASE_URL` → `biomax_app` role (DML; used by the seeder below).

No Row-Level Security policies are applied out of band — there are none
today; if added they ship as ordinary migrations.

---

## 4. Seeding (§A6)

Idempotent admin bootstrap, run **after** migrate deploy in the same
one-shot container:

```bash
npm run db:seed                # = tsx prisma/seeds/index.ts
# or, to also reset the admin password through Better Auth's hasher:
npx tsx prisma/seeds/index.ts --force
```

Behaviour:
- Reads `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD`. If **either is
  unset/empty** → logs one line and exits 0 (no-op).
- User missing → created via Better Auth (password hashed by Better
  Auth, so it can sign in immediately), promoted to `role=admin`,
  `emailVerified=true`.
- User exists → role ensured `admin`; password untouched unless
  `--force`.
- Safe to run on every deploy.

**Disable after first deploy:** clear `SEED_ADMIN_PASSWORD` (or
`SEED_ADMIN_EMAIL`) in `.env`. The seeder then no-ops.

Combined migrate-container command (matches `docker-compose.dev.yml`'s
`migrate` service):

```bash
npm run db:migrate:deploy && npm run db:seed
```

---

## 5. Health check (§A3/B5)

- **URL:** `GET /api/health`
- **Response:** `200` with body `{"status":"ok"}`
- No auth, no DB, no external calls — proves only that the Node process
  serves HTTP. No `HEALTHCHECK` is baked into the image (Traefik +
  Compose own liveness). Compose probe (Node one-liner):

```yaml
healthcheck:
  test: ["CMD","node","-e","fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
  interval: 10s
  timeout: 5s
  retries: 6
  start_period: 20s
```

---

## 6. Graceful shutdown (§A8)

- Signal: **`SIGTERM`**.
- The Next.js standalone server drains in-flight HTTP and the process
  exits well within a **30 s** grace window. Postgres connections are
  pooled by the `pg` driver adapter and closed on process exit.
- Recommend Compose `stop_grace_period: 30s` for `biomax-web`.
- Logs go to **stdout/stderr** only (no file logging). No telemetry
  phones home: Next telemetry is disabled (`NEXT_TELEMETRY_DISABLED=1`)
  and Sentry only initialises when `SENTRY_DSN` is set.

---

## 7. Resource sizing (best estimate)

Next.js 16 SSR + Prisma, single instance, modest Swedish-market traffic:

| | Request | Limit |
|---|---|---|
| `biomax-web` | 0.5 vCPU / 512 MiB | 1.0 vCPU / 1 GiB |
| `biomax-pg` | 0.25 vCPU / 256 MiB | 0.5 vCPU / 512 MiB |
| `biomax-migrate` (one-shot) | — | 0.5 vCPU / 512 MiB transient |

Peak RAM is the Node heap during SSR of the heaviest pages (admin
dashboards); 1 GiB is comfortable headroom. Cold start to first healthy
`/api/health`: ~3–8 s on the NUC.

---

## Quick reference for the platform team

1. **Repo SSH URL:** `git@github.com:araduti/biomax.nu.git` (confirm the
   exact slug — the repo is `araduti/biomax.nu`).
2. **v1 SHA:** the merge commit on `main` after this PR (report the
   short SHA when handing back).
3. **This file** is `docs/deployment.md`.
4. **Deviations from §A5/§A6:** no `SMTP_*` (Brevo HTTP API instead);
   package manager is **npm**, not bun (use `npm run db:migrate:deploy`
   / `npm run db:seed`); Postgres 17 *or* 18 both supported.
