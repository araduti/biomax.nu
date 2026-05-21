"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";
import crypto from "node:crypto";
import {
  createKlarnaOrder,
  updateKustomOrder,
  getKlarnaOrder,
  isKlarnaConfigured,
} from "@/lib/klarna/client";
import {
  buildKlarnaPayload,
  shippingForSubtotal,
  CURRENT_VAT_BP,
} from "@/lib/klarna/cart-to-order";
import type { CheckoutLine, CheckoutDiscount } from "@/lib/klarna/cart-to-order";
import type { KlarnaAddress } from "@/lib/klarna/types";
import { currentTenant } from "@/lib/tenant";
import { tenantScope } from "@/lib/tenant/db";
import { withTenantRLS } from "@/lib/tenant/rls";
import {
  resolvePaymentCredentialsForTenant,
  type ResolvedPaymentCredentials,
} from "@/lib/klarna/credentials";
import { cuidSchema, positiveIntSchema, fail } from "@/lib/validation/shared";
import {
  resolveSubscriptionTarget,
  finalizePaidSubscription,
  type SubscriptionIntent,
} from "@/lib/subscriptions/actions";

/**
 * ADR 0020 — create a Kustom (formerly Klarna) checkout session and
 * return its `html_snippet` for the client to mount. Kustom collects
 * the customer, address, and PostNord service-point selection inside
 * its own iframe, so this action only needs the cart.
 *
 * Trust boundary: cart prices come from localStorage and are NOT
 * trusted. We re-fetch products by id and let `buildKlarnaPayload`
 * recompute totals from authoritative DB prices before the Kustom
 * call.
 *
 * Scope: products + 2-variant SKUs (the common path). Bundle discounts
 * and Familjen Biomax point redemption are intentionally NOT handled
 * here yet — they ride along once Kustom-managed shipping is verified
 * end-to-end (ADR 0020 steps 4–5). `placeOrder` remains the only
 * order-creating action; this one creates no Order row.
 */

const CartSchema = z
  .array(
    z.object({
      productId: cuidSchema,
      variantId: cuidSchema.nullable().optional(),
      quantity: positiveIntSchema(99),
    })
  )
  .min(1, "Varukorgen är tom.")
  .max(50, "För många rader i varukorgen.");

export type CreateKustomCheckoutResult =
  | { ok: true; htmlSnippet: string; orderId: string }
  | { ok: false; error: string };

export type UpdateKustomCheckoutResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Shared: validate cart + loyalty (server is the trust boundary) and
 * build the Kustom order payload. Used by both create and the
 * suspend→update→resume path so the two never diverge.
 */
async function buildValidatedPayload(
  rawCart: unknown,
  rawLoyaltyPoints: unknown
): Promise<
  | {
      ok: true;
      payload: Awaited<ReturnType<typeof buildKlarnaPayload>>;
      creds: ResolvedPaymentCredentials;
    }
  | { ok: false; error: string }
> {
  // Resolve the acting tenant (Host → currentTenant, ADR 0028 D3) and
  // its payment credentials (ADR 0034 D4: per-tenant store, env
  // fallback for tenant zero). The tenant id is stamped into
  // merchant_data so the Host-less push webhook can recover it
  // (ADR 0034 D5).
  const tenant = await currentTenant();
  const creds = await resolvePaymentCredentialsForTenant(tenant.id);
  const parsed = CartSchema.safeParse(rawCart);
  if (!parsed.success) {
    const f = fail(parsed.error);
    return { ok: false, error: f.error };
  }
  const cart = parsed.data;

  const productIds = [...new Set(cart.map((l) => l.productId))];
  // Owned-model read (storefront → Host tenant already resolved above).
  // Route through the seam (ADR 0032 D2).
  const products = await tenantScope(tenant.id, (tx) =>
    tx.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        slug: true,
        sku: true,
        name: true,
        price: true,
        status: true,
        imageUrl: true,
        variants: { select: { id: true, sku: true, price: true } },
      },
    })
  );

  const lines: CheckoutLine[] = [];
  for (const item of cart) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) return { ok: false, error: "Produkten finns inte längre." };
    if (product.status !== "PUBLISHED") {
      return {
        ok: false,
        error: `Produkten "${product.name}" är inte tillgänglig.`,
      };
    }
    const hasVariants = product.variants.length >= 2;
    const variant =
      hasVariants && item.variantId
        ? product.variants.find((v) => v.id === item.variantId)
        : null;
    if (hasVariants && !variant) {
      return { ok: false, error: `Välj en variant för "${product.name}".` };
    }
    lines.push({
      productId: product.id,
      slug: product.slug,
      sku: variant?.sku ?? product.sku,
      name: product.name,
      imageUrl: product.imageUrl ?? "",
      price: variant?.price ?? product.price,
      quantity: item.quantity,
    });
  }

  // Kustom validates `merchant_urls.push` strictly: it must be a
  // public HTTPS URL (http / localhost → 400 "Bad value: push"). In
  // local dev point KUSTOM_MERCHANT_BASE_URL at an HTTPS tunnel
  // (ngrok/cloudflared) — kept separate from BETTER_AUTH_URL so auth
  // callbacks keep using localhost.
  const baseURL =
    process.env.KUSTOM_MERCHANT_BASE_URL ??
    process.env.BETTER_AUTH_URL ??
    "http://localhost:3000";

  // ── Loyalty redemption (server is the trust boundary) ──────
  // Mirrors placeOrder's validation. Guests / no account → ignored.
  // The validated point count + userId ride along in merchant_data
  // so the confirmation/webhook can burn them and record the
  // discount (Kustom echoes merchant_data back on read-order).
  const user = await currentUser();
  const requestedPoints = Number(rawLoyaltyPoints);
  let discount: CheckoutDiscount | null = null;
  // merchant_data always carries the tenant marker `t` (ADR 0034 D5);
  // loyalty `uid`/`lp` are merged in when a redemption is validated.
  const merchantData: { t: string; uid?: string; lp?: number } = {
    t: tenant.id,
  };
  if (
    user?.id &&
    Number.isFinite(requestedPoints) &&
    requestedPoints > 0
  ) {
    const subtotalKr = lines.reduce(
      (s, l) => s + parseFloat(String(l.price)) * l.quantity,
      0
    );
    const { validateRedemption, redemptionErrorMessage } = await import(
      "@/lib/loyalty/burn"
    );
    const { getAccountBalance } = await import("@/lib/loyalty/account");
    const account = await getAccountBalance(user.id);
    if (!account) {
      return { ok: false, error: redemptionErrorMessage("no-account") };
    }
    const v = validateRedemption({
      pointsRequested: Math.floor(requestedPoints),
      balance: account.balance,
      subtotalOre: Math.round(subtotalKr * 100),
    });
    if (!v.ok) {
      return { ok: false, error: redemptionErrorMessage(v.reason) };
    }
    discount = {
      amountKr: v.oreDiscount / 100,
      label: "Familjen Biomax-poäng",
      reference: "LOYALTY",
    };
    merchantData.uid = user.id;
    merchantData.lp = v.points;
  }

  const billingAddress = await prefillAddress();
  const payload = await buildKlarnaPayload(
    lines,
    baseURL,
    discount,
    billingAddress,
    creds.webhookSecret
  );
  payload.merchant_data = JSON.stringify(merchantData);

  return { ok: true, payload, creds };
}

/**
 * Create a fresh Kustom checkout session (initial page load).
 * Returns the html_snippet to mount AND the order_id — the client
 * keeps the id so subsequent loyalty changes go through
 * updateKustomCheckout (suspend→update→resume) instead of recreating.
 */
export async function createKustomCheckout(
  rawCart: unknown,
  rawLoyaltyPoints?: unknown
): Promise<CreateKustomCheckoutResult> {
  const built = await buildValidatedPayload(rawCart, rawLoyaltyPoints);
  if (!built.ok) return built;
  try {
    const order = await createKlarnaOrder(built.payload, built.creds);
    if (!order.html_snippet || !order.order_id) {
      return {
        ok: false,
        error: "Kustom returnerade ingen checkout (saknar html_snippet).",
      };
    }
    return {
      ok: true,
      htmlSnippet: order.html_snippet,
      orderId: order.order_id,
    };
  } catch (err) {
    return {
      ok: false,
      error: `Kunde inte starta Kustom-kassan: ${
        err instanceof Error ? err.message : "okänt fel"
      }`,
    };
  }
}

/**
 * Update an existing Kustom order in place (loyalty points changed).
 * The client suspends the iframe, calls this, then resumes — Kustom
 * refreshes the order data without a teardown/reload. We re-validate
 * cart + loyalty server-side every time (never trust the client) and
 * PATCH the same order_id. Kustom ignores the addresses once the
 * customer has entered them and recomputes totals; KSA shipping is
 * preserved (we don't send a shipping_fee line).
 */
export async function updateKustomCheckout(
  rawCart: unknown,
  rawLoyaltyPoints: unknown,
  orderId: string
): Promise<UpdateKustomCheckoutResult> {
  if (!orderId || typeof orderId !== "string") {
    return { ok: false, error: "Saknar Kustom order-id." };
  }
  const built = await buildValidatedPayload(rawCart, rawLoyaltyPoints);
  if (!built.ok) return built;
  try {
    await updateKustomOrder(orderId, built.payload, built.creds);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: `Kunde inte uppdatera kassan: ${
        err instanceof Error ? err.message : "okänt fel"
      }`,
    };
  }
}

/**
 * Read the customer-selected shipping back from Kustom. Under our KSA
 * model we never send a shipping_fee order line, so `order_amount` is
 * products-only — the chosen delivery lives in
 * `selected_shipping_option.price`. We return ONLY the shipping (kr);
 * the client computes Totalt = subtotal − rabatt + shipping so the
 * total updates instantly on qty/points (shipping changes rarely, and
 * only via an in-iframe pick → a change event re-reads this).
 * shippingKr null = not chosen yet → panel shows "räknas i kassan".
 */
export type ReadTotalsResult =
  | { ok: true; shippingKr: number | null }
  | { ok: false };

export async function readKustomOrderTotals(
  orderId: string
): Promise<ReadTotalsResult> {
  if (!orderId || orderId.startsWith("stub")) return { ok: false };
  try {
    const order = await getKlarnaOrder(orderId);
    const sel = order.selected_shipping_option;
    if (!sel || sel.price == null) {
      return { ok: true, shippingKr: null };
    }
    const ore = Number(sel.price);
    if (!Number.isFinite(ore) || ore < 0) {
      return { ok: true, shippingKr: null };
    }
    return { ok: true, shippingKr: ore / 100 };
  } catch {
    return { ok: false };
  }
}

/**
 * Start the first-delivery checkout for a new subscription.
 *
 * The subscription itself is NOT created here — it's created by
 * `finalizePaidSubscription` once this first payment settles (in
 * `ensureOrderFromKustomOrder`). The 10 % subscription discount is
 * passed as an explicit Kustom discount line so the customer sees it
 * on the payment screen, and the subscription intent rides in
 * `merchant_data` so the confirmation/webhook path can reconstruct it.
 *
 * Stub mode (no Klarna creds — local dev): there is no iframe, so we
 * mirror the one-time stub-checkout fallback: create a stub-PAID first
 * Order + the subscription directly and return a redirect to the
 * confirmation page. This keeps dev usable while still going through
 * an explicit "paid first delivery" — never a free subscription.
 */
export type StartSubscriptionCheckoutResult =
  | { ok: true; mode: "kustom"; htmlSnippet: string; orderId: string }
  | { ok: true; mode: "stub"; redirect: string }
  | { ok: false; error: string };

function generateSubOrderNumber(): string {
  const now = new Date();
  const yyyymmdd =
    now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, "0") +
    now.getDate().toString().padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `BMX-SUB-${yyyymmdd}-${rand}`;
}

export async function startSubscriptionCheckout(
  raw: unknown
): Promise<StartSubscriptionCheckoutResult> {
  const user = await currentUser();
  if (!user) {
    return { ok: false, error: "Du måste vara inloggad för att prenumerera." };
  }

  const resolved = await resolveSubscriptionTarget(raw);
  if (!resolved.ok) return { ok: false, error: resolved.error };
  const t = resolved.target;

  // Per-tenant credentials (ADR 0034). Drives stub-vs-real for this
  // tenant and is threaded into the Kustom call + push URL.
  const tenant = await currentTenant();
  const creds = await resolvePaymentCredentialsForTenant(tenant.id);

  const intent: SubscriptionIntent = {
    pid: t.productId,
    vid: t.variantId,
    q: t.quantity,
    iv: t.intervalDays,
    dp: t.discountPercent,
    up: t.listUnitPrice,
  };

  const lineSubtotal = t.listUnitPrice * t.quantity;
  const discountKr =
    Math.round(lineSubtotal * (t.discountPercent / 100) * 100) / 100;

  // ── Stub mode: no iframe. Create stub-PAID first order + sub. ──
  if (!isKlarnaConfigured(creds)) {
    const shippingAmount = await shippingForSubtotal(lineSubtotal);
    const subtotal = lineSubtotal - discountKr;
    const totalAmount = subtotal + shippingAmount;
    const taxAmount =
      Math.round(
        ((totalAmount * CURRENT_VAT_BP) / (10000 + CURRENT_VAT_BP)) * 100
      ) / 100;
    const orderNumber = generateSubOrderNumber();
    const trackingToken = crypto.randomBytes(24).toString("base64url");
    const lastAddress = await tenantScope(tenant.id, (tx) =>
      tx.address.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      })
    );
    const unitPrice =
      Math.round(t.listUnitPrice * (1 - t.discountPercent / 100) * 100) / 100;

    try {
      // ADR 0032 D7: same stub-PAID first-order + subscription write,
      // now the inner body of withTenantRLS (the storefront tenant is
      // resolved above). Mirrors placeOrder's stub path; every owned
      // create stamped tenantId for WITH-CHECK readiness.
      await withTenantRLS(tenant.id, async (tx) => {
        const order = await tx.order.create({
          data: {
            orderNumber,
            userId: user.id,
            email: user.email,
            status: "PAID",
            paymentProvider: "KLARNA",
            paymentReference: `stub-${orderNumber}`,
            currency: "SEK",
            subtotal,
            discountAmount: discountKr,
            shippingAmount,
            taxAmount,
            taxRateBp: CURRENT_VAT_BP,
            totalAmount,
            carrier: "POSTNORD",
            trackingToken,
            marketingConsent: false,
            shippingAddressId: lastAddress?.id ?? null,
            billingAddressId: lastAddress?.id ?? null,
            legacySource: null,
            tenantId: tenant.id,
            items: {
              create: [
                {
                  productId: t.productId,
                  variantId: t.variantId,
                  variantLabel: null,
                  productName: t.productName,
                  productSku: t.variantSku ?? t.productSku,
                  quantity: t.quantity,
                  unitPrice,
                  totalPrice: unitPrice * t.quantity,
                  tenantId: tenant.id,
                },
              ],
            },
          },
        });
        await finalizePaidSubscription(tx, {
          intent,
          userId: user.id,
          email: user.email,
          firstOrderId: order.id,
          shippingAddressId: lastAddress?.id ?? null,
          billingAddressId: lastAddress?.id ?? null,
          tenantId: tenant.id,
        });
      });
    } catch (err) {
      console.error("startSubscriptionCheckout (stub) failed:", err);
      return { ok: false, error: "Kunde inte skapa prenumerationen." };
    }

    try {
      const created = await tenantScope(tenant.id, (tx) =>
        tx.order.findFirst({
          where: { orderNumber },
          select: { id: true },
        })
      );
      if (created) {
        const { awardOrderPoints } = await import("@/lib/loyalty/earn");
        await awardOrderPoints(created.id);
      }
    } catch (err) {
      console.error("[subscription] stub loyalty award failed", err);
    }

    return {
      ok: true,
      mode: "stub",
      redirect: `/checkout/bekraftelse?order=${orderNumber}`,
    };
  }

  // ── Real Kustom flow: single-line session + discount line. ──
  const baseURL =
    process.env.KUSTOM_MERCHANT_BASE_URL ??
    process.env.BETTER_AUTH_URL ??
    "http://localhost:3000";

  const lines: CheckoutLine[] = [
    {
      productId: t.productId,
      slug: "",
      sku: t.variantSku ?? t.productSku,
      name: t.productName,
      imageUrl: "",
      price: t.listUnitPrice,
      quantity: t.quantity,
    },
  ];
  const discount: CheckoutDiscount = {
    amountKr: discountKr,
    label: `Prenumerationsrabatt −${t.discountPercent} %`,
    reference: "SUBSCRIPTION",
  };

  const billingAddress = await prefillAddress();
  const payload = await buildKlarnaPayload(
    lines,
    baseURL,
    discount,
    billingAddress,
    creds.webhookSecret
  );
  // merchant_data carries the tenant marker `t` (ADR 0034 D5)
  // alongside the subscription intent.
  payload.merchant_data = JSON.stringify({
    t: tenant.id,
    uid: user.id,
    sub: intent,
  });

  try {
    const order = await createKlarnaOrder(payload, creds);
    if (!order.html_snippet || !order.order_id) {
      return {
        ok: false,
        error: "Kustom returnerade ingen checkout (saknar html_snippet).",
      };
    }
    return {
      ok: true,
      mode: "kustom",
      htmlSnippet: order.html_snippet,
      orderId: order.order_id,
    };
  } catch (err) {
    return {
      ok: false,
      error: `Kunde inte starta kassan: ${
        err instanceof Error ? err.message : "okänt fel"
      }`,
    };
  }
}

/**
 * Build a Kustom `billing_address` pre-fill for the logged-in
 * customer from their account + most-recent saved address. Returns
 * null for guests or accounts without a usable address — Kustom then
 * collects everything in the iframe as normal. Values are a
 * convenience pre-fill only; the customer can still edit them.
 */
async function prefillAddress(): Promise<KlarnaAddress | null> {
  const sessionUser = await currentUser();
  if (!sessionUser?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      addresses: {
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: {
          fullName: true,
          street: true,
          postalCode: true,
          city: true,
          countryCode: true,
          phone: true,
        },
      },
    },
  });
  if (!user) return null;

  const addr = user.addresses[0] ?? null;

  // Fall back to splitting the saved fullName when the account has no
  // structured first/last name.
  let given = user.firstName ?? "";
  let family = user.lastName ?? "";
  if ((!given || !family) && addr?.fullName) {
    const parts = addr.fullName.trim().split(/\s+/);
    if (!given) given = parts.slice(0, -1).join(" ") || parts[0] || "";
    if (!family && parts.length > 1) family = parts[parts.length - 1];
  }

  const prefill: KlarnaAddress = {
    email: user.email,
    ...(given ? { given_name: given } : {}),
    ...(family ? { family_name: family } : {}),
    ...(addr
      ? {
          street_address: addr.street,
          postal_code: addr.postalCode,
          city: addr.city,
          // ISO-3166 alpha-2, UPPERCASE — matches Kustom's API
          // examples and the KSA "Markets" config (SE). Lowercase can
          // make KSA fail to match the market → TMS returns nothing
          // and only the static fallback option shows.
          country: (addr.countryCode || "SE").toUpperCase(),
        }
      : {}),
    ...(addr?.phone || user.phone
      ? { phone: addr?.phone ?? user.phone ?? undefined }
      : {}),
  };

  // Email alone isn't worth a billing_address block — only pre-fill
  // when we actually have a name or a postal address.
  if (!prefill.given_name && !prefill.street_address) return null;
  return prefill;
}
