"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./guard";
import { audit } from "./audit";
import { cuidSchema, fail } from "@/lib/validation/shared";
import { fetchOrderLabel } from "@/lib/postnord/booking";
import { captureKlarnaOrder, isKlarnaConfigured } from "@/lib/klarna/client";

const LabelSchema = z.object({ orderId: cuidSchema });

const FulfillSchema = z.object({ orderId: cuidSchema });

export type ShipmentActionResult =
  | { ok: true; labelPdfUrl: string | null; stub: boolean }
  | { ok: false; error: string };

/**
 * ADR 0020 (TMS route): "Skriv ut fraktsedel". KSA/TMS already
 * pre-booked the shipment with PostNord at checkout, so we do NOT
 * create a consignment (that would double-book). We only retrieve the
 * fraktsedel PDF for the existing PostNord item id (= the KSA tracking
 * number) via PostNord's label-by-ids endpoint, and persist the URL.
 *
 * Idempotent: if the label URL is already on the order we return it
 * without re-calling PostNord. Manual retry/refresh from admin.
 */
export async function printOrderLabel(
  raw: unknown
): Promise<ShipmentActionResult> {
  const admin = await requireAdmin();
  const parsed = LabelSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error);

  const order = await prisma.order.findUnique({
    where: { id: parsed.data.orderId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      trackingNumber: true,
      labelPdfUrl: true,
    },
  });
  if (!order) return { ok: false, error: "Ordern hittades inte." };
  if (order.status !== "PAID" && order.status !== "FULFILLED") {
    return {
      ok: false,
      error: "Fraktsedel kan bara hämtas för betalda ordrar.",
    };
  }
  // Already have it — don't re-hit PostNord.
  if (order.labelPdfUrl) {
    return { ok: true, labelPdfUrl: order.labelPdfUrl, stub: false };
  }
  if (!order.trackingNumber) {
    return {
      ok: false,
      error: "Saknar PostNord-id (tracking) — ingen fraktsedel kan hämtas än.",
    };
  }

  const result = await fetchOrderLabel({
    orderNumber: order.orderNumber,
    trackingNumber: order.trackingNumber,
  });
  if (!result.ok) return result;

  if (result.labelPdfUrl) {
    await prisma.order.update({
      where: { id: order.id },
      data: { labelPdfUrl: result.labelPdfUrl },
    });
    await audit({
      actorId: admin.id,
      action: "order.print-label",
      entityType: "Order",
      entityId: order.id,
      diff: { orderNumber: order.orderNumber, stub: result.stub },
    });
    revalidatePath(`/admin/ordrar/${order.orderNumber}`);
  }
  return {
    ok: true,
    labelPdfUrl: result.labelPdfUrl,
    stub: result.stub,
  };
}

/**
 * "Markera som skickad" — flips order to FULFILLED. This is the step
 * the warehouse runs after handing the parcel to PostNord. Until then
 * the order can still be cancelled via self-service.
 */
export async function markFulfilled(
  raw: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  const parsed = FulfillSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error);

  const order = await prisma.order.findUnique({
    where: { id: parsed.data.orderId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentReference: true,
      totalAmount: true,
    },
  });
  if (!order) return { ok: false, error: "Ordern hittades inte." };
  if (order.status !== "PAID") {
    return {
      ok: false,
      error: "Endast PAID-ordrar kan markeras som skickade.",
    };
  }

  // ADR: capture-at-ship. The customer's payment is only *authorised*
  // until we capture it — capture happens exactly here, on the
  // PAID→FULFILLED transition. We capture BEFORE flipping status: if
  // the charge fails we must NOT mark the parcel shipped (that would
  // ship goods we never got paid for). Stub / non-Kustom orders
  // (no real payment reference) skip capture.
  const ref = order.paymentReference;
  const isRealKustom =
    Boolean(ref) && !ref!.startsWith("stub-") && isKlarnaConfigured();
  if (isRealKustom) {
    try {
      const capturedAmountOre = Math.round(
        parseFloat(order.totalAmount.toString()) * 100
      );
      await captureKlarnaOrder(ref!, capturedAmountOre);
    } catch (err) {
      console.error("[markFulfilled] capture failed", err);
      return {
        ok: false,
        error:
          err instanceof Error
            ? `Betalningen kunde inte debiteras — ordern markeras inte som skickad. ${err.message}`
            : "Betalningen kunde inte debiteras — ordern markeras inte som skickad.",
      };
    }
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { status: "FULFILLED" },
  });

  await audit({
    actorId: admin.id,
    action: "order.fulfill",
    entityType: "Order",
    entityId: order.id,
    diff: {
      orderNumber: order.orderNumber,
      fromStatus: "PAID",
      captured: isRealKustom,
    },
  });

  revalidatePath(`/admin/ordrar/${order.orderNumber}`);
  return { ok: true };
}
