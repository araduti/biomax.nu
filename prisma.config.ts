import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load env files in Next.js precedence order (.env first, .env.local last/highest)
config({ path: ".env" });
config({ path: ".env.local", override: true });

// Two-role DB (Ampliosoft platform §A6): the Prisma CLI (migrate deploy /
// migrate dev) needs DDL + RLS-bypass, so it uses the `*_migrate` role via
// DATABASE_MIGRATE_URL when present. The running app (lib/prisma.ts) only
// ever uses DATABASE_URL (the DML-only `*_app` role). Locally only
// DATABASE_URL is set, so migrations fall back to it transparently.
const migrateUrl =
  process.env.DATABASE_MIGRATE_URL ?? process.env.DATABASE_URL;

if (!migrateUrl) {
  throw new Error(
    "Prisma CLI: set DATABASE_MIGRATE_URL (preferred) or DATABASE_URL."
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: migrateUrl,
  },
});
