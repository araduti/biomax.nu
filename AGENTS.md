<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Prisma migrations no longer need a dev-server restart

`prisma migrate dev` / `prisma generate` rewrites the generated client at
`node_modules/.prisma/client/` (Prisma 7: `index.js` there is the real
codegen; `node_modules/@prisma/client` is only a static re-export shim whose
mtime never changes after install). Historically a running Turbopack dev
server kept rejecting newly-added fields with
`PrismaClientValidationError: Unknown argument 'X'` because the module cache
pinned the *old* `PrismaClient` class for the life of the process — a fresh
instance of a stale class.

`lib/prisma.ts` now self-heals: it throttle-stats `.prisma/client/index.js`'s
mtime and, on change, evicts the regenerated codegen from the CJS
`require` cache and re-`require`s `@prisma/client` to get a *new* class
before re-instantiating (the generic `@prisma/client/runtime/*` stays cached
so it isn't needlessly re-parsed). Verified end-to-end under Next 16 +
Turbopack: a continuously-running `next dev` picked up a brand-new model
immediately after `prisma migrate dev`, no restart.

Workflow: just run `npx prisma migrate dev --name <change>` (or
`npx prisma generate`) with the dev server running. The next request that
touches `prisma` rebuilds against the fresh client automatically. If you
*do* still see `Unknown argument 'X'`, confirm the regenerate actually
updated `node_modules/.prisma/client/index.js` (mtime bumped) — don't
"patch around" the validation error.
