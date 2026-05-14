"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./guard";
import { audit } from "./audit";
import { cuidSchema, fail } from "@/lib/validation/shared";
import { bookShipment } from "@/lib/postnord/booking";

const FALLBACK_WEIGHT_GRAMS = 100;

const BookShipmentSchema = z.object({ orderId: cuidSchema });

const FulfillSchema = z.object({ orderId: cuidSchema });

export type ShipmentActionResult =
  | { ok: true; trackingNumber: string; labelPdfUrl: string | null }
  | { ok: false; error: string };

/**
 * Admin "Boka frakt"-action: takes a PAID order, asks PostNord (or the
 * stub) to create a shipment, persists the resulting tracking number +
 * label URL onto the Order row. Idempotent — re-booking returns the
 * same stub id, and once real PostNord is wired we'll guard against
 * double-booking inside `bookShipment`.
 *
 * Does NOT flip status to FULFILLED — that's a separate admin action
 * once the package is physically in PostNord's hands. The tracking
 * link goes live on /spara as soon as the number is on the row.
 */
export async function bookOrderShipment(
  raw: unknown
): Promise<ShipmentActionResult> {
  const admin = await requireAdmin();
  const parsed = BookShipmentSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error);

  const order = await prisma.order.findUnique({
    where: { id: parsed.data.orderId },
    include: {
      items: {
        include: {
          product: { select: { weight: true } },
        },
      },
      shippingAddress: true,
    },
  });
  if (!order) return { ok: false, error: "Ordern hittades inte." };
  if (!order.shippingAddress) {
    return { ok: false, error: "Ingen leveransadress på ordern." };
  }
  if (order.status !== "PAID") {
    return {
      ok: false,
      error: "Endast PAID-ordrar kan bokas. Kontrollera betalningsstatus.",
    };
  }

  // Weight: sum product weights × quantity (grams). Missing weights
  // fall back to FALLBACK_WEIGHT_GRAMS so PostNord doesn't reject the
  // booking. Bookkeeping concern only; PostNord re-weighs the parcel
  // on intake.
  const weightGrams = order.items.reduce((sum, it) => {
    const productGrams = it.product?.weight
      ? Math.round(parseFloat(it.product.weight.toString()) * 1000)
      : FALLBACK_WEIGHT_GRAMS;
    return sum + productGrams * it.quantity;
  }, 0);

  const result = await bookShipment({
    orderId: order.id,
    orderNumber: order.orderNumber,
    shippingAddress: {
      fullName: order.shippingAddress.fullName,
      street: order.shippingAddress.street,
      postalCode: order.shippingAddress.postalCode,
      city: order.shippingAddress.city,
      countryCode: order.shippingAddress.countryCode,
      phone: order.shippingAddress.phone,
      email: order.email,
    },
    servicePointId: order.servicePointId,
    weightGrams,
  });
  if (!result.ok) return result;

  await prisma.order.update({
    where: { id: order.id },
    data: {
      trackingNumber: result.trackingNumber,
      labelPdfUrl: result.labelPdfUrl,
      carrier: result.carrier,
    },
  });

  await audit({
    actorId: admin.id,
    action: "order.book-shipment",
    entityType: "Order",
    entityId: order.id,
    diff: {
      orderNumber: order.orderNumber,
      trackingNumber: result.trackingNumber,
      stub: result.stub,
    },
  });

  revalidatePath(`/admin/ordrar/${order.orderNumber}`);
  return {
    ok: true,
    trackingNumber: result.trackingNumber,
    labelPdfUrl: result.labelPdfUrl,
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
    select: { id: true, orderNumber: true, status: true },
  });
  if (!order) return { ok: false, error: "Ordern hittades inte." };
  if (order.status !== "PAID") {
    return {
      ok: false,
      error: "Endast PAID-ordrar kan markeras som skickade.",
    };
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
    diff: { orderNumber: order.orderNumber, fromStatus: "PAID" },
  });

  revalidatePath(`/admin/ordrar/${order.orderNumber}`);
  return { ok: true };
}
