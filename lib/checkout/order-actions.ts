"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";
import { isKlarnaConfigured } from "@/lib/klarna/client";
import {
  shippingForSubtotal,
  STANDARD_SHIPPING_SEK,
  CURRENT_VAT_BP,
} from "@/lib/klarna/cart-to-order";
import { sendTransactional } from "@/lib/email/client";
import { orderConfirmationEmail } from "@/lib/email/templates";

/**
 * Server-trusted order placement.
 *
 * Cart prices come from the client's localStorage and are NOT trusted —
 * we re-fetch products by ID, validate availability, and recompute totals
 * with authoritative DB prices before any DB writes.
 *
 * In stub mode (no Klarna creds) we treat the order as paid and return
 * the orderNumber for the confirmation redirect. When Klarna is wired
 * (Phase 3C+), this action becomes the *creator* of the Klarna session —
 * the actual Order row is created by the confirmation page after Klarna
 * redirects back with the klarna_order_id.
 */

type CartLineInput = { productId: string; quantity: number };

type CustomerInput = {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
};

type ShippingInput = {
  street: string;
  postalCode: string;
  city: string;
};

type PlaceOrderInput = {
  cart: CartLineInput[];
  customer: CustomerInput;
  shipping: ShippingInput;
  marketingConsent?: boolean;
};

export type PlaceOrderResult =
  | { ok: true; orderNumber: string; isStub: boolean }
  | { ok: false; error: string };

function generateOrderNumber(): string {
  const now = new Date();
  const yyyymmdd =
    now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, "0") +
    now.getDate().toString().padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `BMX-${yyyymmdd}-${rand}`;
}

export async function placeOrder(
  input: PlaceOrderInput
): Promise<PlaceOrderResult> {
  // ─── 1. Validate basic input ────────────────────────────
  if (!input.cart.length) {
    return { ok: false, error: "Varukorgen är tom." };
  }
  if (!input.customer.email.includes("@")) {
    return { ok: false, error: "Ogiltig e-postadress." };
  }
  if (!input.shipping.street || !input.shipping.postalCode || !input.shipping.city) {
    return { ok: false, error: "Leveransadress är ofullständig." };
  }

  // ─── 2. Fetch authoritative product data ───────────────
  const productIds = [...new Set(input.cart.map((l) => l.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      slug: true,
      sku: true,
      name: true,
      price: true,
      stock: true,
      manageStock: true,
      status: true,
    },
  });

  // ─── 3. Validate availability ──────────────────────────
  type Resolved = {
    productId: string;
    sku: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  };
  const resolved: Resolved[] = [];
  for (const line of input.cart) {
    const product = products.find((p) => p.id === line.productId);
    if (!product) {
      return { ok: false, error: `Produkten finns inte längre.` };
    }
    if (product.status !== "PUBLISHED") {
      return {
        ok: false,
        error: `Produkten "${product.name}" är inte tillgänglig.`,
      };
    }
    if (product.manageStock && product.stock < line.quantity) {
      return {
        ok: false,
        error: `För få i lager: "${product.name}" (${product.stock} kvar).`,
      };
    }
    const unitPrice = parseFloat(product.price.toString());
    resolved.push({
      productId: product.id,
      sku: product.sku,
      name: product.name,
      quantity: line.quantity,
      unitPrice,
      totalPrice: unitPrice * line.quantity,
    });
  }

  // ─── 4. Compute totals (server prices) ─────────────────
  const subtotal = resolved.reduce((s, l) => s + l.totalPrice, 0);
  const shippingAmount = shippingForSubtotal(subtotal);
  const totalAmount = subtotal + shippingAmount;
  // Tax already included in line prices (Swedish gross convention).
  // VAT = gross × rate / (10000 + rate). Rate stored on the order so
  // historical accuracy survives future rate changes.
  const taxAmount =
    Math.round(
      ((totalAmount * CURRENT_VAT_BP) / (10000 + CURRENT_VAT_BP)) * 100
    ) / 100;

  // ─── 5. Resolve user (if logged in) ────────────────────
  const user = await currentUser();
  const userId = user?.id ?? null;

  // ─── 6. Create order + items + address atomically ──────
  const orderNumber = generateOrderNumber();
  const isStub = !isKlarnaConfigured();
  const fullName =
    `${input.customer.firstName} ${input.customer.lastName}`.trim();

  try {
    await prisma.$transaction(async (tx) => {
      const address = await tx.address.create({
        data: {
          userId,
          fullName,
          street: input.shipping.street,
          postalCode: input.shipping.postalCode,
          city: input.shipping.city,
          countryCode: "SE",
          phone: input.customer.phone || null,
        },
      });
      await tx.order.create({
        data: {
          orderNumber,
          userId,
          email: input.customer.email.toLowerCase(),
          status: isStub ? "PAID" : "PENDING",
          paymentProvider: "KLARNA",
          paymentReference: isStub ? `stub-${orderNumber}` : null,
          currency: "SEK",
          subtotal,
          shippingAmount,
          taxAmount,
          taxRateBp: CURRENT_VAT_BP,
          totalAmount,
          marketingConsent: input.marketingConsent ?? false,
          shippingAddressId: address.id,
          billingAddressId: address.id,
          // `legacySource` is reserved for genuine imports (WordPress XML).
          // Stub-checkout orders are real, fresh orders — they're just paid
          // through the dev fallback when Klarna creds aren't set. Marking
          // them as legacy would surface "arkiverad" labels in /konto.
          legacySource: null,
          items: {
            create: resolved.map((r) => ({
              productId: r.productId,
              productName: r.name,
              productSku: r.sku,
              quantity: r.quantity,
              unitPrice: r.unitPrice,
              totalPrice: r.totalPrice,
            })),
          },
        },
      });
      // Decrement stock for managed products
      for (const r of resolved) {
        const product = products.find((p) => p.id === r.productId);
        if (product?.manageStock) {
          await tx.product.update({
            where: { id: product.id },
            data: { stock: { decrement: r.quantity } },
          });
        }
      }
    });
  } catch (err) {
    console.error("placeOrder transaction failed:", err);
    return { ok: false, error: "Kunde inte skapa ordern. Försök igen." };
  }

  // Fire-and-forget order confirmation. We don't fail the order if the
  // email fails — it's logged and we'll have the order in admin to retry.
  void (async () => {
    try {
      const tpl = orderConfirmationEmail({
        orderNumber,
        customerFirstName: input.customer.firstName || null,
        email: input.customer.email.toLowerCase(),
        items: resolved.map((r) => ({
          name: r.name,
          quantity: r.quantity,
          unitPrice: r.unitPrice.toFixed(2),
          totalPrice: r.totalPrice.toFixed(2),
        })),
        subtotal: subtotal.toFixed(2),
        shipping: shippingAmount.toFixed(2),
        total: totalAmount.toFixed(2),
        shippingAddress: {
          fullName,
          street: input.shipping.street,
          postalCode: input.shipping.postalCode,
          city: input.shipping.city,
        },
      });
      await sendTransactional({
        to: {
          email: input.customer.email.toLowerCase(),
          name: fullName,
        },
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
        preheader: tpl.preheader,
        category: "order-confirmation",
        customId: orderNumber,
      });
    } catch (emailErr) {
      console.error("Order confirmation email failed:", emailErr);
    }
  })();

  revalidatePath("/konto");
  return { ok: true, orderNumber, isStub };
}

/**
 * Look up an order by orderNumber for the confirmation page.
 * Only returns minimal data (no full address/PII) — confirmation displays.
 */
export async function getOrderForConfirmation(orderNumber: string) {
  return prisma.order.findUnique({
    where: { orderNumber },
    select: {
      orderNumber: true,
      email: true,
      status: true,
      currency: true,
      subtotal: true,
      shippingAmount: true,
      totalAmount: true,
      createdAt: true,
      items: {
        select: {
          productName: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
        },
      },
    },
  });
}
