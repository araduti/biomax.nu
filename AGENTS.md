<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Stop the dev server before running Prisma migrations

`prisma migrate dev` regenerates the Prisma Client at `node_modules/.prisma/client/`. Turbopack's ESM module cache holds the *old* `PrismaClient` class for the lifetime of the dev process — the validation table (`Available options are marked with ?`) is baked into that class at generation time, so a running server keeps rejecting newly-added fields even after a successful migration. The `lib/prisma.ts` mtime proxy creates fresh *instances*, but they're all instances of the cached stale class.

Workflow:
1. **Stop** `next dev` (Ctrl-C).
2. Run `npx prisma migrate dev --name <change>` (or `npx prisma generate` if only the schema changed without a migration).
3. **Restart** `next dev`.

Skipping the stop/restart causes runtime `PrismaClientValidationError: Unknown argument 'X'` even though `npx tsc --noEmit` is clean and the field exists in the regenerated client. If you hit that error, the fix is always "restart the dev server" — never "patch around it".
