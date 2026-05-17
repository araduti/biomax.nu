# biomax.nu — production web image (Ampliosoft platform §A3/§A4).
#
# Build context = repo root:
#   docker build -f docker/biomax/web/Dockerfile -t biomax-web .
#
# Stages: deps → builder → runner.
# The one-shot migrate container builds the `builder` target (it has the
# full toolchain: prisma CLI, tsx, schema, migrations, seeds).
# The long-running app uses `runner` (minimal, non-root, standalone).

# ---- deps: production node_modules only (cached layer) ----------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- builder: full deps, prisma generate, next build ------------------
FROM node:22-alpine AS builder
WORKDIR /app

# Next.js + Better Auth read these at module-load during `next build`.
# Pass harmless placeholders at build time; REAL values are injected at
# runtime via Compose `environment:` and are NOT baked into the image.
ARG BETTER_AUTH_SECRET=build-placeholder
ARG BETTER_AUTH_URL=https://biomax.nu
ARG DATABASE_URL=postgresql://x:x@build.invalid:5432/biomax
ARG NEXT_PUBLIC_APP_URL=https://biomax.nu
ENV BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET \
    BETTER_AUTH_URL=$BETTER_AUTH_URL \
    DATABASE_URL=$DATABASE_URL \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- runner: minimal, non-root, standalone server ---------------------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Standalone output + static assets + public dir. Prisma schema/migrations
# are NOT needed by the running app (migrations run from the `builder`
# target in the one-shot migrate container).
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# No HEALTHCHECK here on purpose — Traefik + Compose own liveness
# (GET /api/health). Next.js standalone handles SIGTERM (drains HTTP,
# closes the pg pool) within the platform's 30s grace window.
CMD ["node", "server.js"]
