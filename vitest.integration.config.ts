import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://biomax:biomax@localhost:5433/biomax_test";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.integration.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
    // Shared Postgres instance — run files serially so concurrency tests
    // own their rows and truncation between files can't race.
    fileParallelism: false,
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 20_000,
    hookTimeout: 30_000,
    setupFiles: ["./test/integration/setup.ts"],
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      // Pin the prisma singleton path (no mtime-proxy churn in tests).
      NODE_ENV: "production",
    },
  },
});
