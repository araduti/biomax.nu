# Biomax.nu – Next.js 16 rebuild (Phase 1)

## Confirmed business priorities
1. **Marketing & Conversion first** (trust, upsell, social proof, email capture)
2. **SEO + AI SEO** (metadata, schema, indexability, content automation)
3. **Premium UX/UI** (clean, medical-grade trust, mobile first)
4. **Performance & scale** (edge-ready, fast navigation, maintainable architecture)

## Phase 1 deliverables implemented
- Next.js 16.2 + React 19.2 + TypeScript + App Router scaffold
- Tailwind CSS v4 setup (default in generated project)
- Prisma 7 schema for products, categories, blog, users, orders, reviews, wishlist, coupons, newsletter
- Homepage rebuild focused on Swedish health-brand conversion patterns
- Foundation dependencies: `clsx`, `tailwind-merge`, `zustand`, Prisma client

## Tech decisions (Phase 1)
- **Next.js 16 + Turbopack**: fastest iteration loop and production-grade App Router platform.
- **Tailwind v4**: simple design system evolution with low CSS overhead.
- **Prisma 7 + PostgreSQL**: type-safe schema and migrations for e-commerce + content data model.
- **Zustand**: lightweight cart state option (selected as preferred baseline).
- **Auth recommendation**: Auth.js v5 for full control over custom account + admin flows.

## Route map (App Router target structure)
Implemented now:
- `/` – homepage (hero, categories, bestsellers, trust + newsletter)

Planned next:
- `/produkter`
- `/produkter/[slug]`
- `/blogg`
- `/blogg/[slug]`
- `/konto`
- `/checkout`
- `/admin`
- `/api/ai-seo`
- `/immunforsvar` (marketing landing page pattern)

## Folder structure (Phase 1 baseline)
```txt
app/
  layout.tsx
  page.tsx
  globals.css
lib/
  utils.ts
prisma/
  schema.prisma
```

## Prisma models included
- Catalog: `Category`, `Product`, `ProductCrossSell`
- Content: `BlogCategory`, `BlogPost`
- Commerce: `Order`, `OrderItem`, `Coupon`
- Customer: `User`, `Address`, `Wishlist`, `WishlistProduct`, `Review`
- Marketing: `NewsletterSubscriber`

## Local development — step by step

Prerequisites: Node 22+, npm, and Docker (Colima, Docker Desktop, or
any engine). The dev database runs in Docker; everything else runs on
the host.

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Then edit `.env.local`:

- `DATABASE_URL` already points at the Docker dev DB
  (`postgresql://biomax:biomax@localhost:5433/biomax_dev`) — leave as is.
- Generate an auth secret (required — the app refuses to boot without it):

  ```bash
  openssl rand -hex 32   # paste into BETTER_AUTH_SECRET
  ```

- Every integration (Kustom, PostNord, Brevo, GSC, Sentry, …) runs in
  **stub mode** when its keys are empty, so you can start with just the
  two values above. See the comments in `.env.example` for what each
  integration needs when you want it live.

### 3. Set up the container engine (Colima)

Any Docker engine works; this guide uses [Colima](https://github.com/abiosoft/colima)
because it's the common setup here and it's easy to keep this project's
VM **isolated from other projects**.

#### First-time install

```bash
brew install colima docker docker-compose
```

#### Use a dedicated, isolated profile

Don't share one Colima VM across unrelated projects — a crash or a
resource-starved VM in one project takes down all of them (we've been
bitten by exactly this). Create a project-scoped profile instead:

```bash
colima start biomax --cpu 2 --memory 4 --disk 20
```

This creates a VM **and** a docker context both named `colima-biomax`,
independent of any `default` / other-project profiles. Inspect what
exists:

```bash
colima list                 # all profiles + STATUS
docker context ls           # one context per profile
```

#### Select this project's context before every Docker command

When multiple profiles exist, Docker talks to whichever context is
active. Always point it at this project's profile first:

```bash
docker context use colima-biomax
docker ps                   # must respond without "Cannot connect to the Docker daemon"
```

> If `docker ps` errors but `colima list` says the profile is
> "Running", the VM is wedged. Restart **only this profile** so you
> don't disturb other projects' VMs:
> `colima restart biomax` (then re-select the context).

> Prefer not to manage profiles? `colima start` (the `default`
> profile, context `colima`) also works — just be aware it's then
> shared with every other project on your machine.

### 4. Start the database (Docker)

```bash
docker compose -f docker-compose.dev.yml up -d
```

This starts Postgres 17 on host port **5433** (container 5432) with a
persistent `pgdata` volume. Port 5433 is deliberate — it avoids
clashing with a stock Postgres (system service or another project's
container) on the default **5432**, so this DB can run alongside
others. The container is named `biomaxnu-db-1` and the volume
`biomaxnu_pgdata`, both project-scoped (Compose prefixes them with the
`biomaxnu` directory name) so they never collide with another
project's `db` service or `pgdata` volume.

Check it's healthy:

```bash
docker compose -f docker-compose.dev.yml ps        # STATUS should be healthy
pg_isready -h localhost -p 5433                     # "accepting connections"
```

If host port 5433 is already taken (`Bind for 0.0.0.0:5433 failed`),
something else is using it — find it and stop that, or change the host
side of the mapping in `docker-compose.dev.yml` (e.g. `"5434:5432"`)
**and** update `DATABASE_URL`'s port in `.env.local` to match:

```bash
lsof -iTCP:5433 -sTCP:LISTEN          # what's holding the port
docker ps --filter publish=5433       # if it's another container
```

### 5. Apply schema + generate the Prisma client

```bash
npx prisma migrate deploy   # apply existing migrations to the dev DB
npm run prisma:generate     # generate the typed client
```

For a clean slate (drops and recreates the dev DB):

```bash
npm run db:reset
```

### 6. Seed data (optional but recommended)

The catalog/content pages 404 on an empty DB. Import the WordPress
export to get real products, categories and content:

```bash
npm run db:import-wp        # imports the biomax.WordPress.*.xml at repo root
```

Grant yourself admin (after you've registered a user via the app, or to
pre-create one — see the script for usage):

```bash
npm run make-admin -- <your-email>
```

### 7. Run the dev server

```bash
npm run dev                 # http://localhost:3000
```

## Everyday commands

| Task | Command |
|---|---|
| Dev server | `npm run dev` |
| Type-check | `npx tsc --noEmit` |
| Lint | `npm run lint` |
| Unit tests | `npm test` |
| Integration tests (needs the Docker DB up) | `npm run test:integration` |
| Production build | `npm run build` |
| New migration (see caveat below) | `npm run prisma:migrate` |
| Reset dev DB | `npm run db:reset` |
| Stop the DB | `docker compose -f docker-compose.dev.yml down` |

## Important: migrations require a dev-server restart

`prisma migrate dev` / `prisma generate` regenerate the Prisma client,
but Turbopack caches the **old** client class for the life of the dev
process. A running `next dev` keeps rejecting newly-added fields
(`PrismaClientValidationError: Unknown argument 'X'`) even after a
successful migration.

Always:

1. **Stop** `next dev` (Ctrl-C).
2. Run `npm run prisma:migrate -- --name <change>` (or
   `npm run prisma:generate` if only the client needs regenerating).
3. **Restart** `npm run dev`.

If you hit `Unknown argument 'X'` and the field exists in
`schema.prisma` with `tsc` clean — the fix is always "restart the dev
server", never "patch around it". (See `AGENTS.md`.)

## Troubleshooting

- **`BETTER_AUTH_SECRET is not set`** — set it in `.env.local`
  (step 2). The app fails closed at runtime by design.
- **Prisma `ECONNREFUSED` at `localhost:5433`** — the DB isn't up
  (step 4) or the Docker context points at the wrong Colima profile
  (step 3).
- **`Cannot connect to the Docker daemon`** — wrong/!running Colima
  profile; `docker context use colima-biomax` then `docker ps`
  (step 3).
- **`Bind for 0.0.0.0:5433 failed`** — another Postgres/container owns
  the port; see the port-conflict note in step 4.
- **`Unknown argument 'X'`** after a migration — restart `next dev`
  (see above).
- **404 on `/produkter`, product or knowledge pages** — empty DB; run
  the seed import (step 6).

## Production / deployment

The app is deployed on the Ampliosoft self-hosted platform (Docker
Compose + Traefik + PostgreSQL). The authoritative deployment reference
— runtime env table, migration/seed commands, health check, graceful
shutdown, resource sizing — is **[`docs/deployment.md`](docs/deployment.md)**.

- **Runtime:** Node.js 22, Next.js 16 standalone output.
- **Database:** PostgreSQL 17 or 18.
- **Image:** `docker/biomax/web/Dockerfile` (multi-stage, non-root).
- **Health:** `GET /api/health` → `200 {"status":"ok"}` (no auth/DB).

### Build args

`next build` reads these at module load; pass harmless **placeholders**
at build time (real values are injected at runtime, never baked in):

| Build ARG | Placeholder |
|---|---|
| `BETTER_AUTH_SECRET` | `build-placeholder` |
| `BETTER_AUTH_URL` | `https://biomax.nu` |
| `DATABASE_URL` | `postgresql://x:x@build.invalid:5432/biomax` |
| `NEXT_PUBLIC_APP_URL` | `https://biomax.nu` |

Full local stack (app + Postgres + migrate) on a fresh clone:

```bash
docker compose -f docker-compose.dev.yml up --build
```
