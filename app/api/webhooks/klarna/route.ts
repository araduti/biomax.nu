import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  acknowledgeKlarnaOrder,
  getKlarnaOrder,
  isKlarnaConfigured,
} from "@/lib/klarna/client";
import { isKustomOrderComplete } from "@/lib/klarna/types";
import {
  enforceRateLimit,
  KLARNA_WEBHOOK_RULE,
} from "@/lib/security/rate-limit";

/**
 * Authenticate the push caller. Kustom/Klarna Checkout v3 push is
 * unsigned; the documented mitigation is a secret in the push URL
 * (wired in lib/klarna/cart-to-order.ts). Constant-time compare to
 * dodge timing oracles. When the secret is unset we fall back to
 * localhost-only (dev) — same fail-closed pattern as the cron + Brevo
 * webhooks.
 */
function pushAuthorized(req: NextRequest): boolean {
  const expected = process.env.KLARNA_WEBHOOK_SECRET;
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
 *   1. Verify the request is from Klarna (signature TBD when creds arrive)
 *   2. Look up the Klarna order by ID
 *   3. Mark our local Order as PAID + acknowledge to Klarna
 *
 * Phase 3C scaffold: stub-mode pushes are no-ops. Real wiring lands when
 * KLARNA_USERNAME/KLARNA_PASSWORD are set.
 *
 * Idempotency contract: Klarna may retry the same `klarna_order_id` push
 * if our response is slow or fails. We guard against:
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
  if (!isKlarnaConfigured()) {
    // Never log request.url — it may carry the webhook secret token.
    console.log("[klarna-webhook] received push in stub mode — no-op");
    return NextResponse.json({ ok: true, mode: "stub" });
  }

  if (!pushAuthorized(request)) {
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
  const existing = await prisma.order.findFirst({
    where: { paymentReference: klarnaOrderId },
    select: { id: true, status: true },
  });
  if (existing && existing.status !== "PENDING") {
    console.log(
      `[klarna-webhook] ${klarnaOrderId} already in ${existing.status}, re-ack only`
    );
    try {
      await acknowledgeKlarnaOrder(klarnaOrderId);
    } catch (err) {
      // Klarna's ack endpoint is documented as idempotent; log + swallow.
      console.warn("[klarna-webhook] redundant ack threw:", err);
    }
    return NextResponse.json({ ok: true, alreadyProcessed: existing.status });
  }

  try {
    const klarnaOrder = await getKlarnaOrder(klarnaOrderId);
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
    // awards loyalty.
    const { ensureOrderFromKustomOrder } = await import(
      "@/lib/checkout/order-actions"
    );
    const res = await ensureOrderFromKustomOrder(klarnaOrder);
    if (!res.ok) {
      console.error("[klarna-webhook] ensureOrder failed:", res.error);
      return NextResponse.json(
        { ok: false, error: res.error },
        { status: 500 }
      );
    }

    await acknowledgeKlarnaOrder(klarnaOrderId);

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
