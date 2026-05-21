import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  acknowledgeKlarnaOrder,
  getKlarnaOrder,
  isKlarnaConfigured,
} from "@/lib/klarna/client";
import {
  envCredentials,
  resolveTenantByWebhookToken,
  type ResolvedPaymentCredentials,
} from "@/lib/klarna/credentials";
import { isKustomOrderComplete } from "@/lib/klarna/types";
import {
  enforceRateLimit,
  KLARNA_WEBHOOK_RULE,
} from "@/lib/security/rate-limit";

/**
 * Resolve the acting tenant for a Host-less Kustom push (ADR 0034 D5).
 *
 * Bootstrap signal: the push `?token=` is the per-tenant webhook
 * secret. Matching it against the credential store picks the tenant +
 * its credentials *before* any Kustom API call, with no Host. No match
 * → env / tenant-zero (single-tenant unchanged; covers the legacy
 * global KLARNA_WEBHOOK_SECRET and biomax pre-onboarding).
 *
 * `merchant_data.t` is the authoritative cross-check, but it is only
 * readable *after* getKlarnaOrder (which needs credentials) — so it is
 * validated downstream in ensureOrderFromKustomOrder, not here.
 */
async function resolveWebhookTenant(req: NextRequest): Promise<{
  tenantId: string | null;
  creds: ResolvedPaymentCredentials;
  /** Token matched a stored per-tenant secret → already authenticated. */
  tokenMatched: boolean;
}> {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const match = token ? await resolveTenantByWebhookToken(token) : null;
  if (match) {
    return { tenantId: match.tenantId, creds: match.creds, tokenMatched: true };
  }
  return { tenantId: null, creds: envCredentials(), tokenMatched: false };
}

/**
 * Authenticate the push caller against the *resolved* tenant's webhook
 * secret. Kustom/Klarna Checkout v3 push is unsigned; the documented
 * mitigation is a secret in the push URL. Constant-time compare to
 * dodge timing oracles. When no secret is configured we fall back to
 * localhost-only (dev) — same fail-closed pattern as the cron + Brevo
 * webhooks.
 */
function pushAuthorized(
  req: NextRequest,
  creds: ResolvedPaymentCredentials
): boolean {
  const expected = creds.webhookSecret;
  if (!expected) {
    const host = req.headers.get("host") ?? "";
    return host.startsWith("localhost") || host.startsWith("127.0.0.1");
  }
  const provided = new URL(req.url).searchParams.get("token") ?? "";
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Klarna server-to-server push notification handler.
 *
 * Klarna calls this URL after an order completes / changes state. We:
 *   1. Resolve the tenant + credentials (token → store; ADR 0034 D5)
 *   2. Verify the request is from Kustom (per-tenant webhook secret)
 *   3. Look up the Kustom order, cross-check the tenant marker
 *   4. Mark our local Order as PAID + acknowledge to Kustom
 *
 * Stub-mode pushes (no creds for the resolved tenant) are no-ops.
 *
 * Idempotency contract: Klarna may retry the same `klarna_order_id`
 * push if our response is slow or fails. We guard against:
 *   - Double-acknowledge: short-circuit when the matching order is
 *     already PAID or further along (FULFILLED, CANCELLED, REFUNDED).
 *   - State regression: a delayed Klarna push must not pull a
 *     FULFILLED order back to PAID. The `where: { status: "PENDING" }`
 *     clause makes the transition one-way at the DB level.
 *   - Push-before-order-row: if Klarna fires before the confirmation
 *     page creates the Order row, updateMany matches zero rows; the
 *     subsequent retry (or the confirmation page itself) will catch up.
 */
export async function POST(request: NextRequest) {
  const { tenantId, creds, tokenMatched } =
    await resolveWebhookTenant(request);

  if (!isKlarnaConfigured(creds)) {
    // Never log request.url — it may carry the webhook secret token.
    console.log("[klarna-webhook] received push in stub mode — no-op");
    return NextResponse.json({ ok: true, mode: "stub" });
  }

  if (!tokenMatched && !pushAuthorized(request, creds)) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  // Global ceiling so an unauthenticated flood (or a Klarna runaway)
  // can't hammer getKlarnaOrder + the order pipeline.
  const rl = await enforceRateLimit(KLARNA_WEBHOOK_RULE, "global");
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    );
  }

  const url = new URL(request.url);
  const klarnaOrderId = url.searchParams.get("klarna_order_id");
  if (!klarnaOrderId) {
    return NextResponse.json(
      { ok: false, error: "missing klarna_order_id" },
      { status: 400 }
    );
  }

  // Idempotency short-circuit: if the order has already moved past PENDING
  // (PAID, FULFILLED, CANCELLED, REFUNDED), this is a retry of a push we
  // already processed. Ack to stop Klarna's retries and return early.
  //
  // ADR 0034 D2 dispatch read: this lookup happens BEFORE the tenant is
  // resolved (the merchant_data marker is parsed AFTER this short-circuit).
  // The unscoped read is correct here — we need to find ANY tenant's order
  // matching the payment reference. Post-#3f strict RLS makes this lookup
  // return 0 rows under kine_app (no tenant GUC set), so the idempotency
  // shortcut becomes ineffective: duplicate webhooks fall through to the
  // resolve-tenant + process path. That path is itself idempotent via the
  // (tenantId, paymentReference) composite unique on Order, so behavior
  // stays correct — just a small efficiency loss on retries.
  //
  // Future cleanup: parse merchant_data first to get tenantId, then run
  // this lookup inside tenantScope(tenantId). Tracked as a follow-up to
  // ADR 0034 D2 webhook-dispatch refactor.
  // eslint-disable-next-line no-restricted-syntax
  const existing = await prisma.order.findFirst({
    where: { paymentReference: klarnaOrderId },
    select: { id: true, status: true },
  });
  if (existing && existing.status !== "PENDING") {
    console.log(
      `[klarna-webhook] ${klarnaOrderId} already in ${existing.status}, re-ack only`
    );
    try {
      await acknowledgeKlarnaOrder(klarnaOrderId, creds);
    } catch (err) {
      // Klarna's ack endpoint is documented as idempotent; log + swallow.
      console.warn("[klarna-webhook] redundant ack threw:", err);
    }
    return NextResponse.json({ ok: true, alreadyProcessed: existing.status });
  }

  try {
    const klarnaOrder = await getKlarnaOrder(klarnaOrderId, creds);
    if (!isKustomOrderComplete(klarnaOrder.status)) {
      return NextResponse.json({
        ok: true,
        skipped: `Kustom status: ${klarnaOrder.status}`,
      });
    }

    // Dual-path creation: whichever of the confirmation page or this
    // push lands first creates the Order; the other no-ops. Idempotent
    // via the unique `paymentReference` (= Kustom order_id). This also
    // covers the case where the customer closed the tab before the
    // confirmation redirect — the push still persists the order +
    // awards loyalty. The resolved tenant is passed for the
    // merchant_data cross-check (ADR 0034 D5); the RLS wrap of the
    // write itself is TODO(#7) inside ensureOrderFromKustomOrder.
    const { ensureOrderFromKustomOrder } = await import(
      "@/lib/checkout/order-actions"
    );
    const res = await ensureOrderFromKustomOrder(klarnaOrder, tenantId);
    if (!res.ok) {
      console.error("[klarna-webhook] ensureOrder failed:", res.error);
      return NextResponse.json(
        { ok: false, error: res.error },
        { status: 500 }
      );
    }

    await acknowledgeKlarnaOrder(klarnaOrderId, creds);

    return NextResponse.json({
      ok: true,
      orderNumber: res.orderNumber,
      created: res.created,
    });
  } catch (err) {
    console.error("[klarna-webhook] failed", err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
