/**
 * Daily cron: send "Hur trivs du med ditt köp?"-mejl 14 days after order
 * fulfillment, once per order.
 *
 * Selection rule:
 *   - status = FULFILLED
 *   - reviewRequestSentAt IS NULL
 *   - updatedAt <= now() - 14 days (the moment the FULFILLED flip happened
 *     is the closest signal we have without a dedicated fulfilledAt column)
 *
 * Auth: bearer `CRON_SECRET`. Most cron providers (Vercel Cron, GitHub
 * Actions, EasyCron) support an Authorization header. If `CRON_SECRET` is
 * unset, the route also accepts a request from localhost so dev can hit it
 * with curl. Production should always set the secret.
 *
 * Throughput cap: 100 orders per invocation, **per tenant** (sub-slice
 * 3b-2 cron tenant seam). Cron is daily, so this absorbs ~3000
 * orders/month per tenant before we'd need to chunk further.
 */
import { NextResponse } from "next/server";
import { sendTransactional } from "@/lib/email/client";
import { reviewRequestEmail } from "@/lib/email/templates";
import { cronAuthorized } from "@/lib/api/cron-auth";
import { forEachActiveTenant } from "@/lib/cron/for-each-tenant";

export const runtime = "nodejs";

const BATCH_LIMIT = 100;
const LOOKBACK_DAYS = 14;

export async function GET(req: Request) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - LOOKBACK_DAYS);

  let totalSent = 0;
  let totalSkipped = 0;
  let totalCandidates = 0;
  const mailErrors: { tenant: string; orderNumber: string; error: string }[] = [];

  const summary = await forEachActiveTenant(
    "review-requests",
    async (tx, tenant) => {
      const candidates = await tx.order.findMany({
        where: {
          status: "FULFILLED",
          reviewRequestSentAt: null,
          updatedAt: { lte: cutoff },
        },
        orderBy: { updatedAt: "asc" },
        take: BATCH_LIMIT,
        select: {
          id: true,
          orderNumber: true,
          email: true,
          user: { select: { name: true } },
          items: {
            select: {
              productName: true,
              product: { select: { slug: true, status: true } },
            },
          },
        },
      });

      totalCandidates += candidates.length;

      for (const o of candidates) {
        // Filter to currently-existing, publicly-visible products so the
        // review CTA actually has a destination. Skip the order outright
        // if every line item maps to a deleted/archived product.
        const items = o.items
          .filter((i) => i.product && i.product.status === "PUBLISHED")
          .map((i) => ({
            productName: i.productName,
            productSlug: i.product!.slug,
          }));

        if (items.length === 0) {
          // Mark sent anyway so we don't keep re-scanning a dead order forever.
          await tx.order.update({
            where: { id: o.id },
            data: { reviewRequestSentAt: new Date() },
          });
          totalSkipped++;
          continue;
        }

        const firstName = o.user?.name?.split(/\s+/)[0] ?? null;
        const tpl = reviewRequestEmail({
          customerFirstName: firstName,
          orderNumber: o.orderNumber,
          items,
        });

        const result = await sendTransactional({
          to: { email: o.email, name: o.user?.name ?? undefined },
          subject: tpl.subject,
          preheader: tpl.preheader,
          html: tpl.html,
          text: tpl.text,
          category: "review-request",
          customId: `review-request:${o.orderNumber}`,
        });

        if (!result.ok) {
          mailErrors.push({ tenant: tenant.slug, orderNumber: o.orderNumber, error: result.error });
          // Don't mark sent on failure — let the next run retry. After a
          // few consecutive failures the email address is probably bad;
          // we accept the noise rather than silently dropping the prompt.
          continue;
        }

        await tx.order.update({
          where: { id: o.id },
          data: { reviewRequestSentAt: new Date() },
        });
        totalSent++;
      }
    },
    { txTimeoutMs: 120_000 }
  );

  return NextResponse.json({
    ok: true,
    tenants: summary,
    candidates: totalCandidates,
    sent: totalSent,
    skipped: totalSkipped,
    errors: mailErrors,
  });
}
