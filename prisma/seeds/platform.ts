/**
 * Idempotent platform-admin seed (ADR 0031 D5).
 *
 * Platform authority is hand-picked, NEVER derived from User.role.
 * Designate via env: SEED_PLATFORM_ADMIN_EMAIL (must already be a
 * registered user). Unset or unknown user → logged no-op (safe on
 * every deploy). Defaults the role to SUPERADMIN for the bootstrap
 * operator; refine via the platform UI later.
 */
import { prisma } from "../../lib/prisma";

async function ensureSuperadmin(userId: string, email: string) {
  await prisma.platformAdmin.upsert({
    where: { userId },
    update: {},
    create: { userId, platformRole: "SUPERADMIN" },
  });
  console.log(`[seed] platform-admin ensured: ${email} (SUPERADMIN)`);
}

export async function seedPlatformAdmins(): Promise<void> {
  const envEmail = process.env.SEED_PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();

  // Env path: promote an EXISTING user (prod / explicit).
  if (envEmail) {
    const user = await prisma.user.findUnique({
      where: { email: envEmail },
      select: { id: true },
    });
    if (!user) {
      console.log(
        `[seed] platform-admin: user ${envEmail} not found — skipping.`
      );
      return;
    }
    await ensureSuperadmin(user.id, envEmail);
    return;
  }

  // Dev path: create a known platform admin so the dashboard is
  // loginnable. NEVER in production (would be a default-credential
  // hole). 2FA still mandatory (ADR 0031, Option A) — enrol on first
  // login via /platform/2fa.
  if (process.env.NODE_ENV === "production") {
    console.log(
      "[seed] no SEED_PLATFORM_ADMIN_EMAIL in production — skipping (set it explicitly)."
    );
    return;
  }
  const devEmail = "platform@korg.dev";
  const devPass = process.env.SEED_PLATFORM_ADMIN_PASSWORD ?? "KorgDev!2026";
  let user = await prisma.user.findUnique({
    where: { email: devEmail },
    select: { id: true },
  });
  if (!user) {
    const { platformAuth } = await import("../../lib/auth-platform");
    await platformAuth.api.signUpEmail({
      body: { email: devEmail, password: devPass, name: "Korg Platform" },
    });
    user = await prisma.user.findUnique({
      where: { email: devEmail },
      select: { id: true },
    });
    if (!user) {
      console.log("[seed] dev platform-admin: signup did not create user.");
      return;
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });
    console.log(
      `[seed] dev platform-admin created: ${devEmail} / ${devPass} (enrol 2FA on first login)`
    );
  }
  await ensureSuperadmin(user.id, devEmail);
}

if (process.argv[1] && process.argv[1].endsWith("platform.ts")) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dotenv = require("dotenv");
    dotenv.config({ path: ".env" });
    dotenv.config({ path: ".env.local", override: true });
  } catch {
    /* containers inject env */
  }
  seedPlatformAdmins()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[seed] platform-admin failed:", err);
      process.exit(1);
    });
}
