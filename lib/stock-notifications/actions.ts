"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sendTransactional } from "@/lib/email/client";
import { stockBackInStockEmail } from "@/lib/email/templates";
import { emailSchema, fail } from "@/lib/validation/shared";
import {
  enforceRateLimit,
  clientIp,
  STOCK_NOTIFY_RULE,
} from "@/lib/security/rate-limit";

const FANOUT_BATCH = 50;

const StockNotifySchema = z.object({
  productSlug: z.string().trim().min(1).max(120),
  email: emailSchema,
});

export type RequestResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Customer-submitted notify-me request. Idempotent on the unique
 * `(productId, email)` index — re-submitting the same address against
 * the same product is a no-op rather than an error.
 */
export async function requestStockNotification(raw: unknown): Promise<RequestResult> {
  const parsed = StockNotifySchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error);
  const { email } = parsed.data;

  const ip = await clientIp();
  const rl = await enforceRateLimit(STOCK_NOTIFY_RULE, ip);
  if (!rl.allowed) {
    return {
      ok: false,
      error: `För många försök just nu — försök igen om ${Math.ceil(rl.retryAfterSeconds / 60)} minuter.`,
    };
  }

  const product = await prisma.product.findUnique({
    where: { slug: parsed.data.productSlug },
    select: { id: true, stock: true, manageStock: true, status: true },
  });
  if (!product) return { ok: false, error: "Produkten hittades inte." };
  if (product.status !== "PUBLISHED") {
    return { ok: false, error: "Produkten är inte tillgänglig." };
  }

  // If the product is already in stock, no point queuing — send a
  // friendly confirmation and skip the row.
  if (!product.manageStock || product.stock > 0) {
    return { ok: false, error: "Produkten finns redan i lager." };
  }

  try {
    await prisma.stockNotificationRequest.upsert({
      where: {
        productId_email: { productId: product.id, email },
      },
      create: { productId: product.id, email },
      // Reset fulfilledAt so a customer can re-subscribe after a previous
      // notification fired and the product later went out of stock again.
      update: { fulfilledAt: null },
    });
  } catch (err) {
    console.error("requestStockNotification failed:", err);
    return { ok: false, error: "Kunde inte spara förfrågan." };
  }

  return { ok: true };
}

/**
 * Fire pending notifications for a product that just came back in stock.
 * Called from the admin save hook when stock transitions from 0 to >0,
 * and idempotent-safe to call after every save — it only acts on rows
 * where `fulfilledAt IS NULL`.
 */
export async function fanoutStockNotifications(productId: string): Promise<{
  sent: number;
  errors: { email: string; error: string }[];
}> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      slug: true,
      name: true,
      stock: true,
      manageStock: true,
      status: true,
      variants: {
        select: { stock: true, manageStock: true },
      },
    },
  });
  if (!product) return { sent: 0, errors: [] };
  if (product.status !== "PUBLISHED") return { sent: 0, errors: [] };

  // Availability: a product has stock if EITHER the parent row has stock
  // (single-SKU products) OR any variant has stock (variant products
  // ignore the parent.stock value — `resolveVariants()` treats <2 variants
  // as variantless, matching the public-page logic).
  const variantInStock =
    product.variants.length >= 2 &&
    product.variants.some((v) => !v.manageStock || v.stock > 0);
  const parentInStock = !product.manageStock || product.stock > 0;
  const anythingInStock =
    product.variants.length >= 2 ? variantInStock : parentInStock;
  if (!anythingInStock) return { sent: 0, errors: [] };

  const pending = await prisma.stockNotificationRequest.findMany({
    where: { productId, fulfilledAt: null },
    orderBy: { createdAt: "asc" },
    take: FANOUT_BATCH,
    select: { id: true, email: true },
  });
  if (pending.length === 0) return { sent: 0, errors: [] };

  let sent = 0;
  const errors: { email: string; error: string }[] = [];

  for (const r of pending) {
    const tpl = stockBackInStockEmail({
      productName: product.name,
      productSlug: product.slug,
    });
    const result = await sendTransactional({
      to: { email: r.email },
      subject: tpl.subject,
      preheader: tpl.preheader,
      html: tpl.html,
      text: tpl.text,
      category: "stock-back",
      customId: `stock-back:${product.slug}:${r.id}`,
    });
    if (!result.ok) {
      errors.push({ email: r.email, error: result.error });
      continue;
    }
    await prisma.stockNotificationRequest.update({
      where: { id: r.id },
      data: { fulfilledAt: new Date() },
    });
    sent++;
  }

  return { sent, errors };
}

/** Count pending requests — used by admin to show "X kunder väntar". */
export async function pendingStockNotificationCount(
  productId: string
): Promise<number> {
  return prisma.stockNotificationRequest.count({
    where: { productId, fulfilledAt: null },
  });
}
