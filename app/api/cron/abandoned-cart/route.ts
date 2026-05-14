/**
 * Abandoned-cart cron — sends two emails per CartSnapshot, 24h and 72h
 * after creation, suppressing snapshots that have been recovered or that
 * belong to unsubscribed addresses.
 *
 * Schedule (vercel.json): every 2 hours.
 * Auth: Bearer CRON_SECRET (localhost-allowed in dev).
 * Throughput: 200 snapshots per invocation per stage.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTransactional } from "@/lib/email/client";
import { abandonedCartEmail } from "@/lib/email/templates";
import { cronAuthorized } from "@/lib/api/cron-auth";

export const runtime = "nodejs";

const BATCH = 200;
const FIRST_DELAY_HOURS = 24;
const SECOND_DELAY_HOURS = 72;

type SnapshotItem = {
  productName: string;
  quantity: number;
  unitPrice: number;
};

function templateRowsFromSnapshot(
  rawItems: unknown
): { name: string; quantity: number; totalPrice: string }[] {
  if (!Array.isArray(rawItems)) return [];
  return rawItems
    .map((it) => it as Partial<SnapshotItem>)
    .filter((it) => typeof it.productName === "string")
    .map((it) => ({
      name: it.productName as string,
      quantity: it.quantity ?? 1,
      totalPrice: ((it.unitPrice ?? 0) * (it.quantity ?? 1)).toFixed(2),
    }));
}

export async function GET(req: Request) {
  if (!cronAuthorized(req))
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const now = new Date();
  const firstCutoff = new Date(now.getTime() - FIRST_DELAY_HOURS * 3600 * 1000);
  const secondCutoff = new Date(now.getTime() - SECOND_DELAY_HOURS * 3600 * 1000);

  // Pre-fetch unsubscribed emails so we can filter both queries in memory
  // rather than join. Small set, single SELECT.
  const unsubRows = await prisma.newsletterSubscriber.findMany({
    where: { unsubscribedAt: { not: null } },
    select: { email: true },
  });
  const unsubSet = new Set(unsubRows.map((r) => r.email.toLowerCase()));

  // Stage 1 — 24h after createdAt, never sent.
  const stage1 = await prisma.cartSnapshot.findMany({
    where: {
      recoveredAt: null,
      firstEmailSentAt: null,
      createdAt: { lte: firstCutoff },
    },
    orderBy: { createdAt: "asc" },
    take: BATCH,
  });

  // Stage 2 — 72h after createdAt, stage 1 already sent.
  const stage2 = await prisma.cartSnapshot.findMany({
    where: {
      recoveredAt: null,
      firstEmailSentAt: { not: null },
      secondEmailSentAt: null,
      createdAt: { lte: secondCutoff },
    },
    orderBy: { createdAt: "asc" },
    take: BATCH,
  });

  let sent = 0;
  const errors: { email: string; stage: number; error: string }[] = [];

  for (const c of stage1) {
    if (unsubSet.has(c.email.toLowerCase())) continue;
    const items = templateRowsFromSnapshot(c.items);
    if (items.length === 0) continue;
    const tpl = abandonedCartEmail({
      recoveryToken: c.recoveryToken,
      items,
      subtotal: c.subtotalSek.toString(),
      stage: 1,
    });
    const r = await sendTransactional({
      to: { email: c.email },
      subject: tpl.subject,
      preheader: tpl.preheader,
      html: tpl.html,
      text: tpl.text,
      category: "abandoned-cart-1",
      customId: `abandoned-cart-1:${c.id}`,
    });
    if (!r.ok) {
      errors.push({ email: c.email, stage: 1, error: r.error });
      continue;
    }
    await prisma.cartSnapshot.update({
      where: { id: c.id },
      data: { firstEmailSentAt: now },
    });
    sent++;
  }

  for (const c of stage2) {
    if (unsubSet.has(c.email.toLowerCase())) continue;
    const items = templateRowsFromSnapshot(c.items);
    if (items.length === 0) continue;
    const tpl = abandonedCartEmail({
      recoveryToken: c.recoveryToken,
      items,
      subtotal: c.subtotalSek.toString(),
      stage: 2,
      couponCode: "COMEBACK10",
    });
    const r = await sendTransactional({
      to: { email: c.email },
      subject: tpl.subject,
      preheader: tpl.preheader,
      html: tpl.html,
      text: tpl.text,
      category: "abandoned-cart-2",
      customId: `abandoned-cart-2:${c.id}`,
    });
    if (!r.ok) {
      errors.push({ email: c.email, stage: 2, error: r.error });
      continue;
    }
    await prisma.cartSnapshot.update({
      where: { id: c.id },
      data: { secondEmailSentAt: now },
    });
    sent++;
  }

  return NextResponse.json({
    ok: true,
    candidates: { stage1: stage1.length, stage2: stage2.length },
    sent,
    errors,
  });
}
