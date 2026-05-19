/**
 * Idempotent per-tenant payment-credential seed (ADR 0034 D4/D6).
 *
 * Tenant zero (biomax) is seeded from the existing KUSTOM_/KLARNA_ env
 * so resolution via the store yields exactly today's credentials —
 * env stays the source of truth for biomax until real per-tenant
 * onboarding exists (mirrors the APP_DATABASE_URL-fallback
 * philosophy). Secrets are sealed before write (lib/security/secret-box
 * — never plaintext in DB or git).
 *
 * When env has no creds the row is intentionally NOT created, so
 * `isKlarnaConfigured()` stays false and stub mode is preserved (the
 * ADR 0009 contract). Safe to run on every deploy; called from
 * `prisma/seeds/index.ts` after `seedTenants()`, runnable standalone:
 *   tsx prisma/seeds/payment-credentials.ts
 */
import { prisma } from "../../lib/prisma";
import { seal, ENC_VERSION } from "../../lib/security/secret-box";

export async function seedPaymentCredentials(): Promise<void> {
  const apiKeyId =
    process.env.KUSTOM_API_KEY_ID || process.env.KLARNA_USERNAME || "";
  const apiSecret =
    process.env.KUSTOM_API_PASSWORD || process.env.KLARNA_PASSWORD || "";

  if (!apiKeyId || !apiSecret) {
    console.log(
      "[seed] no KUSTOM_/KLARNA_ creds in env — skipping payment-credential " +
        "seed (biomax stays env-fallback / stub; ADR 0034 D4)."
    );
    return;
  }

  const baseUrl = process.env.KUSTOM_API_KEY_ID
    ? process.env.KUSTOM_API_URL ?? "https://api.playground.kustom.co"
    : process.env.KLARNA_API_URL ?? "https://api.playground.klarna.com";
  const webhookSecret = process.env.KLARNA_WEBHOOK_SECRET || null;
  const mode: "TEST" | "LIVE" = /playground/i.test(baseUrl)
    ? "TEST"
    : "LIVE";

  const biomax = await prisma.tenant.findUnique({
    where: { slug: "biomax" },
    select: { id: true },
  });
  if (!biomax) {
    console.warn(
      "[seed] biomax tenant missing — run seedTenants first; skipping."
    );
    return;
  }

  const data = {
    provider: "KLARNA" as const,
    apiKeyId,
    apiSecretEnc: seal(apiSecret),
    webhookSecretEnc: webhookSecret ? seal(webhookSecret) : null,
    baseUrl,
    mode,
    encVersion: ENC_VERSION,
  };

  await prisma.tenantPaymentCredential.upsert({
    where: { tenantId: biomax.id },
    // Re-seal on every run so a rotated env secret / KEK propagates;
    // ciphertext differs each run (random IV) but that is harmless.
    update: data,
    create: { tenantId: biomax.id, ...data },
  });

  console.log(
    `[seed] biomax payment credential ensured (mode=${mode}, ` +
      `webhook=${webhookSecret ? "set" : "none"}).`
  );
}

// Standalone entrypoint (tsx prisma/seeds/payment-credentials.ts)
if (
  process.argv[1] &&
  process.argv[1].endsWith("payment-credentials.ts")
) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dotenv = require("dotenv");
    dotenv.config({ path: ".env" });
    dotenv.config({ path: ".env.local", override: true });
  } catch {
    /* containers inject env; no dotenv is fine */
  }
  seedPaymentCredentials()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[seed] payment credentials failed:", err);
      process.exit(1);
    });
}
