import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: [
      "node_modules/**",
      ".next/**",
      // Integration tests need a live Postgres — run via the dedicated
      // config (npm run test:integration), not the fast unit pass.
      "**/*.integration.test.ts",
    ],
  },
});
