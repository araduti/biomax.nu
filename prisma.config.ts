import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Load env files in Next.js precedence order (.env first, .env.local last/highest)
config({ path: ".env" });
config({ path: ".env.local", override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
