import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Prisma Client singleton for server components and server actions.
 *
 * In dev with HMR we cache on `globalThis` to prevent connection-pool
 * exhaustion across re-evaluations.
 *
 * **Self-healing on `prisma generate`**: after a migration, `prisma generate`
 * rewrites the runtime client at `node_modules/.prisma/client/`. Turbopack
 * doesn't watch `node_modules`, so a cached instance keeps pointing at the
 * *old* generated class — missing new model accessors and crashing with
 * "Cannot read properties of undefined (reading 'findMany')".
 *
 * To recover automatically without a manual dev-server restart, we expose
 * `prisma` as a thin `Proxy` that, on every access, checks the generated
 * client's mtime and rebuilds the instance whenever it changes. The mtime
 * stat is throttled to once per second so the per-query cost stays
 * negligible. In prod (where the build is immutable) this branch never
 * fires.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaGeneratedAt: number | undefined;
  prismaLastCheckedAt: number | undefined;
};

const GENERATED_CLIENT_PATH = join(
  process.cwd(),
  "node_modules",
  ".prisma",
  "client",
  "index.js"
);

const STAT_THROTTLE_MS = 1000;

function generatedClientMtime(): number {
  try {
    if (!existsSync(GENERATED_CLIENT_PATH)) return 0;
    return statSync(GENERATED_CLIENT_PATH).mtimeMs;
  } catch {
    return 0;
  }
}

function createClient(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Check .env.local or your runtime env."
    );
  }
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const isDev = process.env.NODE_ENV !== "production";

function ensureLive(): PrismaClient {
  if (!isDev) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createClient();
    }
    return globalForPrisma.prisma;
  }

  // Throttle the mtime stat so a request that touches the prisma proxy
  // 50 times only costs us one stat call per second.
  const now = Date.now();
  const since = globalForPrisma.prismaLastCheckedAt ?? 0;
  if (
    !globalForPrisma.prisma ||
    now - since > STAT_THROTTLE_MS
  ) {
    const ts = generatedClientMtime();
    if (
      !globalForPrisma.prisma ||
      globalForPrisma.prismaGeneratedAt !== ts
    ) {
      // Best-effort cleanup of the stale instance before replacing.
      globalForPrisma.prisma?.$disconnect().catch(() => {});
      globalForPrisma.prisma = createClient();
      globalForPrisma.prismaGeneratedAt = ts;
    }
    globalForPrisma.prismaLastCheckedAt = now;
  }
  return globalForPrisma.prisma!;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop) {
    const live = ensureLive();
    const value = (live as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? value.bind(live) : value;
  },
  has(_, prop) {
    return prop in ensureLive();
  },
});
