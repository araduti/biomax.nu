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
 * Throughput: 200 reminders per invocation, **per tenant** (sub-slice
 * 3b-2 cron tenant seam).
 */
import { NextResponse } from "next/server";
import { sendTransactional } from "@/lib/email/client";
import { replenishmentReminderEmail } from "@/lib/email/templates";
import { cronAuthorized } from "@/lib/api/cron-auth";
import { forEachActiveTenant } from "@/lib/cron/for-each-tenant";

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
    days = count / 3;
  } else if (unit === "g" || unit === "ml") {
    days = 60;
  } else {
    days = count;
  }
  return Math.round(days * quantity);
}

export async function GET(req: Request) {
  if (!cronAuthorized(req))
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const now = new Date();
  let totalSent = 0;
  let totalCandidates = 0;
  let totalEvaluated = 0;
  const mailErrors: { tenant: string; email: string; error: string }[] = [];

  const summary = await forEachActiveTenant(
    "replenishment",
    async (tx, tenant) => {
      // Pre-fetch unsubscribed emails for suppression — per tenant.
      const unsubRows = await tx.newsletterSubscriber.findMany({
        where: { unsubscribedAt: { not: null } },
        select: { email: true },
      });
      const unsubSet = new Set(unsubRows.map((r) => r.email.toLowerCase()));

      // Candidate window: FULFILLED orders 14–120 days old.
      const minAge = new Date(now);
      minAge.setUTCDate(minAge.getUTCDate() - 120);
      const maxAge = new Date(now);
      maxAge.setUTCDate(maxAge.getUTCDate() - 14);

      const candidates = await tx.orderItem.findMany({
        where: {
          replenishmentSentAt: null,
          order: {
            status: "FULFILLED",
            updatedAt: { gte: minAge, lte: maxAge },
          },
          productId: { not: null },
          product: { status: "PUBLISHED" },
        },
        take: BATCH * 4,
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

      totalCandidates += candidates.length;
      let sentThisTenant = 0;

      for (const ci of candidates) {
        if (sentThisTenant >= BATCH) break;
        if (!ci.product) continue;
        if (unsubSet.has(ci.order.email.toLowerCase())) continue;

        totalEvaluated++;
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
          mailErrors.push({ tenant: tenant.slug, email: ci.order.email, error: r.error });
          continue;
        }
        await tx.orderItem.update({
          where: { id: ci.id },
          data: { replenishmentSentAt: now },
        });
        sentThisTenant++;
        totalSent++;
      }
    },
    { txTimeoutMs: 120_000 }
  );

  return NextResponse.json({
    ok: true,
    tenants: summary,
    candidates: totalCandidates,
    evaluated: totalEvaluated,
    sent: totalSent,
    errors: mailErrors,
  });
}
