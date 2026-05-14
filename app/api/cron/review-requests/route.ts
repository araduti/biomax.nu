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
 * Throughput cap: 100 orders per invocation. Cron is daily, so this
 * absorbs ~3000 orders/month before we'd need to chunk further.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTransactional } from "@/lib/email/client";
import { reviewRequestEmail } from "@/lib/email/templates";
import { cronAuthorized } from "@/lib/api/cron-auth";

export const runtime = "nodejs";

const BATCH_LIMIT = 100;
const LOOKBACK_DAYS = 14;

export async function GET(req: Request) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - LOOKBACK_DAYS);

  const candidates = await prisma.order.findMany({
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

  let sent = 0;
  let skipped = 0;
  const errors: { orderNumber: string; error: string }[] = [];

  for (const o of candidates) {
    // Filter to currently-existing, publicly-visible products so the
    // review CTA actually has a destination. Skip the order outright if
    // every line item maps to a deleted/archived product.
    const items = o.items
      .filter((i) => i.product && i.product.status === "PUBLISHED")
      .map((i) => ({
        productName: i.productName,
        productSlug: i.product!.slug,
      }));

    if (items.length === 0) {
      // Mark sent anyway so we don't keep re-scanning a dead order forever.
      await prisma.order.update({
        where: { id: o.id },
        data: { reviewRequestSentAt: new Date() },
      });
      skipped++;
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
      errors.push({ orderNumber: o.orderNumber, error: result.error });
      // Don't mark sent on failure — let the next run retry. After a few
      // consecutive failures the email address is probably bad; we accept
      // the noise rather than silently dropping the prompt.
      continue;
    }

    await prisma.order.update({
      where: { id: o.id },
      data: { reviewRequestSentAt: new Date() },
    });
    sent++;
  }

  return NextResponse.json({
    ok: true,
    candidates: candidates.length,
    sent,
    skipped,
    errors,
  });
}
