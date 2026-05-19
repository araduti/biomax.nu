"use server";

import crypto from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";
import { cuidSchema, fail } from "@/lib/validation/shared";
import { restockReturnedItems } from "@/lib/checkout/stock";
import { canTransitionOrder } from "@/lib/orders/status";

/**
 * Customer + admin actions on the Return model.
 *
 * Customer-side:
 *   - requestReturn(): create a Return row in REQUESTED state.
 *     Validates ownership, FULFILLED-or-later status, and a 14-day
 *     window from order updatedAt (distansavtalslagen min).
 *
 * Admin-side (in this file for proximity; requireAdmin gates each):
 *   - moderateReturn(): flip status APPROVED / RECEIVED / REJECTED.
 *   - recordRefund(): mark a Return as REFUNDED, store the refund
 *     reference (Klarna refund id or manual note), set refundedAt.
 *     The Klarna refund API call itself happens in
 *     lib/klarna/client.ts when wired; here we just record the
 *     bookkeeping outcome.
 */

const ReturnNumberRoot = "BMX-RET-";
const RETURN_WINDOW_DAYS = 14;

function generateReturnNumber(): string {
  const now = new Date();
  const yyyymmdd =
    now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, "0") +
    now.getDate().toString().padStart(2, "0");
  return `${ReturnNumberRoot}${yyyymmdd}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
}

const RequestReturnSchema = z.object({
  orderId: cuidSchema,
  /** Map of orderItemId → quantity to return. */
  items: z
    .array(
      z.object({
        orderItemId: cuidSchema,
        quantity: z.coerce.number().int().min(1).max(99),
      })
    )
    .min(1, "Välj minst en produkt att returnera."),
  reason: z.string().trim().max(500).optional(),
});

export type ReturnActionResult =
  | { ok: true; returnNumber: string }
  | { ok: false; error: string };

export async function requestReturn(raw: unknown): Promise<ReturnActionResult> {
  const parsed = RequestReturnSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error);
  const user = await currentUser();
  if (!user) return { ok: false, error: "Logga in först." };

  const order = await prisma.order.findFirst({
    where: { id: parsed.data.orderId, userId: user.id },
    include: { items: true, returns: true },
  });
  if (!order) return { ok: false, error: "Ordern hittades inte." };

  if (order.status !== "FULFILLED" && order.status !== "PAID") {
    return {
      ok: false,
      error: "Endast levererade beställningar kan returneras.",
    };
  }

  // Window check — use updatedAt as the "delivered" approximation until
  // PostNord webhooks (Phase C) give us a real delivery timestamp.
  const ageMs = Date.now() - order.updatedAt.getTime();
  const ageDays = ageMs / (24 * 3600 * 1000);
  if (ageDays > RETURN_WINDOW_DAYS) {
    return {
      ok: false,
      error: `Returfönstret på ${RETURN_WINDOW_DAYS} dagar har passerats. Hör av dig om du behöver hjälp ändå.`,
    };
  }

  // Validate every line — quantity ≤ ordered AND not already in an
  // active return for this order.
  const lineByOrderItemId = new Map(order.items.map((i) => [i.id, i]));
  const activeReturnedQty = new Map<string, number>();
  for (const r of order.returns) {
    if (r.status === "REJECTED") continue; // rejected lines free up qty
    // We'd need to load ReturnItem rows here to be precise — skipping
    // the per-line subtraction for v1; admin reviews on REQUESTED.
  }

  for (const rl of parsed.data.items) {
    const orderLine = lineByOrderItemId.get(rl.orderItemId);
    if (!orderLine || orderLine.orderId !== order.id) {
      return { ok: false, error: "Ogiltig orderrad i returen." };
    }
    if (rl.quantity > orderLine.quantity) {
      return {
        ok: false,
        error: `Du kan inte returnera fler än du beställt av "${orderLine.productName}".`,
      };
    }
    activeReturnedQty.set(
      rl.orderItemId,
      (activeReturnedQty.get(rl.orderItemId) ?? 0) + rl.quantity
    );
  }

  const returnNumber = generateReturnNumber();
  try {
    await prisma.return.create({
      data: {
        returnNumber,
        orderId: order.id,
        userId: user.id,
        reason: parsed.data.reason || null,
        items: {
          create: parsed.data.items.map((it) => ({
            orderItemId: it.orderItemId,
            quantity: it.quantity,
          })),
        },
      },
    });
    revalidatePath(`/konto/ordrar/${order.orderNumber}`);
    revalidatePath("/admin/returer");
    return { ok: true, returnNumber };
  } catch (err) {
    console.error("requestReturn failed:", err);
    return { ok: false, error: "Kunde inte skapa returen." };
  }
}

// ─── Admin actions ───────────────────────────────────────────────

import { requireTenantRole } from "@/lib/admin/guard";
import { audit } from "@/lib/admin/audit";
import { tenantScope } from "@/lib/tenant/db";

const ModerateSchema = z.object({
  returnId: cuidSchema,
  action: z.enum(["APPROVED", "RECEIVED", "REJECTED"]),
  internalNote: z.string().trim().max(500).optional(),
});

export async function moderateReturn(
  raw: unknown
): Promise<ReturnActionResult> {
  const actor = await requireTenantRole("admin");
  const parsed = ModerateSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error);

  const existing = await tenantScope(actor.tenantId, async (tx) => {
    const row = await tx.return.findUnique({
      where: { id: parsed.data.returnId },
      select: { id: true, returnNumber: true, status: true },
    });
    if (!row) return null;
    await tx.return.update({
      where: { id: row.id },
      data: {
        status: parsed.data.action,
        internalNote: parsed.data.internalNote ?? undefined,
      },
    });
    return row;
  });
  if (!existing) return { ok: false, error: "Returen hittades inte." };

  await audit({
    actorId: actor.userId,
    action: `return.${parsed.data.action.toLowerCase()}`,
    entityType: "Return",
    entityId: existing.id,
    diff: { fromStatus: existing.status, toStatus: parsed.data.action },
  });
  revalidatePath("/admin/returer");
  return { ok: true, returnNumber: existing.returnNumber };
}

const RecordRefundSchema = z.object({
  returnId: cuidSchema,
  refundAmount: z.coerce.number().min(0).max(999_999),
  refundReference: z.string().trim().max(120),
});

export async function recordRefund(raw: unknown): Promise<ReturnActionResult> {
  const actor = await requireTenantRole("admin");
  const parsed = RecordRefundSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error);

  // Pre-read + the atomic refund/restock/order-flip multi-write all run
  // inside one tenantScope so the seam's transaction (ADR 0032 D7) is
  // the outer tx — RLS-isolated, atomic across return/order/stock.
  type RefundOutcome =
    | { kind: "missing" }
    | { kind: "badState"; status: string }
    | { kind: "ok"; returnId: string; returnNumber: string };
  const outcome = await tenantScope(
    actor.tenantId,
    async (tx): Promise<RefundOutcome> => {
      const existing = await tx.return.findUnique({
        where: { id: parsed.data.returnId },
        select: {
          id: true,
          returnNumber: true,
          orderId: true,
          order: { select: { status: true } },
          items: {
            select: {
              quantity: true,
              orderItem: {
                select: { productId: true, variantId: true },
              },
            },
          },
        },
      });
      if (!existing) return { kind: "missing" };

      // State-machine guard: only PAID/FULFILLED orders may move to
      // REFUNDED. Without this an admin could refund a CANCELLED order
      // (already settled at Kustom) or double-refund a REFUNDED one.
      if (
        existing.order.status !== "REFUNDED" &&
        !canTransitionOrder(existing.order.status, "REFUNDED")
      ) {
        return { kind: "badState", status: existing.order.status };
      }

      // Idempotency guard: only the transition INTO refunded restocks.
      // A second recordRefund() call (or admin double-click) matches
      // zero rows here and skips the restock — stock is never doubled.
      const claim = await tx.return.updateMany({
        where: { id: existing.id, status: { not: "REFUNDED" } },
        data: {
          status: "REFUNDED",
          refundAmount: parsed.data.refundAmount,
          refundReference: parsed.data.refundReference,
          refundedAt: new Date(),
        },
      });

      if (claim.count === 1) {
        // Return the physical units to inventory. Without this, refunded
        // stock is lost from on-hand counts forever (phantom shrinkage).
        await restockReturnedItems(
          tx,
          existing.items.map((it) => ({
            productId: it.orderItem.productId,
            variantId: it.orderItem.variantId,
            quantity: it.quantity,
          }))
        );
      }

      // Mark the parent order REFUNDED only when this return fully
      // covers it. For v1 we just flip — admins can use partial-refund
      // refs in the reference field to disambiguate.
      await tx.order.update({
        where: { id: existing.orderId },
        data: { status: "REFUNDED" },
      });

      return { kind: "ok", returnId: existing.id, returnNumber: existing.returnNumber };
    }
  );

  if (outcome.kind === "missing")
    return { ok: false, error: "Returen hittades inte." };
  if (outcome.kind === "badState")
    return {
      ok: false,
      error: `Ordern är i status ${outcome.status} och kan inte återbetalas.`,
    };

  await audit({
    actorId: actor.userId,
    action: "return.refunded",
    entityType: "Return",
    entityId: outcome.returnId,
    diff: {
      amount: parsed.data.refundAmount,
      reference: parsed.data.refundReference,
    },
  });
  revalidatePath("/admin/returer");
  revalidatePath(`/admin/ordrar`);
  return { ok: true, returnNumber: outcome.returnNumber };
}
