import crypto from "node:crypto";

/**
 * Symmetric secret sealing for at-rest credentials (ADR 0034 D3).
 *
 * **Dev-grade, on the record.** AES-256-GCM with a KEK read from
 * `KINE_PAYMENT_KEK` (scrypt-stretched to 32 bytes). Production secret
 * storage — managed KMS / envelope encryption / rotation / access
 * audit — is owned by ADR 0029 and deferred. What this guarantees
 * *now*: no plaintext payment secret is ever written to the database
 * or to git.
 *
 * Stored format is **self-describing** so the decrypt path is chosen
 * by the value, not by config — a future re-key is a data migration,
 * not a code fork:
 *
 *   v1:<iv b64>:<authTag b64>:<ciphertext b64>
 *
 * `v1` == "dev AES-256-GCM, KEK from env" (mirrors
 * `TenantPaymentCredential.encVersion = 1`).
 */

const SCHEME = "v1";

let warnedFallback = false;

/**
 * Resolve + stretch the KEK. `KINE_PAYMENT_KEK` is preferred; dev/CI
 * fall back to `BETTER_AUTH_SECRET` (always present) with a single
 * loud warning so local work needs no new env wiring. A hard failure
 * here is correct in prod once ADR 0029 lands — until then the
 * fallback keeps the single-tenant build green.
 */
function kek(): Buffer {
  let material = process.env.KINE_PAYMENT_KEK;
  if (!material) {
    material = process.env.BETTER_AUTH_SECRET;
    if (material && !warnedFallback) {
      warnedFallback = true;
      console.warn(
        "[secret-box] KINE_PAYMENT_KEK unset — falling back to " +
          "BETTER_AUTH_SECRET (dev-grade, ADR 0034 D3 / ADR 0029). " +
          "Set KINE_PAYMENT_KEK before any real per-tenant onboarding."
      );
    }
  }
  if (!material) {
    throw new Error(
      "secret-box: neither KINE_PAYMENT_KEK nor BETTER_AUTH_SECRET is " +
        "set — cannot seal/open payment credentials."
    );
  }
  // Fixed salt: this is a single-key dev KEK, not per-secret key
  // derivation; rotation/per-secret keys are the ADR 0029 KMS job.
  return crypto.scryptSync(material, "kine-payment-kek-v1", 32);
}

/** Seal plaintext → `v1:iv:tag:ct` (base64 segments). */
export function seal(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", kek(), iv);
  const ct = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${SCHEME}:${iv.toString("base64")}:${tag.toString(
    "base64"
  )}:${ct.toString("base64")}`;
}

/** Open a sealed value produced by {@link seal}. Throws on tamper
 *  (GCM auth failure) or an unknown scheme. */
export function open(sealed: string): string {
  const parts = sealed.split(":");
  if (parts.length !== 4 || parts[0] !== SCHEME) {
    throw new Error(
      `secret-box: unrecognised sealed format (scheme "${parts[0]}").`
    );
  }
  const [, ivB64, tagB64, ctB64] = parts;
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    kek(),
    Buffer.from(ivB64, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ctB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/** `encVersion` written alongside sealed columns (ADR 0034 D3). */
export const ENC_VERSION = 1;
