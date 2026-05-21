/**
 * Idempotent bootstrap seeder (Ampliosoft platform §A6).
 *
 * Runs from the one-shot migrate container AFTER `prisma migrate deploy`:
 *
 *   npm run db:seed            # or: tsx prisma/seeds/index.ts
 *   tsx prisma/seeds/index.ts --force
 *
 * Behaviour:
 *   - Reads SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD from the environment.
 *   - If EITHER is unset → logs a single line and exits 0 (no-op). This
 *     is how you "disable" it after the first deploy: clear
 *     SEED_ADMIN_PASSWORD.
 *   - Idempotent: safe to run on every deploy.
 *       • user missing → created via Better Auth (password is hashed by
 *         Better Auth, so the account can sign in immediately) and
 *         promoted to role=admin.
 *       • user exists  → role is ensured = admin. The password is left
 *         alone UNLESS `--force` is passed, in which case it is reset
 *         through Better Auth's own hasher.
 *   - Connects via DATABASE_URL (the DML `*_app` role is sufficient —
 *     this only writes User/Account rows).
 *
 * Exit codes: 0 = success or intentional no-op; 1 = unexpected failure
 * (fails the deploy loudly rather than silently shipping no admin).
 */

// Local dev convenience only. In containers, env is injected by Compose
// and there is no .env file — so a missing dotenv must never throw.
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dotenv = require("dotenv");
  dotenv.config({ path: ".env" });
  dotenv.config({ path: ".env.local", override: true });
} catch {
  /* no dotenv / no env files — rely on real process.env (prod) */
}

async function main() {
  // Tenants must always exist (Kine) — independent of the admin gate.
  const { seedTenants } = await import("./tenants");
  await seedTenants();
  // Per-tenant payment credentials — env-seeded for tenant zero,
  // idempotent, skipped when env has no creds (ADR 0034 D4/D6).
  const { seedPaymentCredentials } = await import("./payment-credentials");
  await seedPaymentCredentials();
  // Platform admins — env-gated, idempotent (ADR 0031 D5).
  const { seedPlatformAdmins } = await import("./platform");
  await seedPlatformAdmins();

  const force = process.argv.includes("--force");
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    console.log(
      "[seed] SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — skipping admin seed."
    );
    return;
  }

  const { auth } = await import("../../lib/auth");
  const { prisma } = await import("../../lib/prisma");

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true },
  });

  if (!existing) {
    // Better Auth hashes the password and creates the linked Account
    // row, so the admin can sign in immediately after this runs.
    await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: email.split("@")[0],
      },
    });
    await prisma.user.update({
      where: { email },
      data: { role: "admin", emailVerified: true },
    });
    console.log(`[seed] created admin ${email}`);
    return;
  }

  // Exists → keep idempotent. Ensure the admin role regardless.
  if (existing.role !== "admin") {
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: "admin" },
    });
    console.log(`[seed] promoted existing user ${email} to admin`);
  } else {
    console.log(`[seed] admin ${email} already present`);
  }

  if (force) {
    // Reset the password through Better Auth's own hasher so the
    // result is sign-in compatible. $context is Better Auth's internal
    // surface; guard it so an upstream API change degrades to a clear
    // warning instead of breaking the deploy.
    try {
      const ctx = await auth.$context;
      const hash = await ctx.password.hash(password);
      await ctx.internalAdapter.updatePassword(existing.id, hash);
      console.log(`[seed] --force: reset password for ${email}`);
    } catch (err) {
      console.warn(
        `[seed] --force: could not reset password for ${email} ` +
          `(Better Auth internal API changed?) — ${
            err instanceof Error ? err.message : String(err)
          }`
      );
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[seed] failed:", err);
    process.exit(1);
  });
