"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./guard";
import type { OrderStatus } from "@prisma/client";

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["PAID", "CANCELLED"],
  PAID: ["FULFILLED", "CANCELLED", "REFUNDED"],
  FULFILLED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export async function updateOrderStatus(
  orderNumber: string,
  next: OrderStatus
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: { id: true, status: true },
  });
  if (!order) return { ok: false, error: "Order hittades inte." };

  const allowed = VALID_TRANSITIONS[order.status];
  if (!allowed.includes(next)) {
    return {
      ok: false,
      error: `Kan inte gå från ${order.status} till ${next}.`,
    };
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { status: next },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/ordrar");
  revalidatePath(`/admin/ordrar/${orderNumber}`);
  // Phase 7: trigger shipping-notification email when next === FULFILLED
  return { ok: true };
}
