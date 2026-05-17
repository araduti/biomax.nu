"use server";

import crypto from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";
import { isKlarnaConfigured } from "@/lib/klarna/client";
import { isKustomOrderComplete } from "@/lib/klarna/types";
import type { KlarnaOrder } from "@/lib/klarna/types";
import { fetchOrderLabel } from "@/lib/postnord/booking";
import {
  generateOrderNumber,
  isOrderNumberCollision,
} from "@/lib/orders/order-number";
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
import {
  reserveStock,
  InsufficientStockError,
  type StockReservation,
} from "@/lib/checkout/stock";
import {
  finalizePaidSubscription,
  type SubscriptionIntent,
} from "@/lib/subscriptions/actions";

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
  let orderNumber = generateOrderNumber();
  const isStub = !isKlarnaConfigured();
  const fullName =
    `${input.customer.firstName} ${input.customer.lastName}`.trim();
  // Public tracking token — random base64url string used by the
  // /spara/[token] page so guests can view their order without auth.
  const trackingToken = crypto.randomBytes(24).toString("base64url");

  // `orderNumber` has a DB unique constraint; its 4-digit suffix can
  // rarely collide. Regenerate and retry rather than fail a buyer who
  // did nothing wrong.
  for (let attempt = 1; ; attempt++) {
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
      // Atomically reserve stock. variant stock when the line is
      // variant-scoped, product stock otherwise (parent.stock is a
      // synthetic aggregate when variants exist). The conditional
      // decrement in reserveStock() is the real oversell guard — the
      // earlier `stock < qty` check is advisory under concurrency.
      const reservations: StockReservation[] = resolved.map((r) => {
        const product = products.find((p) => p.id === r.productId);
        if (r.decrementVariant && r.variantId) {
          const variant = product?.variants.find((v) => v.id === r.variantId);
          return {
            kind: "variant",
            id: r.variantId,
            quantity: r.quantity,
            manageStock: variant?.manageStock ?? false,
            label: r.name,
          };
        }
        return {
          kind: "product",
          id: r.productId,
          quantity: r.quantity,
          manageStock: product?.manageStock ?? false,
          label: r.name,
        };
      });
      await reserveStock(tx, reservations);
    });
    break;
  } catch (err) {
    if (isOrderNumberCollision(err) && attempt < 5) {
      orderNumber = generateOrderNumber();
      continue;
    }
    if (err instanceof InsufficientStockError) {
      return { ok: false, error: err.message };
    }
    console.error("placeOrder transaction failed:", err);
    return { ok: false, error: "Kunde inte skapa ordern. Försök igen." };
  }
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

/**
 * ADR 0020 step 4 — create our Order row from a completed Kustom
 * order, idempotently. The confirmation page calls this after reading
 * the order back from Kustom; the push webhook then just transitions
 * status (it keys on the same `paymentReference`).
 *
 * Idempotency: keyed on `paymentReference = kustom order_id`. A second
 * call (page refresh, webhook race, Kustom retry) returns the existing
 * orderNumber without creating a duplicate.
 *
 * Trust: the Kustom order was built by us from authoritative DB prices
 * (createKustomCheckout), and payment is already authorised, so we
 * persist Kustom's amounts. Lines are mapped back to products by the
 * SKU we put in `reference`. Fields are read defensively — Kustom has
 * shipped casing/shape variants (cf. lib/postnord/booking.ts).
 */
export async function ensureOrderFromKustomOrder(
  k: KlarnaOrder
): Promise<
  | { ok: true; orderNumber: string; created: boolean }
  | { ok: false; error: string }
> {
  const paymentReference = k.order_id;
  if (!paymentReference) {
    return { ok: false, error: "Kustom-ordern saknar order_id." };
  }

  const existing = await prisma.order.findFirst({
    where: { paymentReference },
    select: { orderNumber: true },
  });
  if (existing) {
    return { ok: true, orderNumber: existing.orderNumber, created: false };
  }

  if (!isKustomOrderComplete(k.status)) {
    return {
      ok: false,
      error: `Kustom-ordern är inte slutförd (status: ${k.status}).`,
    };
  }

  const physical = (k.order_lines ?? []).filter(
    (l) => l.type === "physical"
  );
  if (physical.length === 0) {
    return { ok: false, error: "Kustom-ordern saknar produktrader." };
  }

  // Map lines back to products by the SKU we set in `reference`
  // (product SKU or variant SKU).
  const skus = [...new Set(physical.map((l) => l.reference).filter(Boolean))];
  const products = await prisma.product.findMany({
    where: {
      OR: [{ sku: { in: skus } }, { variants: { some: { sku: { in: skus } } } }],
    },
    select: {
      id: true,
      sku: true,
      name: true,
      manageStock: true,
      variants: { select: { id: true, sku: true, label: true, manageStock: true } },
    },
  });

  type ResolvedLine = {
    productId: string;
    variantId: string | null;
    variantLabel: string | null;
    productName: string;
    productSku: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    decrementVariant: boolean;
    manageStock: boolean;
  };
  const resolved: ResolvedLine[] = [];
  for (const line of physical) {
    const product = products.find(
      (p) =>
        p.sku === line.reference ||
        p.variants.some((v) => v.sku === line.reference)
    );
    if (!product) {
      // Should not happen — we authored `reference`. Fail loudly so a
      // mis-mapped paid order is investigated, not silently half-saved.
      return {
        ok: false,
        error: `Okänd produkt i Kustom-ordern (SKU ${line.reference}).`,
      };
    }
    const variant = product.variants.find((v) => v.sku === line.reference);
    resolved.push({
      productId: product.id,
      variantId: variant?.id ?? null,
      variantLabel: variant?.label ?? null,
      productName: line.name || product.name,
      productSku: line.reference,
      quantity: line.quantity,
      unitPrice: line.unit_price / 100,
      totalPrice: line.total_amount / 100,
      decrementVariant: Boolean(variant),
      manageStock: variant ? variant.manageStock : product.manageStock,
    });
  }

  const addr = k.shipping_address ?? k.billing_address ?? k.customer ?? {};
  const fullName =
    `${addr.given_name ?? ""} ${addr.family_name ?? ""}`.trim() ||
    "Kustomkund";
  const email = (addr.email ?? "").toLowerCase();

  const subtotal = resolved.reduce((s, r) => s + r.totalPrice, 0);
  const sel = k.selected_shipping_option;
  const shippingAmount = sel?.price != null ? sel.price / 100 : 0;

  // Loyalty redemption rides in merchant_data (set in
  // createKustomCheckout after server-side validation). Read it back
  // to record the discount and burn the points. Parse defensively —
  // a malformed value must never break a paid order.
  let redeemedPoints = 0;
  let redeemUserId: string | null = null;
  let subscriptionIntent: SubscriptionIntent | null = null;
  let subscriptionUserId: string | null = null;
  if (k.merchant_data) {
    try {
      const md = JSON.parse(k.merchant_data) as {
        uid?: string;
        lp?: number;
        sub?: SubscriptionIntent;
      };
      if (md && typeof md.lp === "number" && md.lp > 0 && md.uid) {
        redeemedPoints = Math.floor(md.lp);
        redeemUserId = md.uid;
      }
      if (
        md?.sub &&
        typeof md.sub.pid === "string" &&
        (md.sub.iv === 30 || md.sub.iv === 60 || md.sub.iv === 90)
      ) {
        subscriptionIntent = md.sub;
        subscriptionUserId = md.uid ?? null;
      }
    } catch {
      console.warn(
        `[kustom-confirm] unparseable merchant_data on ${paymentReference}`
      );
    }
  }
  const { pointsToKr } = await import("@/lib/loyalty/constants");
  // Subscription first orders carry the recurring discount as a Kustom
  // discount line; record the same amount on our Order so the persisted
  // total matches what the customer actually paid. Loyalty and a
  // subscription discount never co-occur (subscription checkout offers
  // no points), but summing is safe either way.
  const subscriptionDiscount = subscriptionIntent
    ? Math.round(subtotal * (subscriptionIntent.dp / 100) * 100) / 100
    : 0;
  const discountAmount =
    (redeemedPoints > 0 ? pointsToKr(redeemedPoints) : 0) +
    subscriptionDiscount;

  const totalAmount = subtotal - discountAmount + shippingAmount;
  const taxAmount =
    Math.round(
      ((totalAmount * CURRENT_VAT_BP) / (10000 + CURRENT_VAT_BP)) * 100
    ) / 100;

  // Link the order to an account so it shows under "Mina ordrar" and
  // isn't a perpetual guest order. Prefer the redeeming user's id
  // (from merchant_data); otherwise match the Kustom order email to a
  // registered user. No match → genuine guest order.
  let linkedUserId: string | null = redeemUserId ?? subscriptionUserId;
  if (!linkedUserId && email) {
    const u = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    linkedUserId = u?.id ?? null;
  }

  const servicePointId =
    sel?.delivery_details?.pickup_location?.id ?? null;
  const trackingNumber =
    sel?.delivery_details?.tracking_id ??
    sel?.delivery_details?.tracking_number ??
    null;

  const orderNumber = generateOrderNumber();
  const trackingToken = crypto.randomBytes(24).toString("base64url");

  try {
    await prisma.$transaction(async (tx) => {
      const address = await tx.address.create({
        data: {
          userId: linkedUserId,
          fullName,
          street: addr.street_address ?? "",
          postalCode: addr.postal_code ?? "",
          city: addr.city ?? "",
          countryCode: (addr.country ?? "SE").toUpperCase(),
          phone: addr.phone ?? null,
        },
      });
      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: linkedUserId,
          email,
          status: "PAID",
          paymentProvider: "KLARNA",
          paymentReference,
          currency: "SEK",
          subtotal,
          discountAmount,
          shippingAmount,
          taxAmount,
          taxRateBp: CURRENT_VAT_BP,
          totalAmount,
          loyaltyPointsRedeemed:
            redeemedPoints > 0 ? redeemedPoints : null,
          carrier: "POSTNORD",
          trackingToken,
          servicePointId,
          trackingNumber,
          marketingConsent: false,
          shippingAddressId: address.id,
          billingAddressId: address.id,
          legacySource: null,
          items: {
            create: resolved.map((r) => ({
              productId: r.productId,
              variantId: r.variantId,
              variantLabel: r.variantLabel,
              productName: r.productName,
              productSku: r.productSku,
              quantity: r.quantity,
              unitPrice: r.unitPrice,
              totalPrice: r.totalPrice,
            })),
          },
        },
      });
      await reserveStock(
        tx,
        resolved.map<StockReservation>((r) => ({
          kind: r.decrementVariant && r.variantId ? "variant" : "product",
          id: r.decrementVariant && r.variantId ? r.variantId : r.productId,
          quantity: r.quantity,
          manageStock: r.manageStock,
          label: r.productName,
        }))
      );
      // Burn redeemed points INSIDE the order transaction so the
      // discount, the order row and the points debit commit (or roll
      // back) atomically. redeemPointsForOrder is idempotent per order
      // (safe for the dual-path page+webhook) and balance-guarded —
      // two checkout sessions sharing one stale balance snapshot can't
      // both burn (the second one's guarded decrement no-ops and logs
      // for reconciliation rather than driving the account negative).
      if (redeemedPoints > 0 && redeemUserId) {
        const { redeemPointsForOrder } = await import("@/lib/loyalty/burn");
        await redeemPointsForOrder({
          orderId: createdOrder.id,
          userId: redeemUserId,
          points: redeemedPoints,
          tx,
        });
      }
      // First-delivery subscription: create the Subscription + line
      // now that the first payment has settled, inside the same txn so
      // order + subscription commit atomically. Idempotent (keyed on
      // the order id) for the dual-path page+webhook.
      if (subscriptionIntent) {
        await finalizePaidSubscription(tx, {
          intent: subscriptionIntent,
          userId: linkedUserId,
          email,
          firstOrderId: createdOrder.id,
          shippingAddressId: address.id,
          billingAddressId: address.id,
        });
      }
    });
  } catch (err) {
    // Unique constraint on paymentReference → a concurrent call (webhook
    // race / double redirect) created it first. Treat as success.
    const raced = await prisma.order.findFirst({
      where: { paymentReference },
      select: { orderNumber: true },
    });
    if (raced) {
      return { ok: true, orderNumber: raced.orderNumber, created: false };
    }
    if (err instanceof InsufficientStockError) {
      // The customer ALREADY PAID through Kustom but we can't reserve
      // stock. Never silently oversell — fail loudly so ops can manually
      // backorder/refund. paymentReference is logged for reconciliation.
      console.error(
        `[kustom-confirm] CRITICAL: paid order ${paymentReference} could not be persisted — ${err.message}. Manual intervention required (backorder or refund).`
      );
      return { ok: false, error: "Kunde inte spara ordern." };
    }
    console.error("[kustom-confirm] order creation failed:", err);
    return { ok: false, error: "Kunde inte spara ordern." };
  }

  try {
    const created = await prisma.order.findFirst({
      where: { paymentReference },
      select: { id: true },
    });
    if (created) {
      // Points burn now happens inside the order transaction (above).
      // Earn is safe post-commit and idempotent per order.
      const { awardOrderPoints } = await import("@/lib/loyalty/earn");
      await awardOrderPoints(created.id);
    }
  } catch (err) {
    console.error("[kustom-confirm] loyalty award failed", err);
  }

  // Order confirmation email. Only on the freshly-created path (the
  // early `existing`/`raced` returns are created:false), so the
  // dual-path page+webhook can't double-send. Fire-and-forget — a
  // failed email never fails the order; it's logged and the order is
  // in admin to resend. Mirrors the stub flow in placeOrder.
  if (email) {
    void (async () => {
      try {
        const tpl = orderConfirmationEmail({
          orderNumber,
          customerFirstName: addr.given_name ?? null,
          email,
          items: resolved.map((r) => ({
            name: r.productName,
            quantity: r.quantity,
            unitPrice: r.unitPrice.toFixed(2),
            totalPrice: r.totalPrice.toFixed(2),
          })),
          subtotal: subtotal.toFixed(2),
          shipping: shippingAmount.toFixed(2),
          total: totalAmount.toFixed(2),
          shippingAddress: {
            fullName,
            street: addr.street_address ?? "",
            postalCode: addr.postal_code ?? "",
            city: addr.city ?? "",
          },
          trackingToken,
        });
        await sendTransactional({
          to: { email, name: fullName },
          subject: tpl.subject,
          html: tpl.html,
          text: tpl.text,
          preheader: tpl.preheader,
          category: "order-confirmation",
          customId: orderNumber,
        });
      } catch (emailErr) {
        console.error(
          "[kustom-confirm] order confirmation email failed:",
          emailErr
        );
      }
    })();
  } else {
    console.warn(
      `[kustom-confirm] no email on Kustom order ${paymentReference} — confirmation not sent`
    );
  }

  // Pre-fetch the PostNord fraktsedel so it's ready when the warehouse
  // opens the order (ADR 0020 Option C — KSA already booked; we only
  // pull the label by the item id = trackingNumber). Fire-and-forget,
  // env-gated (no POSTNORD_API_KEY → stub no-op). The admin "Skriv ut
  // fraktsedel" button is the manual retry if this misses.
  if (trackingNumber && !trackingNumber.startsWith("STUB-")) {
    void (async () => {
      try {
        const label = await fetchOrderLabel({ orderNumber, trackingNumber });
        if (label.ok && label.labelPdfUrl) {
          await prisma.order.updateMany({
            where: { paymentReference, labelPdfUrl: null },
            data: { labelPdfUrl: label.labelPdfUrl },
          });
        } else if (!label.ok) {
          console.warn(
            `[kustom-confirm] fraktsedel prefetch failed for ${orderNumber}: ${label.error}`
          );
        }
      } catch (err) {
        console.error(
          `[kustom-confirm] fraktsedel prefetch threw for ${orderNumber}:`,
          err
        );
      }
    })();
  }

  return { ok: true, orderNumber, created: true };
}
