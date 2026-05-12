# ADR 0002 — Deployment

**Date:** 2026-05-10  
**Status:** Accepted

## Context

The business runs its own Docker infrastructure. The deployment pipeline is owned externally (docker-compose in production is managed outside this repo). We need to provide a production-ready Docker image and a local development environment that matches production closely enough to catch issues early.

## Decision

### Production image

- Multi-stage Dockerfile using `output: "standalone"` in Next.js.
- Stage 1 (`deps`): install only production npm dependencies.
- Stage 2 (`builder`): run `prisma generate` and `next build`.
- Stage 3 (`runner`): copy only the standalone output, static assets, and prisma schema — no `node_modules` or source code.
- Base image: `node:22-alpine` across all stages for minimal attack surface.
- Non-root user `nextjs` in the runner stage.

### Local development

- `docker-compose.dev.yml` in this repo manages infrastructure services only: PostgreSQL.
- The Next.js app runs locally with `npm run dev` (not in Docker) per the official recommendation on Mac/Windows for better file-watch performance.
- `.env.local` (gitignored) holds local credentials; `.env.example` documents required variables.

### Environment variables

All runtime config is injected via environment variables. No secrets are baked into the image.

## Consequences

- The standalone output produces a self-contained `server.js` — no `npm install` at runtime.
- `sharp` must be available in the runner stage for Next.js Image Optimization (installed as a production dep).
- Prisma client is generated at build time; migrations must be run separately (via `prisma migrate deploy`) as an init container or pre-deploy step in the production compose file.
- The repo does **not** contain the production `docker-compose.yml` — that is infrastructure-team managed. We only ship `Dockerfile` and `docker-compose.dev.yml`.
