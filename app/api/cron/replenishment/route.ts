/**
 * Replenishment cron — sends "Din X tar snart slut" reminders ~7 days
 * before estimated run-out.
 *
 * Heuristic: for each FULFILLED OrderItem we infer supply duration in
 * days from the product name's count suffix ("60 kapslar" → 60 days,
 * "90 tuggtabletter" → 30 days assuming the standard 3-per-day dose).
 * Trigger when (now - fulfilledAt) is within ±3 days of (supplyDays - 7).
 *
 * Schedule (vercel.json): daily 08:00 UTC.
 * Auth: Bearer CRON_SECRET.
 * Throughput: 200 reminders per invocation.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTransactional } from "@/lib/email/client";
import { replenishmentReminderEmail } from "@/lib/email/templates";
import { cronAuthorized } from "@/lib/api/cron-auth";

export const runtime = "nodejs";

const BATCH = 200;
const LEAD_DAYS = 7;
const WINDOW_DAYS = 3;

/**
 * Best-effort supply-duration estimate from a product name.
 *   "60 kapslar"        → 60 days  (1/day default)
 *   "90 tuggtabletter"  → 30 days  (3/day, classic DGL pattern)
 *   "100 kapslar"       → 100 days
 *   "254 g"             → 60 days  (powders rough estimate)
 * Returns null when we can't infer — those OrderItems are skipped.
 */
function estimateSupplyDays(productName: string, quantity: number): number | null {
  const lower = productName.toLowerCase();
  // Match "<digits> <unit>" — kapslar, tabletter, tuggtabletter, g, ml.
  const m = lower.match(/(\d{2,4})\s*(kapslar|kaps|tuggtabletter|tabletter|g|ml)\b/);
  if (!m) return null;
  const count = parseInt(m[1], 10);
  const unit = m[2];
  if (!Number.isFinite(count)) return null;

  let days: number;
  if (unit === "tuggtabletter") {
    days = count / 3; // typical 2-before-each-meal × ~3 meals = 6/day, but
                      // most DGL is 2 before main meal only → 2/day. Split
                      // the difference at 3/day.
  } else if (unit === "g" || unit === "ml") {
    days = 60; // generic powder/liquid placeholder
  } else {
    days = count; // kapslar / tabletter — assume 1/day default
  }
  return Math.round(days * quantity);
}

export async function GET(req: Request) {
  if (!cronAuthorized(req))
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const now = new Date();

  // Pre-fetch unsubscribed emails for suppression.
  const unsubRows = await prisma.newsletterSubscriber.findMany({
    where: { unsubscribedAt: { not: null } },
    select: { email: true },
  });
  const unsubSet = new Set(unsubRows.map((r) => r.email.toLowerCase()));

  // Candidate window: FULFILLED orders 14–120 days old (covers
  // [supplyDays - 7 ± 3] for typical 21-day to 113-day supply ranges).
  const minAge = new Date(now);
  minAge.setUTCDate(minAge.getUTCDate() - 120);
  const maxAge = new Date(now);
  maxAge.setUTCDate(maxAge.getUTCDate() - 14);

  const candidates = await prisma.orderItem.findMany({
    where: {
      replenishmentSentAt: null,
      order: {
        status: "FULFILLED",
        updatedAt: { gte: minAge, lte: maxAge },
      },
      productId: { not: null },
      product: { status: "PUBLISHED" },
    },
    take: BATCH * 4, // over-fetch; the per-item time-window filter is in JS
    select: {
      id: true,
      productName: true,
      quantity: true,
      order: {
        select: {
          email: true,
          updatedAt: true,
          user: { select: { name: true } },
        },
      },
      product: { select: { slug: true, name: true } },
    },
  });

  let sent = 0;
  const errors: { email: string; error: string }[] = [];
  let evaluated = 0;

  for (const ci of candidates) {
    if (sent >= BATCH) break;
    if (!ci.product) continue;
    if (unsubSet.has(ci.order.email.toLowerCase())) continue;

    evaluated++;
    const supplyDays = estimateSupplyDays(ci.productName, ci.quantity);
    if (supplyDays === null) continue;

    const fulfilledAt = ci.order.updatedAt;
    const elapsed = Math.floor(
      (now.getTime() - fulfilledAt.getTime()) / (24 * 3600 * 1000)
    );
    const reminderAt = supplyDays - LEAD_DAYS;
    if (Math.abs(elapsed - reminderAt) > WINDOW_DAYS) continue;

    const daysRemaining = Math.max(1, supplyDays - elapsed);
    const firstName = ci.order.user?.name?.split(/\s+/)[0] ?? null;

    const tpl = replenishmentReminderEmail({
      customerFirstName: firstName,
      product: { name: ci.product.name, slug: ci.product.slug },
      daysRemaining,
    });

    const r = await sendTransactional({
      to: { email: ci.order.email, name: ci.order.user?.name ?? undefined },
      subject: tpl.subject,
      preheader: tpl.preheader,
      html: tpl.html,
      text: tpl.text,
      category: "replenishment",
      customId: `replenishment:${ci.id}`,
    });
    if (!r.ok) {
      errors.push({ email: ci.order.email, error: r.error });
      continue;
    }
    await prisma.orderItem.update({
      where: { id: ci.id },
      data: { replenishmentSentAt: now },
    });
    sent++;
  }

  return NextResponse.json({
    ok: true,
    candidates: candidates.length,
    evaluated,
    sent,
    errors,
  });
}
