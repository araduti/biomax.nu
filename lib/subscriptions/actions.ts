"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";
import { cuidSchema, fail } from "@/lib/validation/shared";
import {
  DEFAULT_SUBSCRIPTION_DISCOUNT_PERCENT,
  SUBSCRIPTION_INTERVAL_DAYS,
  type SubscriptionIntervalDays,
} from "./constants";

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
 * Subscription creation paths:
 *   1. From the PDP "Prenumerera"-toggle. Customer must be logged in
 *      (we need a userId to manage subscription lifecycle). The PDP
 *      form sends product + variant + interval; we create a 1-line
 *      subscription with the customer's last-used address (or null,
 *      forcing checkout to capture one).
 *   2. From the checkout flow once we wire "convert this order to a
 *      subscription"-toggle. Phase 2 — not yet built.
 *
 * Lifecycle:
 *   - createSubscription → ACTIVE, nextOrderAt = now + intervalDays
 *   - pauseSubscription → PAUSED (renewal cron skips)
 *   - resumeSubscription → ACTIVE, nextOrderAt = now (immediate next
 *     cycle, intentionally — the customer asked to be back on)
 *   - cancelSubscription → CANCELLED (terminal). No undo via UI;
 *     customer creates a fresh subscription if they change their mind.
 *
 * Renewal happens in /api/cron/subscription-renewals (separate file).
 */

export type SubscriptionActionResult =
  | { ok: true; subscriptionId: string }
  | { ok: false; error: string };

export async function createSubscription(
  raw: unknown
): Promise<SubscriptionActionResult> {
  const parsed = CreateSubscriptionSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error);
  const input = parsed.data;

  const user = await currentUser();
  if (!user) {
    return { ok: false, error: "Du måste vara inloggad för att prenumerera." };
  }
  const quantity = input.quantity ?? 1;

  // Validate product + variant.
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: {
      id: true,
      name: true,
      price: true,
      status: true,
      variants: {
        select: { id: true, price: true },
      },
    },
  });
  if (!product || product.status !== "PUBLISHED") {
    return { ok: false, error: "Produkten är inte tillgänglig för prenumeration." };
  }
  const hasVariants = product.variants.length >= 2;
  let variantId: string | null = null;
  let unitPriceAtCreate: number;
  if (hasVariants) {
    if (!input.variantId) {
      return { ok: false, error: "Välj en variant att prenumerera på." };
    }
    const v = product.variants.find((x) => x.id === input.variantId);
    if (!v) return { ok: false, error: "Varianten finns inte längre." };
    variantId = v.id;
    unitPriceAtCreate = parseFloat(v.price.toString());
  } else {
    unitPriceAtCreate = parseFloat(product.price.toString());
  }

  // Reuse the customer's last shipping address, if any. Null is fine —
  // the renewal flow re-prompts in that case.
  const lastAddress = await prisma.address.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  const nextOrderAt = new Date();
  nextOrderAt.setUTCDate(nextOrderAt.getUTCDate() + input.intervalDays);

  try {
    const sub = await prisma.subscription.create({
      data: {
        userId: user.id,
        email: user.email,
        status: "ACTIVE",
        intervalDays: input.intervalDays,
        discountPercent: DEFAULT_SUBSCRIPTION_DISCOUNT_PERCENT,
        nextOrderAt,
        shippingAddressId: lastAddress?.id ?? null,
        billingAddressId: lastAddress?.id ?? null,
        lines: {
          create: [
            {
              productId: product.id,
              variantId,
              quantity,
              unitPriceAtCreate,
            },
          ],
        },
      },
    });
    return { ok: true, subscriptionId: sub.id };
  } catch (err) {
    console.error("createSubscription failed:", err);
    return { ok: false, error: "Kunde inte skapa prenumerationen." };
  }
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
