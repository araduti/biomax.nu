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

import { randomUUID } from "node:crypto";

const TENANTS = [
  {
    slug: "biomax",
    name: "Biomax",
    tagline: "Livskvalitet i fokus sedan 2001",
    primaryColorHex: "#1e3a5f",
  },
  {
    slug: "demo",
    name: "Demo Butik",
    tagline: "En andra hyresgäst — för att se Korg flerhyresgäst i dev",
    primaryColorHex: "#7A8B6F",
  },
] as const;

/**
 * Idempotent: ensures each tenant, its 1:1 Better Auth Organization
 * (ADR 0031 D2), the link, and — for biomax (tenant zero) — backfills
 * existing `role=admin` users as org `owner` members (ADR 0031 D5).
 */
export async function seedTenants(): Promise<void> {
  for (const t of TENANTS) {
    const tenant = await prisma.tenant.upsert({
      where: { slug: t.slug },
      update: {},
      create: t,
    });

    let orgId = tenant.organizationId;
    if (!orgId) {
      const org = await prisma.organization.upsert({
        where: { slug: t.slug },
        update: {},
        create: { id: randomUUID(), name: t.name, slug: t.slug },
      });
      orgId = org.id;
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { organizationId: orgId },
      });
    }

    if (t.slug === "biomax") {
      const admins = await prisma.user.findMany({
        where: { role: "admin" },
        select: { id: true },
      });
      for (const a of admins) {
        await prisma.member.upsert({
          where: {
            organizationId_userId: { organizationId: orgId, userId: a.id },
          },
          update: {},
          create: {
            id: randomUUID(),
            organizationId: orgId,
            userId: a.id,
            role: "owner",
          },
        });
      }
      if (admins.length) {
        console.log(
          `[seed] biomax org: ${admins.length} existing admin(s) → owner members`
        );
      }
    }
  }
  console.log("[seed] tenants + orgs ensured: biomax (zero), demo");
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
