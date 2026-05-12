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

  try {
    const klarnaOrder = await getKlarnaOrder(klarnaOrderId);
    if (klarnaOrder.status !== "checkout_complete") {
      return NextResponse.json({
        ok: true,
        skipped: `Klarna status: ${klarnaOrder.status}`,
      });
    }

    await prisma.order.updateMany({
      where: { paymentReference: klarnaOrderId },
      data: { status: "PAID" },
    });

    await acknowledgeKlarnaOrder(klarnaOrderId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[klarna-webhook] failed", err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
