"use server";

import { revalidatePath } from "next/cache";
import { requireTenantRole } from "./guard";
import { tenantScope } from "@/lib/tenant/db";
import type { OrderStatus } from "@prisma/client";
import { VALID_ORDER_TRANSITIONS } from "@/lib/orders/status";
import {
  cancelKlarnaOrder,
  refundKlarnaOrder,
  captureKlarnaOrder,
  getKustomOmOrder,
  isKlarnaConfigured,
} from "@/lib/klarna/client";

/** Shared real-Kustom guard for an order shape. */
function isRealKustomOrder(o: {
  paymentReference: string | null;
  paymentProvider: string;
}): boolean {
  return (
    o.paymentProvider === "KLARNA" &&
    Boolean(o.paymentReference) &&
    !o.paymentReference!.startsWith("stub-") &&
    isKlarnaConfigured()
  );
}

/**
 * Capture-at-ship for the *status-change* paths (the admin status
 * dropdown / bulk toolbar), mirroring what markFulfilled does for the
 * "Markera som skickad" button. Without this, moving an order to
 * FULFILLED via the dropdown would ship goods without taking the
 * money. Idempotent (captureKlarnaOrder no-ops if already captured);
 * throws on failure so the caller refuses the FULFILLED transition.
 */
async function captureKustomOnFulfill(order: {
  paymentReference: string | null;
  paymentProvider: string;
  totalAmount: { toString(): string };
}): Promise<void> {
  if (!isRealKustomOrder(order)) return;
  const amountOre = Math.round(
    parseFloat(order.totalAmount.toString()) * 100
  );
  await captureKlarnaOrder(order.paymentReference!, amountOre);
}

/**
 * Settle the money side at Kustom when an order moves to a terminal
 * CANCELLED/REFUNDED state. Decides cancel vs refund from the *actual*
 * Kustom capture state (not our status), so it's correct regardless of
 * whether capture-at-ship already ran:
 *   - captured  → refund the captured amount
 *   - authorised only → cancel (release the hold)
 * Non-Kustom / stub / no real reference → no-op success.
 * Throwing propagates so callers can refuse the DB status change
 * (never mark an order REFUNDED if the money wasn't returned).
 */
async function settleKustomTermination(order: {
  paymentReference: string | null;
  paymentProvider: string;
  totalAmount: { toString(): string };
}): Promise<void> {
  if (!isRealKustomOrder(order)) return;
  const ref = order.paymentReference;

  const om = await getKustomOmOrder(ref!);
  if (om.captured_amount > 0) {
    const amountOre = Math.round(
      parseFloat(order.totalAmount.toString()) * 100
    );
    await refundKlarnaOrder(ref!, amountOre);
  } else {
    await cancelKlarnaOrder(ref!);
  }
}

const VALID_TRANSITIONS = VALID_ORDER_TRANSITIONS;

export async function updateOrderStatus(
  orderNumber: string,
  next: OrderStatus
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { tenantId } = await requireTenantRole("admin");

  // Pre-read scope: load the order before any external IO (Kustom
  // settlement / capture). We deliberately do NOT hold a tx across the
  // network call to Kustom — that would pin a DB connection through a
  // potentially slow HTTP round-trip.
  const order = await tenantScope(tenantId, (tx) =>
    tx.order.findFirst({
      where: { orderNumber },
      select: {
        id: true,
        status: true,
        paymentReference: true,
        paymentProvider: true,
        totalAmount: true,
      },
    })
  );
  if (!order) return { ok: false, error: "Order hittades inte." };

  const allowed = VALID_TRANSITIONS[order.status];
  if (!allowed.includes(next)) {
    return {
      ok: false,
      error: `Kan inte gå från ${order.status} till ${next}.`,
    };
  }

  // Settle money at Kustom BEFORE the local status change. If the
  // cancel/refund fails we keep the order as-is so it can be retried —
  // never show CANCELLED/REFUNDED when the money wasn't released.
  if (next === "CANCELLED" || next === "REFUNDED") {
    try {
      await settleKustomTermination(order);
    } catch (err) {
      console.error("[admin order] Kustom settlement failed", err);
      return {
        ok: false,
        error:
          err instanceof Error
            ? `Kunde inte återbetala/annullera hos Kustom: ${err.message}`
            : "Kunde inte återbetala/annullera hos Kustom.",
      };
    }
  }
  // Capture-at-ship for the dropdown path too (not just the
  // "Markera som skickad" button) — otherwise FULFILLED-via-dropdown
  // ships goods without taking the money.
  if (next === "FULFILLED") {
    try {
      await captureKustomOnFulfill(order);
    } catch (err) {
      console.error("[admin order] Kustom capture failed", err);
      return {
        ok: false,
        error:
          err instanceof Error
            ? `Betalningen kunde inte debiteras — ordern markeras inte som skickad: ${err.message}`
            : "Betalningen kunde inte debiteras — ordern markeras inte som skickad.",
      };
    }
  }

  await tenantScope(tenantId, (tx) =>
    tx.order.update({
      where: { id: order.id },
      data: { status: next },
    })
  );

  // Familjen Biomax — reverse earned points on cancel/refund. Helper is
  // idempotent (`already-reversed` → no-op) so admins flipping the same
  // order CANCELLED → REFUNDED (allowed transition? not currently, but
  // defensive) doesn't double-debit.
  if (next === "CANCELLED" || next === "REFUNDED") {
    try {
      const { reverseOrderPoints } = await import("@/lib/loyalty/earn");
      await reverseOrderPoints(order.id);
    } catch (err) {
      console.error("[admin order] loyalty reversal failed", err);
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/ordrar");
  revalidatePath(`/admin/ordrar/${orderNumber}`);
  // Phase 7: trigger shipping-notification email when next === FULFILLED
  return { ok: true };
}

/**
 * Bulk-update — used by the ordrar list's selection toolbar. Loops
 * through and applies the same target status to each order, skipping
 * any that don't allow the transition (e.g. CANCELLED → FULFILLED).
 * Returns a summary so the UI can surface "X updated, Y skipped".
 *
 * Single server round-trip but per-order DB writes (not a single
 * transaction) because the loyalty side-effect can fail independently
 * and we want partial success rather than all-or-nothing on a 50-order
 * batch.
 */
export async function bulkUpdateOrderStatus(
  orderNumbers: string[],
  next: OrderStatus
): Promise<{ ok: true; updated: number; skipped: number }> {
  const { tenantId } = await requireTenantRole("admin");
  if (orderNumbers.length === 0) return { ok: true, updated: 0, skipped: 0 };

  const orders = await tenantScope(tenantId, (tx) =>
    tx.order.findMany({
      where: { orderNumber: { in: orderNumbers } },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentReference: true,
        paymentProvider: true,
        totalAmount: true,
      },
    })
  );

  let updated = 0;
  let skipped = 0;
  for (const o of orders) {
    if (!VALID_TRANSITIONS[o.status].includes(next)) {
      skipped++;
      continue;
    }
    // Best-effort per order: a Kustom settlement failure skips that
    // order (leaves it for retry) rather than aborting the batch or
    // marking it terminal without the money moving.
    if (next === "CANCELLED" || next === "REFUNDED") {
      try {
        await settleKustomTermination(o);
      } catch (err) {
        console.error(
          `[admin order bulk] Kustom settlement failed for ${o.orderNumber}`,
          err
        );
        skipped++;
        continue;
      }
    }
    if (next === "FULFILLED") {
      try {
        await captureKustomOnFulfill(o);
      } catch (err) {
        console.error(
          `[admin order bulk] Kustom capture failed for ${o.orderNumber}`,
          err
        );
        skipped++;
        continue;
      }
    }
    await tenantScope(tenantId, (tx) =>
      tx.order.update({
        where: { id: o.id },
        data: { status: next },
      })
    );
    updated++;

    if (next === "CANCELLED" || next === "REFUNDED") {
      try {
        const { reverseOrderPoints } = await import("@/lib/loyalty/earn");
        await reverseOrderPoints(o.id);
      } catch (err) {
        console.error("[admin order bulk] loyalty reversal failed", err);
      }
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/ordrar");
  return { ok: true, updated, skipped };
}
