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

export async function seedPlatformAdmins(): Promise<void> {
  const email = process.env.SEED_PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) {
    console.log(
      "[seed] SEED_PLATFORM_ADMIN_EMAIL not set — skipping platform-admin seed."
    );
    return;
  }
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) {
    console.log(
      `[seed] platform-admin: user ${email} not found — skipping (register first).`
    );
    return;
  }
  await prisma.platformAdmin.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, platformRole: "SUPERADMIN" },
  });
  console.log(`[seed] platform-admin ensured: ${email} (SUPERADMIN)`);
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
