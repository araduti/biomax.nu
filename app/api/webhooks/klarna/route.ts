import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  acknowledgeKlarnaOrder,
  getKlarnaOrder,
  isKlarnaConfigured,
} from "@/lib/klarna/client";

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
    console.log(
      "[klarna-webhook] received push in stub mode — no-op",
      request.url
    );
    return NextResponse.json({ ok: true, mode: "stub" });
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
    if (klarnaOrder.status !== "checkout_complete") {
      return NextResponse.json({
        ok: true,
        skipped: `Klarna status: ${klarnaOrder.status}`,
      });
    }

    // One-way transition: only PENDING → PAID. updateMany matching zero
    // rows is fine — that means either (a) the order row doesn't exist
    // yet (push raced ahead of the confirmation page) or (b) it's
    // already past PENDING and the short-circuit above already caught
    // it on the next retry.
    const result = await prisma.order.updateMany({
      where: { paymentReference: klarnaOrderId, status: "PENDING" },
      data: { status: "PAID" },
    });

    // Award Familjen Biomax points for the freshly-paid order. The earn
    // helper is idempotent (already-awarded → no-op) so retrying the
    // webhook can't double-credit. Looked up by paymentReference rather
    // than the updateMany result because Klarna may retry the webhook
    // for an order that was already PAID — we still want to credit if
    // somehow the previous attempt skipped it.
    if (result.count > 0) {
      const order = await prisma.order.findFirst({
        where: { paymentReference: klarnaOrderId },
        select: { id: true },
      });
      if (order) {
        try {
          const { awardOrderPoints } = await import("@/lib/loyalty/earn");
          await awardOrderPoints(order.id);
        } catch (err) {
          // Don't fail the webhook on loyalty issues — Klarna would
          // keep retrying and we'd lose the ACK. Log and move on.
          console.error("[klarna-webhook] loyalty award failed", err);
        }
      }
    }

    await acknowledgeKlarnaOrder(klarnaOrderId);

    return NextResponse.json({ ok: true, transitioned: result.count });
  } catch (err) {
    console.error("[klarna-webhook] failed", err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
