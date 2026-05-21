"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { hostTenantScope } from "@/lib/tenant/db";
import { currentTenant } from "@/lib/tenant";
import type { Prisma } from "@prisma/client";
import { currentUser } from "@/lib/session";
import { cuidSchema, postalCodeSchema, fail } from "@/lib/validation/shared";

/**
 * Customer self-service operations on their own orders.
 *
 * Three actions:
 *   1. updateShippingAddress — change the delivery address while the
 *      order is still PAID (i.e. not yet picked / packed). FULFILLED
 *      orders are locked; the customer is told to contact us.
 *   2. cancelOrder — soft-cancel a PAID order, restoring stock. Same
 *      pre-FULFILLED window as #1.
 *   3. (Returns flow lives in lib/orders/return-actions.ts)
 *
 * Auth: viewer must own the order. We never expose an unauthenticated
 * mutation path here — the public tracking page is read-only.
 */

const OrderIdSchema = z.object({ orderId: cuidSchema });

const UpdateAddressSchema = z.object({
  orderId: cuidSchema,
  fullName: z.string().trim().min(1).max(200),
  street: z.string().trim().min(1).max(200),
  postalCode: postalCodeSchema,
  city: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(40).optional(),
});

const CancelOrderSchema = z.object({
  orderId: cuidSchema,
  reason: z.string().trim().max(240).optional(),
});

export type OrderActionResult = { ok: true } | { ok: false; error: string };

async function loadOwnedOrder(
  tx: Prisma.TransactionClient,
  orderId: string,
  userId: string
) {
  return tx.order.findFirst({
    where: { id: orderId, userId },
    include: { items: true, shippingAddress: true },
  });
}

/**
 * Update shipping address pre-fulfillment.
 *
 * Strategy: create a fresh Address row tied to the same userId and
 * point `Order.shippingAddressId` at it. Editing the existing Address
 * in place would also rewrite history for other orders sharing it.
 */
export async function updateShippingAddress(
  raw: unknown
): Promise<OrderActionResult> {
  const parsed = UpdateAddressSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error);
  const user = await currentUser();
  if (!user) return { ok: false, error: "Logga in först." };

  const { id: tenantId } = await currentTenant();
  try {
    const result = await hostTenantScope(async (tx) => {
      const order = await loadOwnedOrder(tx, parsed.data.orderId, user.id);
      if (!order) {
        return { ok: false as const, error: "Ordern hittades inte." };
      }
      if (order.status !== "PAID") {
        return {
          ok: false as const,
          error:
            "Adressen kan bara ändras innan paketet packats. Hör av dig till kontakt@biomax.nu så hjälper vi till.",
        };
      }
      const newAddress = await tx.address.create({
        data: {
          tenantId,
          userId: user.id,
          fullName: parsed.data.fullName,
          street: parsed.data.street,
          postalCode: parsed.data.postalCode,
          city: parsed.data.city,
          countryCode: "SE",
          phone: parsed.data.phone || null,
        },
      });
      await tx.order.update({
        where: { id: order.id },
        data: { shippingAddressId: newAddress.id },
      });
      return { ok: true as const, orderNumber: order.orderNumber };
    });
    if (result.ok) {
      revalidatePath(`/konto/ordrar/${result.orderNumber}`);
      return { ok: true };
    }
    return result;
  } catch (err) {
    console.error("updateShippingAddress failed:", err);
    return { ok: false, error: "Kunde inte uppdatera adressen." };
  }
}

/**
 * Cancel a PAID order. Restores stock per item (mirror of the
 * decrement performed at placeOrder) and flips the order status. No
 * Klarna refund call here — that's the admin-side button in
 * /admin/ordrar; the customer's cancellation just frees the inventory
 * so we don't pack something that won't ship.
 */
export async function cancelOrder(raw: unknown): Promise<OrderActionResult> {
  const parsed = CancelOrderSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error);
  const user = await currentUser();
  if (!user) return { ok: false, error: "Logga in först." };

  try {
    const result = await hostTenantScope(async (tx) => {
      const order = await loadOwnedOrder(tx, parsed.data.orderId, user.id);
      if (!order) {
        return { ok: false as const, error: "Ordern hittades inte." };
      }
      if (order.status !== "PAID") {
        return {
          ok: false as const,
          error:
            "Ordern kan inte längre avbrytas via självservice. Kontakta oss på kontakt@biomax.nu.",
        };
      }
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancellationReason: parsed.data.reason || null,
        },
      });
      // Restore stock on each line — symmetric with order placement.
      for (const item of order.items) {
        if (item.variantId) {
          await tx.productVariant.updateMany({
            where: { id: item.variantId, manageStock: true },
            data: { stock: { increment: item.quantity } },
          });
        } else if (item.productId) {
          await tx.product.updateMany({
            where: { id: item.productId, manageStock: true },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
      return { ok: true as const, orderNumber: order.orderNumber };
    });
    if (result.ok) {
      revalidatePath(`/konto/ordrar/${result.orderNumber}`);
      return { ok: true };
    }
    return result;
  } catch (err) {
    console.error("cancelOrder failed:", err);
    return { ok: false, error: "Kunde inte avbryta ordern." };
  }
}
