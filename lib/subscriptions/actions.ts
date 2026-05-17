"use server";

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";
import { cuidSchema, fail } from "@/lib/validation/shared";
import { DEFAULT_SUBSCRIPTION_DISCOUNT_PERCENT } from "./constants";

const IntervalDays = z.union([z.literal(30), z.literal(60), z.literal(90)]);

const CreateSubscriptionSchema = z.object({
  productId: cuidSchema,
  variantId: cuidSchema.nullable().optional(),
  quantity: z.coerce.number().int().min(1).max(99).optional(),
  intervalDays: IntervalDays,
});

const ChangeIntervalSchema = z.object({
  subscriptionId: cuidSchema,
  intervalDays: IntervalDays,
});

const ChangeQuantitySchema = z.object({
  subscriptionLineId: cuidSchema,
  quantity: z.coerce.number().int().min(1).max(99),
});

const CancelSchema = z.object({
  subscriptionId: cuidSchema,
  reason: z.string().trim().max(240).optional(),
});

/**
 * Customer-facing subscription server actions.
 *
 * Subscription creation is PAYMENT-GATED. The PDP "Prenumerera" toggle
 * routes the customer through the standard Kustom/Klarna checkout to
 * pay for (and capture an address for) the first delivery — see
 * `startSubscriptionCheckout` in lib/checkout/kustom-session.ts. The
 * subscription row itself is created only once that first payment
 * settles, by `finalizePaidSubscription` (called from
 * `ensureOrderFromKustomOrder`, inside the paid-order transaction).
 * There is intentionally NO action that creates an ACTIVE subscription
 * without a settled first order.
 *
 * Lifecycle:
 *   - finalizePaidSubscription → ACTIVE, nextOrderAt = now +
 *     intervalDays, linked to the paid first Order
 *   - pauseSubscription → PAUSED (renewal cron skips)
 *   - resumeSubscription → ACTIVE, nextOrderAt = now + intervalDays
 *   - cancelSubscription → CANCELLED (terminal). No undo via UI;
 *     customer creates a fresh subscription if they change their mind.
 *
 * Renewal happens in /api/cron/subscription-renewals (separate file).
 */

export type SubscriptionActionResult =
  | { ok: true; subscriptionId: string }
  | { ok: false; error: string };

export type SubscriptionTarget = {
  productId: string;
  productName: string;
  productSku: string;
  variantId: string | null;
  variantSku: string | null;
  /** Undiscounted list price (kr). The subscription discount is applied
   *  by the caller (Kustom discount line). */
  listUnitPrice: number;
  discountPercent: number;
  intervalDays: 30 | 60 | 90;
  quantity: number;
};

/**
 * Validate a PDP subscribe request and resolve the authoritative
 * product/variant/price. No DB writes, no auth — the caller
 * (startSubscriptionCheckout) owns the session + auth. Price is the
 * undiscounted list price; the subscription discount is applied as a
 * Kustom discount line so the customer sees it explicitly.
 */
export async function resolveSubscriptionTarget(
  raw: unknown
): Promise<
  | { ok: true; target: SubscriptionTarget }
  | { ok: false; error: string }
> {
  const parsed = CreateSubscriptionSchema.safeParse(raw);
  if (!parsed.success) {
    const f = fail(parsed.error);
    return { ok: false, error: f.error };
  }
  const input = parsed.data;
  const quantity = input.quantity ?? 1;

  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: {
      id: true,
      name: true,
      sku: true,
      price: true,
      status: true,
      variants: { select: { id: true, sku: true, price: true } },
    },
  });
  if (!product || product.status !== "PUBLISHED") {
    return { ok: false, error: "Produkten är inte tillgänglig för prenumeration." };
  }

  const hasVariants = product.variants.length >= 2;
  let variantId: string | null = null;
  let variantSku: string | null = null;
  let listUnitPrice: number;
  if (hasVariants) {
    if (!input.variantId) {
      return { ok: false, error: "Välj en variant att prenumerera på." };
    }
    const v = product.variants.find((x) => x.id === input.variantId);
    if (!v) return { ok: false, error: "Varianten finns inte längre." };
    variantId = v.id;
    variantSku = v.sku;
    listUnitPrice = parseFloat(v.price.toString());
  } else {
    listUnitPrice = parseFloat(product.price.toString());
  }

  return {
    ok: true,
    target: {
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      variantId,
      variantSku,
      listUnitPrice,
      discountPercent: DEFAULT_SUBSCRIPTION_DISCOUNT_PERCENT,
      intervalDays: input.intervalDays,
      quantity,
    },
  };
}

/** Subscription intent serialised into Kustom `merchant_data` so the
 *  confirmation/webhook path can create the subscription after the
 *  first payment settles. Kept compact (merchant_data has a length
 *  cap). */
export type SubscriptionIntent = {
  /** product id */ pid: string;
  /** variant id */ vid: string | null;
  /** quantity */ q: number;
  /** interval days */ iv: 30 | 60 | 90;
  /** discount percent */ dp: number;
  /** list unit price (kr) at create */ up: number;
};

/**
 * Create the Subscription + its single line once the first delivery is
 * paid. Idempotent: keyed on `firstOrderId` — a second call (webhook
 * race / page refresh) finds the existing subscription and returns it
 * without creating a duplicate. Runs inside the paid-order transaction
 * so the order and the subscription commit (or roll back) atomically.
 */
export async function finalizePaidSubscription(
  tx: Prisma.TransactionClient,
  args: {
    intent: SubscriptionIntent;
    userId: string | null;
    email: string;
    firstOrderId: string;
    shippingAddressId: string | null;
    billingAddressId: string | null;
  }
): Promise<string> {
  const existing = await tx.subscription.findFirst({
    where: { orders: { some: { id: args.firstOrderId } } },
    select: { id: true },
  });
  if (existing) return existing.id;

  const nextOrderAt = new Date();
  nextOrderAt.setUTCDate(nextOrderAt.getUTCDate() + args.intent.iv);

  const sub = await tx.subscription.create({
    data: {
      userId: args.userId,
      email: args.email,
      status: "ACTIVE",
      intervalDays: args.intent.iv,
      discountPercent: args.intent.dp,
      nextOrderAt,
      shippingAddressId: args.shippingAddressId,
      billingAddressId: args.billingAddressId,
      lines: {
        create: [
          {
            productId: args.intent.pid,
            variantId: args.intent.vid,
            quantity: args.intent.q,
            unitPriceAtCreate: args.intent.up,
          },
        ],
      },
    },
  });

  // Link the just-paid first Order to the subscription so /konto and
  // /admin reconstruct the trail exactly like a renewal order.
  await tx.order.update({
    where: { id: args.firstOrderId },
    data: { subscriptionId: sub.id },
  });

  return sub.id;
}

async function authorizedSubscription(subscriptionId: string) {
  const user = await currentUser();
  if (!user) return null;
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    select: { id: true, userId: true, status: true, intervalDays: true },
  });
  if (!sub || sub.userId !== user.id) return null;
  return sub;
}

export async function pauseSubscription(
  rawId: unknown
): Promise<SubscriptionActionResult> {
  const idParsed = cuidSchema.safeParse(rawId);
  if (!idParsed.success) return fail(idParsed.error);
  const sub = await authorizedSubscription(idParsed.data);
  if (!sub) return { ok: false, error: "Prenumerationen hittades inte." };
  if (sub.status === "CANCELLED")
    return { ok: false, error: "En avslutad prenumeration kan inte pausas." };
  await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: "PAUSED" },
  });
  return { ok: true, subscriptionId: sub.id };
}

export async function resumeSubscription(
  rawId: unknown
): Promise<SubscriptionActionResult> {
  const idParsed = cuidSchema.safeParse(rawId);
  if (!idParsed.success) return fail(idParsed.error);
  const sub = await authorizedSubscription(idParsed.data);
  if (!sub) return { ok: false, error: "Prenumerationen hittades inte." };
  if (sub.status === "CANCELLED")
    return { ok: false, error: "En avslutad prenumeration kan inte återupptas." };
  // Resume schedules the next order one interval out — gives the customer
  // a predictable "I'll get my next box in N days" expectation.
  const nextOrderAt = new Date();
  nextOrderAt.setUTCDate(nextOrderAt.getUTCDate() + sub.intervalDays);
  await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: "ACTIVE", nextOrderAt },
  });
  return { ok: true, subscriptionId: sub.id };
}

export async function cancelSubscription(
  rawId: unknown,
  rawReason?: unknown
): Promise<SubscriptionActionResult> {
  const parsed = CancelSchema.safeParse({
    subscriptionId: rawId,
    reason: rawReason,
  });
  if (!parsed.success) return fail(parsed.error);
  const sub = await authorizedSubscription(parsed.data.subscriptionId);
  if (!sub) return { ok: false, error: "Prenumerationen hittades inte." };
  if (sub.status === "CANCELLED")
    return { ok: true, subscriptionId: sub.id };
  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancellationReason: parsed.data.reason || null,
    },
  });
  return { ok: true, subscriptionId: sub.id };
}

export async function changeInterval(
  rawId: unknown,
  rawIntervalDays: unknown
): Promise<SubscriptionActionResult> {
  const parsed = ChangeIntervalSchema.safeParse({
    subscriptionId: rawId,
    intervalDays: rawIntervalDays,
  });
  if (!parsed.success) return fail(parsed.error);
  const { subscriptionId, intervalDays } = parsed.data;
  const sub = await authorizedSubscription(subscriptionId);
  if (!sub) return { ok: false, error: "Prenumerationen hittades inte." };
  // Reschedule the next order — but only push forward, never pull back
  // (don't surprise the customer with an earlier renewal than they
  // expected). If the new interval would result in an earlier date than
  // the existing nextOrderAt, keep the existing.
  const proposed = new Date();
  proposed.setUTCDate(proposed.getUTCDate() + intervalDays);
  const current = await prisma.subscription.findUnique({
    where: { id: sub.id },
    select: { nextOrderAt: true },
  });
  const nextOrderAt =
    current && current.nextOrderAt > proposed ? current.nextOrderAt : proposed;
  await prisma.subscription.update({
    where: { id: sub.id },
    data: { intervalDays, nextOrderAt },
  });
  return { ok: true, subscriptionId: sub.id };
}

export async function changeQuantity(
  rawId: unknown,
  rawQuantity: unknown
): Promise<SubscriptionActionResult> {
  const parsed = ChangeQuantitySchema.safeParse({
    subscriptionLineId: rawId,
    quantity: rawQuantity,
  });
  if (!parsed.success) return fail(parsed.error);
  const { subscriptionLineId, quantity } = parsed.data;
  const user = await currentUser();
  if (!user) return { ok: false, error: "Logga in först." };
  const line = await prisma.subscriptionLine.findUnique({
    where: { id: subscriptionLineId },
    select: { subscriptionId: true, subscription: { select: { userId: true } } },
  });
  if (!line || line.subscription.userId !== user.id) {
    return { ok: false, error: "Raden hittades inte." };
  }
  await prisma.subscriptionLine.update({
    where: { id: subscriptionLineId },
    data: { quantity },
  });
  return { ok: true, subscriptionId: line.subscriptionId };
}
