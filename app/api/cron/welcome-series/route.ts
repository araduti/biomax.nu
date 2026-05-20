/**
 * Welcome series cron — advances each subscriber through stages 0→1→2→3
 * with built-in delays. Stage 0 fires within hours of signup; stage 2
 * after 3 days; stage 3 after 7 days. Stage 4 means "graduated to
 * general newsletter".
 *
 * Schedule (vercel.json): every 6 hours.
 * Auth: Bearer CRON_SECRET (localhost-allowed in dev).
 * Throughput: 200 subscribers per invocation, **per tenant** — the
 * BATCH cap is per-tenant by design so a busy tenant doesn't starve
 * the rest (sub-slice 3b-2 cron tenant seam).
 */
import { NextResponse } from "next/server";
import { sendTransactional } from "@/lib/email/client";
import {
  welcomeStage1Email,
  welcomeStage2Email,
  welcomeStage3Email,
} from "@/lib/email/templates";
import { cronAuthorized } from "@/lib/api/cron-auth";
import { forEachActiveTenant } from "@/lib/cron/for-each-tenant";

export const runtime = "nodejs";

const BATCH = 200;
const STAGE2_DELAY_DAYS = 3;
const STAGE3_DELAY_DAYS = 7;

export async function GET(req: Request) {
  if (!cronAuthorized(req))
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const now = new Date();
  const stage2Cutoff = new Date(now);
  stage2Cutoff.setUTCDate(stage2Cutoff.getUTCDate() - STAGE2_DELAY_DAYS);
  const stage3Cutoff = new Date(now);
  stage3Cutoff.setUTCDate(stage3Cutoff.getUTCDate() - STAGE3_DELAY_DAYS);

  const errors: { email: string; stage: number; error: string; tenant: string }[] = [];
  let sent = 0;
  let stage1Total = 0;
  let stage2Total = 0;
  let stage3Total = 0;

  const summary = await forEachActiveTenant("welcome-series", async (tx, tenant) => {
    // tx stays open across sendTransactional calls (network) + per-row
    // updates; raise the default 5s Prisma tx timeout accordingly.
    // Stage 1 candidates — never sent, not unsubscribed. (No min delay;
    // we want this within hours of signup. The 6-hour cadence covers it.)
    const stage1 = await tx.newsletterSubscriber.findMany({
      where: {
        welcomeSeriesStage: 0,
        unsubscribedAt: null,
      },
      orderBy: { consentedAt: "asc" },
      take: BATCH,
      select: { id: true, email: true, unsubscribeToken: true },
    });

    // Stage 2 candidates — stage 1 sent ≥ 3 days ago.
    const stage2 = await tx.newsletterSubscriber.findMany({
      where: {
        welcomeSeriesStage: 1,
        unsubscribedAt: null,
        welcomeSeriesStartedAt: { lte: stage2Cutoff },
      },
      orderBy: { welcomeSeriesStartedAt: "asc" },
      take: BATCH,
      select: { id: true, email: true, unsubscribeToken: true },
    });

    // Stage 3 candidates — stage 1 sent ≥ 7 days ago AND already past stage 2.
    const stage3 = await tx.newsletterSubscriber.findMany({
      where: {
        welcomeSeriesStage: 2,
        unsubscribedAt: null,
        welcomeSeriesStartedAt: { lte: stage3Cutoff },
      },
      orderBy: { welcomeSeriesStartedAt: "asc" },
      take: BATCH,
      select: { id: true, email: true, unsubscribeToken: true },
    });

    stage1Total += stage1.length;
    stage2Total += stage2.length;
    stage3Total += stage3.length;

    // Stage 1
    for (const s of stage1) {
      const tpl = welcomeStage1Email({ unsubscribeToken: s.unsubscribeToken });
      const r = await sendTransactional({
        to: { email: s.email },
        subject: tpl.subject,
        preheader: tpl.preheader,
        html: tpl.html,
        text: tpl.text,
        category: "welcome-1",
        customId: `welcome-1:${s.id}`,
      });
      if (!r.ok) {
        errors.push({ email: s.email, stage: 1, error: r.error, tenant: tenant.slug });
        continue;
      }
      await tx.newsletterSubscriber.update({
        where: { id: s.id },
        data: { welcomeSeriesStage: 1, welcomeSeriesStartedAt: now },
      });
      sent++;
    }

    // Stage 2
    for (const s of stage2) {
      const tpl = welcomeStage2Email({ unsubscribeToken: s.unsubscribeToken });
      const r = await sendTransactional({
        to: { email: s.email },
        subject: tpl.subject,
        preheader: tpl.preheader,
        html: tpl.html,
        text: tpl.text,
        category: "welcome-2",
        customId: `welcome-2:${s.id}`,
      });
      if (!r.ok) {
        errors.push({ email: s.email, stage: 2, error: r.error, tenant: tenant.slug });
        continue;
      }
      await tx.newsletterSubscriber.update({
        where: { id: s.id },
        data: { welcomeSeriesStage: 2 },
      });
      sent++;
    }

    // Stage 3 (graduates to stage 4 = completed)
    for (const s of stage3) {
      const tpl = welcomeStage3Email({ unsubscribeToken: s.unsubscribeToken });
      const r = await sendTransactional({
        to: { email: s.email },
        subject: tpl.subject,
        preheader: tpl.preheader,
        html: tpl.html,
        text: tpl.text,
        category: "welcome-3",
        customId: `welcome-3:${s.id}`,
      });
      if (!r.ok) {
        errors.push({ email: s.email, stage: 3, error: r.error, tenant: tenant.slug });
        continue;
      }
      await tx.newsletterSubscriber.update({
        where: { id: s.id },
        data: { welcomeSeriesStage: 4 },
      });
      sent++;
    }
  }, { txTimeoutMs: 120_000 });

  return NextResponse.json({
    ok: true,
    tenants: summary,
    candidates: { stage1: stage1Total, stage2: stage2Total, stage3: stage3Total },
    sent,
    errors,
  });
}
