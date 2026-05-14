"use server";

import crypto from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";
import { isKlarnaConfigured } from "@/lib/klarna/client";
import {
  shippingForSubtotal,
  CURRENT_VAT_BP,
} from "@/lib/klarna/cart-to-order";
import { sendTransactional } from "@/lib/email/client";
import { orderConfirmationEmail } from "@/lib/email/templates";
import {
  emailSchema,
  postalCodeSchema,
  cuidSchema,
  positiveIntSchema,
  fail,
} from "@/lib/validation/shared";
import {
  enforceRateLimit,
  clientIp,
  ORDER_PLACEMENT_RULE,
} from "@/lib/security/rate-limit";

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

/**
 * Trust boundary — zod schema is the single source of truth for what
 * the client can send. Coerce numbers, trim strings, cap lengths, drop
 * unknown keys. Any extra cleanup (deduping productIds, normalising
 * email casing) is downstream of this parse.
 */
const PlaceOrderSchema = z.object({
  cart: z
    .array(
      z.object({
        productId: cuidSchema,
        variantId: cuidSchema.nullable().optional(),
        bundleId: cuidSchema.nullable().optional(),
        quantity: positiveIntSchema(99),
      })
    )
    .min(1, "Varukorgen är tom.")
    .max(50, "För många rader i varukorgen."),
  customer: z.object({
    email: emailSchema,
    firstName: z.string().trim().min(1, "Förnamn saknas.").max(100),
    lastName: z.string().trim().min(1, "Efternamn saknas.").max(100),
    phone: z.string().trim().max(40).optional(),
  }),
  shipping: z.object({
    street: z.string().trim().min(1, "Gatuadress saknas.").max(200),
    postalCode: postalCodeSchema,
    city: z.string().trim().min(1, "Ort saknas.").max(100),
  }),
  marketingConsent: z.boolean().optional(),
  /**
   * Familjen Biomax points the customer wants to spend on this order.
   * Server re-validates against the live balance + subtotal — the client
   * value is a suggestion. 0 / undefined / negative => no redemption.
   */
  loyaltyPointsToRedeem: z.coerce.number().int().nonnegative().optional(),
});

export type PlaceOrderInput = z.infer<typeof PlaceOrderSchema>;
export type CartLineInput = PlaceOrderInput["cart"][number];

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
  raw: unknown
): Promise<PlaceOrderResult> {
  // ─── 1. Validate trust-boundary input ──────────────────
  const parsed = PlaceOrderSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error);
  const input = parsed.data;

  // ─── 1b. Rate-limit per IP ─────────────────────────────
  // Defense against checkout-spam / card-testing automation. 10/hour
  // covers legitimate multi-person households; bots get throttled.
  const ip = await clientIp();
  const rl = await enforceRateLimit(ORDER_PLACEMENT_RULE, ip);
  if (!rl.allowed) {
    return {
      ok: false,
      error: `För många försök just nu — försök igen om ${Math.ceil(rl.retryAfterSeconds / 60)} minuter.`,
    };
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
      variants: {
        select: {
          id: true,
          sku: true,
          label: true,
          price: true,
          stock: true,
          manageStock: true,
        },
      },
    },
  });

  // ─── 2b. Fetch + validate any referenced bundles ────────
  // The cart's bundleId/discountPercent are not trusted — we re-read the
  // Bundle table, verify each line's product is actually a member, and
  // recompute the discount from the live `discountPercent` column. This
  // way an editor change between cart-add and checkout flows correctly.
  const bundleIds = [
    ...new Set(
      input.cart
        .map((l) => l.bundleId)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    ),
  ];
  const bundles =
    bundleIds.length > 0
      ? await prisma.bundle.findMany({
          where: { id: { in: bundleIds } },
          select: {
            id: true,
            slug: true,
            name: true,
            discountPercent: true,
            active: true,
            items: { select: { productId: true } },
          },
        })
      : [];

  // ─── 3. Validate availability ──────────────────────────
  type Resolved = {
    productId: string;
    variantId: string | null;
    variantLabel: string | null;
    sku: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    /** True when stock should be decremented on the variant rather than product. */
    decrementVariant: boolean;
    /** Bundle membership — null for standalone lines. */
    bundleId: string | null;
    bundleSlug: string | null;
    bundleName: string | null;
    bundleDiscountPercent: number | null;
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

    // Bundle resolution. Reject the order if the cart claims a bundle
    // that's been deleted/deactivated, or if the product isn't actually
    // part of the bundle (defends against client-side tampering).
    let bundleSnapshot: {
      id: string;
      slug: string;
      name: string;
      discountPercent: number;
    } | null = null;
    if (line.bundleId) {
      const b = bundles.find((x) => x.id === line.bundleId);
      if (!b || !b.active) {
        return {
          ok: false,
          error: `Paketet är inte längre tillgängligt. Ta bort det och försök igen.`,
        };
      }
      if (!b.items.some((it) => it.productId === product.id)) {
        return {
          ok: false,
          error: `Produkten "${product.name}" hör inte till det här paketet.`,
        };
      }
      bundleSnapshot = {
        id: b.id,
        slug: b.slug,
        name: b.name,
        discountPercent: b.discountPercent,
      };
    }

    // When the product has 2+ variants we require a variantId on the line and
    // treat the variant as authoritative for price + stock. <2 variants is
    // treated as single-SKU (matches resolveVariants() on the public side).
    const hasVariants = product.variants.length >= 2;
    if (hasVariants && !line.variantId) {
      return {
        ok: false,
        error: `Välj en variant för "${product.name}".`,
      };
    }
    const variant = line.variantId
      ? product.variants.find((v) => v.id === line.variantId)
      : null;
    if (line.variantId && !variant) {
      return {
        ok: false,
        error: `Varianten för "${product.name}" finns inte längre.`,
      };
    }

    // Compute discounted per-unit price when bundled. Round to öre so
    // unitPrice × quantity matches the line total exactly. The Bundle's
    // discountPercent is the source of truth — client snapshots aren't.
    const applyBundleDiscount = (listPrice: number): number =>
      bundleSnapshot
        ? Math.round(listPrice * (1 - bundleSnapshot.discountPercent / 100) * 100) /
          100
        : listPrice;

    if (variant) {
      if (variant.manageStock && variant.stock < line.quantity) {
        return {
          ok: false,
          error: `För få i lager: "${product.name} — ${variant.label}" (${variant.stock} kvar).`,
        };
      }
      const listPrice = parseFloat(variant.price.toString());
      const unitPrice = applyBundleDiscount(listPrice);
      resolved.push({
        productId: product.id,
        variantId: variant.id,
        variantLabel: variant.label,
        sku: variant.sku,
        name: `${product.name} — ${variant.label}`,
        quantity: line.quantity,
        unitPrice,
        totalPrice: unitPrice * line.quantity,
        decrementVariant: true,
        bundleId: bundleSnapshot?.id ?? null,
        bundleSlug: bundleSnapshot?.slug ?? null,
        bundleName: bundleSnapshot?.name ?? null,
        bundleDiscountPercent: bundleSnapshot?.discountPercent ?? null,
      });
    } else {
      if (product.manageStock && product.stock < line.quantity) {
        return {
          ok: false,
          error: `För få i lager: "${product.name}" (${product.stock} kvar).`,
        };
      }
      const listPrice = parseFloat(product.price.toString());
      const unitPrice = applyBundleDiscount(listPrice);
      resolved.push({
        productId: product.id,
        variantId: null,
        variantLabel: null,
        sku: product.sku,
        name: product.name,
        quantity: line.quantity,
        unitPrice,
        totalPrice: unitPrice * line.quantity,
        decrementVariant: false,
        bundleId: bundleSnapshot?.id ?? null,
        bundleSlug: bundleSnapshot?.slug ?? null,
        bundleName: bundleSnapshot?.name ?? null,
        bundleDiscountPercent: bundleSnapshot?.discountPercent ?? null,
      });
    }
  }

  // ─── 4. Compute totals (server prices) ─────────────────
  const subtotal = resolved.reduce((s, l) => s + l.totalPrice, 0);
  const shippingAmount = await shippingForSubtotal(subtotal);

  // ─── 5. Resolve user (if logged in) ────────────────────
  const user = await currentUser();
  const userId = user?.id ?? null;

  // ─── 5b. Validate loyalty redemption (server is the trust boundary)
  // Guests can't redeem (no account). Logged-in users have their
  // request clamped against the live balance + subtotal in öre. The
  // `pointsToOre` helper keeps math integer; we convert back to kr
  // for storage on the Decimal columns.
  let redeemedPoints = 0;
  let discountAmount = 0;
  if (userId && input.loyaltyPointsToRedeem && input.loyaltyPointsToRedeem > 0) {
    const { validateRedemption, redemptionErrorMessage } = await import(
      "@/lib/loyalty/burn"
    );
    const { getAccountBalance } = await import("@/lib/loyalty/account");
    const account = await getAccountBalance(userId);
    if (!account) {
      return { ok: false, error: redemptionErrorMessage("no-account") };
    }
    const subtotalOre = Math.round(subtotal * 100);
    const v = validateRedemption({
      pointsRequested: input.loyaltyPointsToRedeem,
      balance: account.balance,
      subtotalOre,
    });
    if (!v.ok) {
      return { ok: false, error: redemptionErrorMessage(v.reason) };
    }
    redeemedPoints = v.points;
    discountAmount = v.oreDiscount / 100;
  }

  const totalAmount = subtotal - discountAmount + shippingAmount;
  // Tax already included in line prices (Swedish gross convention).
  // VAT = gross × rate / (10000 + rate). Rate stored on the order so
  // historical accuracy survives future rate changes.
  const taxAmount =
    Math.round(
      ((totalAmount * CURRENT_VAT_BP) / (10000 + CURRENT_VAT_BP)) * 100
    ) / 100;

  // ─── 6. Create order + items + address atomically ──────
  const orderNumber = generateOrderNumber();
  const isStub = !isKlarnaConfigured();
  const fullName =
    `${input.customer.firstName} ${input.customer.lastName}`.trim();
  // Public tracking token — random base64url string used by the
  // /spara/[token] page so guests can view their order without auth.
  const trackingToken = crypto.randomBytes(24).toString("base64url");

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
          discountAmount,
          shippingAmount,
          taxAmount,
          taxRateBp: CURRENT_VAT_BP,
          totalAmount,
          loyaltyPointsRedeemed: redeemedPoints > 0 ? redeemedPoints : null,
          carrier: "POSTNORD",
          trackingToken,
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
              variantId: r.variantId,
              variantLabel: r.variantLabel,
              productName: r.name,
              productSku: r.sku,
              quantity: r.quantity,
              unitPrice: r.unitPrice,
              totalPrice: r.totalPrice,
              bundleId: r.bundleId,
              bundleSlug: r.bundleSlug,
              bundleName: r.bundleName,
              bundleDiscountPercent: r.bundleDiscountPercent,
            })),
          },
        },
      });
      // Decrement stock — variant stock when the line is variant-scoped,
      // product stock otherwise. We don't decrement parent.stock for variant
      // lines because the parent is a synthetic aggregate when variants exist.
      for (const r of resolved) {
        if (r.decrementVariant && r.variantId) {
          const product = products.find((p) => p.id === r.productId);
          const variant = product?.variants.find((v) => v.id === r.variantId);
          if (variant?.manageStock) {
            await tx.productVariant.update({
              where: { id: r.variantId },
              data: { stock: { decrement: r.quantity } },
            });
          }
        } else {
          const product = products.find((p) => p.id === r.productId);
          if (product?.manageStock) {
            await tx.product.update({
              where: { id: product.id },
              data: { stock: { decrement: r.quantity } },
            });
          }
        }
      }
    });
  } catch (err) {
    console.error("placeOrder transaction failed:", err);
    return { ok: false, error: "Kunde inte skapa ordern. Försök igen." };
  }

  // Post-create loyalty bookkeeping. Both calls are idempotent so a
  // retry-on-failure is safe. We do these outside the placeOrder
  // transaction deliberately — they don't need atomicity with the
  // order row, and ledger writes have their own internal transaction.
  let createdOrderId: string | null = null;
  if (redeemedPoints > 0 || isStub) {
    try {
      const created = await prisma.order.findUnique({
        where: { orderNumber },
        select: { id: true },
      });
      createdOrderId = created?.id ?? null;
    } catch (err) {
      console.error("[checkout] loyalty post-create lookup failed", err);
    }
  }

  // Burn redemption first (if any). Triggered for both stub and live
  // flows — the customer chose to spend the points at this checkout,
  // not later. Burning before paying matches user intent and avoids
  // a weird "you spent points but the order is unpaid" state.
  if (createdOrderId && userId && redeemedPoints > 0) {
    try {
      const { redeemPointsForOrder } = await import("@/lib/loyalty/burn");
      await redeemPointsForOrder({
        orderId: createdOrderId,
        userId,
        points: redeemedPoints,
      });
    } catch (err) {
      console.error("[checkout] loyalty burn failed", err);
    }
  }

  // Stub-checkout writes the order as PAID directly, so we miss the
  // webhook code path that awards loyalty points for the real flow.
  // Award here for the stub.
  if (createdOrderId && isStub) {
    try {
      const { awardOrderPoints } = await import("@/lib/loyalty/earn");
      await awardOrderPoints(createdOrderId);
    } catch (err) {
      console.error("[checkout] stub loyalty award failed", err);
    }
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
        trackingToken,
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

  // Suppress any open abandoned-cart snapshots for this email — the
  // customer just completed checkout, no point chasing them.
  try {
    const { markCartRecovered } = await import("@/lib/cart-snapshot/actions");
    await markCartRecovered(input.customer.email);
  } catch (err) {
    console.error("[cart-snapshot] mark-recovered failed:", err);
  }

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
