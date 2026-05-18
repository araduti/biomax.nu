/**
 * Idempotent tenant seed (Korg slice 1 — ADR 0026 §0).
 *
 *   - `biomax`  — tenant zero. biomax.nu migrated onto the platform as
 *     customer #1; keeps its existing navy brand. Behaviour unchanged.
 *   - `demo`    — a second tenant so multi-tenancy is *visible* in dev
 *     (different name + colour at demo.localhost).
 *
 * Safe to run on every deploy. Called from `prisma/seeds/index.ts`
 * before the admin-seed env gate, and runnable standalone:
 *   tsx prisma/seeds/tenants.ts
 */
import { prisma } from "../../lib/prisma";

export async function seedTenants(): Promise<void> {
  await prisma.tenant.upsert({
    where: { slug: "biomax" },
    update: {},
    create: {
      slug: "biomax",
      name: "Biomax",
      tagline: "Livskvalitet i fokus sedan 2001",
      primaryColorHex: "#1e3a5f",
    },
  });
  await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      slug: "demo",
      name: "Demo Butik",
      tagline: "En andra hyresgäst — för att se Korg flerhyresgäst i dev",
      primaryColorHex: "#7A8B6F",
    },
  });
  console.log("[seed] tenants ensured: biomax (zero), demo");
}

// Standalone entrypoint (tsx prisma/seeds/tenants.ts)
if (process.argv[1] && process.argv[1].endsWith("tenants.ts")) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dotenv = require("dotenv");
    dotenv.config({ path: ".env" });
    dotenv.config({ path: ".env.local", override: true });
  } catch {
    /* containers inject env; no dotenv is fine */
  }
  seedTenants()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[seed] tenants failed:", err);
      process.exit(1);
    });
}
