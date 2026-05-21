import { prisma } from "@/lib/prisma";
import { open } from "@/lib/security/secret-box";

/**
 * Per-tenant payment credential resolution (ADR 0034).
 *
 * THE single module that reads `TenantPaymentCredential`. That table is
 * deliberately *outside* the ADR 0032 tenant data-access seam (ADR 0034
 * D2 — it is the bootstrap config the webhook resolves the tenant
 * *from*, so it cannot be tenant-RLS gated). The seam discipline is
 * kept here by convention: nothing else imports
 * `prisma.tenantPaymentCredential`.
 *
 * Resolution (ADR 0034 D4): a stored row for the tenant → unseal + use;
 * otherwise fall back to the env globals (tenant zero / single-tenant
 * unchanged, byte-for-byte). `configured === false` ⇒ stub mode,
 * preserving the ADR 0009 `isKlarnaConfigured()` contract.
 */

export type ResolvedPaymentCredentials = {
  /** Kustom API key id / legacy Klarna username. */
  apiKeyId: string;
  /** Kustom API password / legacy Klarna password (plaintext, in-mem). */
  apiSecret: string;
  /** Resolved API host (footgun-guarded for the env path). */
  baseUrl: string;
  /** Push-webhook token, or null when none is configured. */
  webhookSecret: string | null;
  /** Real (creds present) vs stub. The ADR 0009 boundary. */
  configured: boolean;
};

/**
 * Env-derived credentials — the existing single-tenant logic, factored
 * out of `lib/klarna/client.ts` unchanged. KUSTOM_* takes precedence
 * over legacy KLARNA_*; the ADR 0020 footgun guard (a klarna.com host
 * cannot run Kustom Shipping Assistant) is preserved and stays
 * *env-path only*, lazily thrown via the `baseUrl` getter so stub mode
 * never trips it.
 */
export function envCredentials(): ResolvedPaymentCredentials {
  const apiKeyId =
    process.env.KUSTOM_API_KEY_ID ?? process.env.KLARNA_USERNAME ?? "";
  const apiSecret =
    process.env.KUSTOM_API_PASSWORD ?? process.env.KLARNA_PASSWORD ?? "";
  const webhookSecret = process.env.KLARNA_WEBHOOK_SECRET || null;
  const configured = Boolean(apiKeyId && apiSecret);

  return {
    apiKeyId,
    apiSecret,
    webhookSecret,
    configured,
    get baseUrl(): string {
      return resolveEnvBaseUrl();
    },
  } as ResolvedPaymentCredentials;
}

/**
 * The original `resolveBaseUrl()` footgun guard (ADR 0020), verbatim
 * behaviour. Kept here so the env path is unchanged; the DB path trusts
 * the onboarded `baseUrl` (validated at onboarding, a later slice).
 */
function resolveEnvBaseUrl(): string {
  const usingKustom = Boolean(process.env.KUSTOM_API_KEY_ID);
  if (usingKustom) {
    const url = process.env.KUSTOM_API_URL;
    if (!url) {
      throw new Error(
        "KUSTOM_API_KEY_ID is set but KUSTOM_API_URL is not. Set it to " +
          "the Kustom host (playground: https://api.playground.kustom.co, " +
          "production: https://api.kustom.co) — the Klarna host does not " +
          "run Kustom Shipping Assistant."
      );
    }
    if (/klarna\.com/i.test(url)) {
      throw new Error(
        `KUSTOM_API_URL points at a Klarna host (${url}). Kustom ` +
          "Shipping Assistant only runs on api(.playground).kustom.co."
      );
    }
    return url;
  }
  return process.env.KLARNA_API_URL ?? "https://api.playground.klarna.com";
}

/**
 * Resolve the credentials the given tenant should transact with.
 * `null`/absent tenant or no stored row → env fallback (ADR 0034 D4).
 */
export async function resolvePaymentCredentialsForTenant(
  tenantId: string | null | undefined
): Promise<ResolvedPaymentCredentials> {
  if (!tenantId) return envCredentials();

  // ADR 0034 D2: TenantPaymentCredential is the dispatch table that the
  // webhook resolves the tenant FROM, so it is deliberately read OUTSIDE
  // the ADR 0032 tenant seam. Bootstrap argument — see file header.
  // eslint-disable-next-line no-restricted-syntax
  const row = await prisma.tenantPaymentCredential.findUnique({
    where: { tenantId },
  });
  if (!row) return envCredentials();

  return {
    apiKeyId: row.apiKeyId,
    apiSecret: open(row.apiSecretEnc),
    baseUrl: row.baseUrl,
    webhookSecret: row.webhookSecretEnc ? open(row.webhookSecretEnc) : null,
    configured: Boolean(row.apiKeyId && row.apiSecretEnc),
  };
}

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Webhook bootstrap signal (ADR 0034 D5, step 2): match a push
 * `?token=` against per-tenant `webhookSecretEnc`. Needs no Host and
 * no prior Kustom API call. Linear scan + unseal is acceptable at
 * Kine's scale (hundreds–low-thousands of tenants); revisit if that
 * assumption changes. Returns the resolved credentials + tenantId, or
 * null when no per-tenant token matches (caller falls back to env /
 * tenant zero — single-tenant unchanged).
 */
export async function resolveTenantByWebhookToken(
  token: string
): Promise<{ tenantId: string; creds: ResolvedPaymentCredentials } | null> {
  if (!token) return null;
  // ADR 0034 D2: dispatch read — see file header.
  // eslint-disable-next-line no-restricted-syntax
  const rows = await prisma.tenantPaymentCredential.findMany({
    where: { webhookSecretEnc: { not: null } },
  });
  for (const row of rows) {
    let secret: string;
    try {
      secret = open(row.webhookSecretEnc as string);
    } catch {
      // A row sealed with a KEK we no longer hold must not abort
      // resolution for every tenant — skip it.
      continue;
    }
    if (constantTimeEquals(secret, token)) {
      return {
        tenantId: row.tenantId,
        creds: {
          apiKeyId: row.apiKeyId,
          apiSecret: open(row.apiSecretEnc),
          baseUrl: row.baseUrl,
          webhookSecret: secret,
          configured: Boolean(row.apiKeyId && row.apiSecretEnc),
        },
      };
    }
  }
  return null;
}
