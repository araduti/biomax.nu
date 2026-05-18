import type { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { existsSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { join, sep } from "node:path";

/**
 * Prisma Client singleton for server components and server actions.
 *
 * In dev with HMR we cache on `globalThis` to prevent connection-pool
 * exhaustion across re-evaluations.
 *
 * **Self-healing on `prisma generate`** (Prisma 7):
 *
 * `prisma generate` rewrites the *generated* client at
 * `node_modules/.prisma/client/` — `index.js` (the ~320 KB codegen module
 * carrying the model accessors and the argument-validation schema) plus the
 * wasm query compiler. The `node_modules/@prisma/client` package is only a
 * static re-export shim of `.prisma/client`; its own files keep their
 * install-time mtime forever. So `.prisma/client/index.js` is the correct —
 * and only — file to stat for "the client was regenerated".
 *
 * Detecting regeneration is necessary but not sufficient. A plain
 * `import { PrismaClient } from "@prisma/client"` is resolved once and the
 * class is pinned in the module cache for the life of the dev process.
 * Re-`new`-ing that cached class yields a fresh instance of the *stale*
 * class, so newly added fields still fail validation with
 * `Unknown argument 'X'`. Rebuilding the instance alone never recovers.
 *
 * To actually self-heal without a dev-server restart we (a) throttle-stat
 * `.prisma/client/index.js`'s mtime, and on change (b) evict the regenerated
 * codegen from the CJS `require` cache and re-`require` `@prisma/client` to
 * obtain a *new* `PrismaClient` class, then (c) instantiate from it. We only
 * evict the generated files (`.prisma/client/*` and the thin
 * `@prisma/client` re-export shim) and deliberately keep
 * `@prisma/client/runtime/*` cached — that runtime is generic, unchanged by
 * `generate`, and multi-MB + wasm, so re-parsing it every migration would be
 * needlessly slow. In prod (immutable build) none of this branch runs.
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

// A real Node CJS require (Next externalizes @prisma/client), so this shares
// the runtime's require.cache and resolves the on-disk node_modules copy.
const nodeRequire = createRequire(join(process.cwd(), "noop.cjs"));

const GENERATED_DIR = `${sep}.prisma${sep}client${sep}`;
const SHIM_DIR = `${sep}@prisma${sep}client${sep}`;
const RUNTIME_DIR = `${sep}runtime${sep}`;

function generatedClientMtime(): number {
  try {
    if (!existsSync(GENERATED_CLIENT_PATH)) return 0;
    return statSync(GENERATED_CLIENT_PATH).mtimeMs;
  } catch {
    return 0;
  }
}

function loadPrismaClientClass(): typeof PrismaClient {
  // Drop the regenerated codegen + its re-export shim from the CJS cache so
  // the next require rebuilds the class from the freshly generated source.
  // Keep @prisma/client/runtime/* (generic, unchanged, heavy) cached.
  for (const key of Object.keys(nodeRequire.cache)) {
    if (key.includes(RUNTIME_DIR)) continue;
    if (key.includes(GENERATED_DIR) || key.includes(SHIM_DIR)) {
      delete nodeRequire.cache[key];
    }
  }
  return (nodeRequire("@prisma/client") as { PrismaClient: typeof PrismaClient })
    .PrismaClient;
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
  const PrismaClientCtor = loadPrismaClientClass();
  return new PrismaClientCtor({
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
  if (!globalForPrisma.prisma || now - since > STAT_THROTTLE_MS) {
    const ts = generatedClientMtime();
    if (!globalForPrisma.prisma || globalForPrisma.prismaGeneratedAt !== ts) {
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
