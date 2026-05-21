/**
 * Subscription renewal cron.
 *
 * For every ACTIVE Subscription with `nextOrderAt <= now`:
 *   1. Build a fresh Order in PENDING state from the current product /
 *      variant prices (not the unitPriceAtCreate snapshot — customers
 *      should always see current pricing on renewal).
 *   2. Apply the subscription's discountPercent to each line.
 *   3. Persist subscriptionId on the new Order so /admin and /konto can
 *      reconstruct the trail.
 *   4. Email the customer "your subscription order is ready" — for v1
 *      they confirm payment via the standard checkout flow next time
 *      they visit. Klarna recurring tokens land later.
 *   5. Advance nextOrderAt by intervalDays + set lastRenewedAt.
 *
 * Auth: Bearer CRON_SECRET (localhost-allowed in dev).
 * Schedule (vercel.json): daily 07:00 UTC.
 * Throughput cap: 100 renewals per invocation, **per tenant** (sub-slice
 * 3b-2 cron tenant seam).
 *
 * Tenant scope rationale: this cron does NOT use `forEachActiveTenant`
 * because each renewal needs its own atomic claim-and-create
 * transaction (the idempotency guard at line ~claim depends on it). A
 * single per-tenant tx that spans all renewals would either lose the
 * per-row atomicity (one bad renewal rolls back the whole tenant's
 * batch) or balloon past the tx timeout under load. Instead we read
 * the ACTIVE tenant list outside any scope (Tenant is the dispatch
 * table — not owned, not banned), then iterate `tenantScope` per
 * subscription. Same isolation, finer granularity.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTransactional } from "@/lib/email/client";
import { orderConfirmationEmail } from "@/lib/email/templates";
import { cronAuthorized } from "@/lib/api/cron-auth";
import { shippingForSubtotal, CURRENT_VAT_BP } from "@/lib/klarna/cart-to-order";
import {
  generateOrderNumber,
  isOrderNumberCollision,
} from "@/lib/orders/order-number";
import { tenantScope } from "@/lib/tenant/db";

/** Thrown inside the renewal txn when a concurrent cron run already
 *  advanced this subscription. Caught + skipped (not an error). */
class AlreadyRenewedError extends Error {}

export const runtime = "nodejs";

const BATCH_LIMIT = 100;

export async function GET(req: Request) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Tenant is the dispatch table — read outside any scope.
  const tenants = await prisma.tenant.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, slug: true },
    orderBy: { slug: "asc" },
  });

  let processed = 0;
  let renewed = 0;
  const errors: { subscriptionId: string; tenant: string; error: string }[] = [];
  const tenantSummary: { ok: number; failed: number; errors: Array<{ tenantId: string; slug: string; error: string }> } = {
    ok: 0,
    failed: 0,
    errors: [],
  };

  for (const tenant of tenants) {
    try {
      // Per-tenant "due" load — read inside a brief tenantScope so RLS
      // filters to this tenant only.
      const due = await tenantScope(tenant.id, (tx) =>
        tx.subscription.findMany({
          where: {
            status: "ACTIVE",
            nextOrderAt: { lte: now },
          },
          orderBy: { nextOrderAt: "asc" },
          take: BATCH_LIMIT,
          include: {
            shippingAddress: true,
            billingAddress: true,
            lines: true,
          },
        })
      );

      for (const sub of due) {
        processed++;

        // Resolve every line at current prices. If any line's product is
        // gone or unpublished, mark the line as skipped (still renew with
        // the remaining lines; if all are gone, cancel the subscription).
        type Resolved = {
          productId: string;
          variantId: string | null;
          variantLabel: string | null;
          sku: string;
          name: string;
          quantity: number;
          unitPrice: number;
          totalPrice: number;
          decrementVariant: boolean;
          manageStock: boolean;
        };
        const resolved: Resolved[] = [];
        // Resolve products inside a brief tenant-scoped read.
        type ResolvedProduct = {
          id: string;
          sku: string;
          name: string;
          price: { toString(): string };
          status: string;
          stock: number;
          manageStock: boolean;
          variants: Array<{
            id: string;
            sku: string;
            label: string;
            price: { toString(): string };
            stock: number;
            manageStock: boolean;
          }>;
        };
        const productMap = await tenantScope(tenant.id, async (tx) => {
          const m = new Map<string, ResolvedProduct | null>();
          for (const line of sub.lines) {
            const p = await tx.product.findUnique({
              where: { id: line.productId },
              select: {
                id: true,
                sku: true,
                name: true,
                price: true,
                status: true,
                stock: true,
                manageStock: true,
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
            m.set(line.productId, p as ResolvedProduct | null);
          }
          return m;
        });

        for (const line of sub.lines) {
          const product = productMap.get(line.productId);
          if (!product || product.status !== "PUBLISHED") continue;
          const variant = line.variantId
            ? product.variants.find((v) => v.id === line.variantId)
            : null;
          if (line.variantId && !variant) continue;

          const listPrice = variant
            ? parseFloat(variant.price.toString())
            : parseFloat(product.price.toString());
          const unitPrice =
            Math.round(listPrice * (1 - sub.discountPercent / 100) * 100) / 100;

          resolved.push({
            productId: product.id,
            variantId: variant?.id ?? null,
            variantLabel: variant?.label ?? null,
            sku: variant?.sku ?? product.sku,
            name: variant ? `${product.name} — ${variant.label}` : product.name,
            quantity: line.quantity,
            unitPrice,
            totalPrice: unitPrice * line.quantity,
            decrementVariant: !!variant,
            manageStock: variant ? variant.manageStock : product.manageStock,
          });
        }

        if (resolved.length === 0) {
          // All lines invalid — cancel the subscription so the cron stops
          // hammering it. Customer can renew manually if they want.
          await tenantScope(tenant.id, (tx) =>
            tx.subscription.update({
              where: { id: sub.id },
              data: {
                status: "CANCELLED",
                cancelledAt: now,
                cancellationReason: "Inga giltiga produkter kvar i prenumerationen",
              },
            })
          );
          continue;
        }

        const subtotal = resolved.reduce((s, l) => s + l.totalPrice, 0);
        const shippingAmount = await shippingForSubtotal(subtotal);
        const totalAmount = subtotal + shippingAmount;
        const taxAmount =
          Math.round(
            ((totalAmount * CURRENT_VAT_BP) / (10000 + CURRENT_VAT_BP)) * 100
          ) / 100;

        let orderNumber = generateOrderNumber("BMX-SUB");
        const nextNext = new Date(now);
        nextNext.setUTCDate(nextNext.getUTCDate() + sub.intervalDays);

        try {
          // `orderNumber` is DB-unique; on the rare suffix collision,
          // regenerate and retry. Non-collision errors (incl. the
          // idempotency AlreadyRenewedError) propagate unchanged.
          for (let attempt = 1; ; attempt++) {
            try {
              await tenantScope(tenant.id, async (tx) => {
                // Idempotency guard: claim this renewal by advancing
                // nextOrderAt conditionally. If a concurrent / retried
                // cron run already advanced it, count === 0 and we
                // abort WITHOUT creating a duplicate order (prevents
                // double-charge on cron retry).
                const claim = await tx.subscription.updateMany({
                  where: {
                    id: sub.id,
                    status: "ACTIVE",
                    nextOrderAt: { lte: now },
                  },
                  data: { nextOrderAt: nextNext, lastRenewedAt: now },
                });
                if (claim.count === 0) {
                  throw new AlreadyRenewedError();
                }
                // NB: a renewal order is created PENDING and unpaid —
                // the customer pays via the standard checkout next
                // visit. Stock is therefore NOT reserved here: an
                // unpaid or later-cancelled renewal has no restock
                // path, so reserving at creation time would
                // permanently leak inventory. Stock is reserved when
                // the order is actually paid
                // (ensureOrderFromKustomOrder, at PAID), exactly like
                // an ad-hoc checkout.
                await tx.order.create({
                  data: {
                    tenantId: tenant.id,
                    orderNumber,
                    subscriptionId: sub.id,
                    userId: sub.userId,
                    email: sub.email,
                    status: "PENDING",
                    paymentProvider: "KLARNA",
                    paymentReference: null,
                    currency: "SEK",
                    subtotal,
                    shippingAmount,
                    taxAmount,
                    taxRateBp: CURRENT_VAT_BP,
                    totalAmount,
                    marketingConsent: false,
                    shippingAddressId: sub.shippingAddressId,
                    billingAddressId: sub.billingAddressId,
                    items: {
                      create: resolved.map((r) => ({
                        tenantId: tenant.id,
                        productId: r.productId,
                        variantId: r.variantId,
                        variantLabel: r.variantLabel,
                        productName: r.name,
                        productSku: r.sku,
                        quantity: r.quantity,
                        unitPrice: r.unitPrice,
                        totalPrice: r.totalPrice,
                      })),
                    },
                  },
                });
              });
              break;
            } catch (txErr) {
              if (isOrderNumberCollision(txErr) && attempt < 5) {
                orderNumber = generateOrderNumber("BMX-SUB");
                continue;
              }
              throw txErr;
            }
          }
          renewed++;

          // Fire-and-forget renewal notification. Best-effort; cron's
          // job is the DB state, not the email. Skipped when the
          // subscription has no shipping address — the template
          // requires one. The customer's /konto page will still
          // surface the renewal.
          if (sub.shippingAddress) {
            const address = sub.shippingAddress;
            void (async () => {
              try {
                const tpl = orderConfirmationEmail({
                  orderNumber,
                  customerFirstName: null,
                  email: sub.email,
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
                    fullName: address.fullName,
                    street: address.street,
                    postalCode: address.postalCode,
                    city: address.city,
                  },
                });
                await sendTransactional({
                  to: { email: sub.email },
                  subject: `Din prenumeration är förnyad · ${orderNumber}`,
                  preheader: tpl.preheader,
                  html: tpl.html,
                  text: tpl.text,
                  category: "subscription-renewal",
                  customId: `sub-renewal:${orderNumber}`,
                });
              } catch (err) {
                console.error(
                  `[subscription-renewals] email failed for ${orderNumber}:`,
                  err
                );
              }
            })();
          }
        } catch (err) {
          if (err instanceof AlreadyRenewedError) {
            // Concurrent/retried run already handled this subscription.
            // Not an error — skip silently.
            continue;
          }
          console.error(`[subscription-renewals] renewal failed for ${sub.id}:`, err);
          errors.push({
            subscriptionId: sub.id,
            tenant: tenant.slug,
            error: (err as Error).message,
          });
        }
      }
      tenantSummary.ok++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      tenantSummary.failed++;
      tenantSummary.errors.push({ tenantId: tenant.id, slug: tenant.slug, error: message });
      console.warn(
        JSON.stringify({
          cronName: "subscription-renewals",
          tenantId: tenant.id,
          slug: tenant.slug,
          error: message,
        })
      );
    }
  }

  return NextResponse.json({
    ok: true,
    tenants: tenantSummary,
    processed,
    renewed,
    errors,
  });
}
