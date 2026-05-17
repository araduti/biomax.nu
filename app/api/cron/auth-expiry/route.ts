/**
 * Authorization-expiry guard (ADR: capture-at-ship).
 *
 * With capture-at-ship, a PAID order is only *authorised* — the money
 * isn't taken until "Markera som skickad" captures it. Klarna/Kustom
 * authorizations expire (~28 days). An order that's paid but never
 * shipped will silently lose its authorization → uncollectable money.
 *
 * This cron flags real Kustom orders that are still PAID (authorised,
 * not yet captured/shipped) and older than AUTH_EXPIRY_WARN_DAYS, so
 * ops can ship (capture) or cancel before the hold lapses. We confirm
 * each against the Kustom Order Management status so already
 * captured/cancelled/expired orders don't raise false alarms.
 *
 * Schedule (vercel.json): daily. Auth: Bearer CRON_SECRET.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTransactional } from "@/lib/email/client";
import { cronAuthorized } from "@/lib/api/cron-auth";
import { getWarehouseAlertEmails } from "@/lib/site/settings";
import { getKustomOmOrder, isKlarnaConfigured } from "@/lib/klarna/client";

export const runtime = "nodejs";

// Klarna/Kustom authorizations are typically valid ~28 days. Warn with
// a runway so staff can act before the hold lapses.
const AUTH_EXPIRY_WARN_DAYS = 21;

export async function GET(req: Request) {
  if (!cronAuthorized(req)) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }
  if (!isKlarnaConfigured()) {
    return NextResponse.json({ ok: true, skipped: "kustom not configured" });
  }

  const cutoff = new Date(
    Date.now() - AUTH_EXPIRY_WARN_DAYS * 24 * 60 * 60 * 1000
  );

  // PAID = authorised but not captured (capture happens at FULFILLED).
  const candidates = await prisma.order.findMany({
    where: {
      status: "PAID",
      paymentProvider: "KLARNA",
      paymentReference: { not: null },
      createdAt: { lt: cutoff },
    },
    select: {
      orderNumber: true,
      paymentReference: true,
      totalAmount: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const stale = candidates.filter(
    (o) => o.paymentReference && !o.paymentReference.startsWith("stub-")
  );

  // Confirm against Kustom — only still-AUTHORIZED orders are at risk.
  const atRisk: {
    orderNumber: string;
    total: string;
    ageDays: number;
  }[] = [];
  for (const o of stale) {
    try {
      const om = await getKustomOmOrder(o.paymentReference!);
      if (om.status === "AUTHORIZED" || om.captured_amount === 0) {
        if (om.status === "CANCELLED" || om.status === "EXPIRED") continue;
        atRisk.push({
          orderNumber: o.orderNumber,
          total: o.totalAmount.toString(),
          ageDays: Math.floor(
            (Date.now() - o.createdAt.getTime()) / 86_400_000
          ),
        });
      }
    } catch (err) {
      console.error(
        `[auth-expiry] OM read failed for ${o.orderNumber}`,
        err
      );
    }
  }

  if (atRisk.length === 0) {
    return NextResponse.json({
      ok: true,
      candidates: stale.length,
      atRisk: 0,
    });
  }

  const recipients = await getWarehouseAlertEmails();
  if (recipients.length === 0) {
    return NextResponse.json({
      ok: true,
      atRisk: atRisk.length,
      skipped: "warehouse_alert_emails not configured",
    });
  }

  const lines = atRisk.map(
    (r) =>
      `  · ${r.orderNumber} — ${r.total} kr, ${r.ageDays} dagar gammal (ej skickad)`
  );
  const text = [
    `Betalningar som snart förfaller — ${atRisk.length} order${atRisk.length === 1 ? "" : "s"} är godkända men inte debiterade.`,
    "Skicka (debiterar) eller annullera dem innan reservationen löper ut.",
    "",
    ...lines,
    "",
    "Hantera ordrar: https://www.biomax.nu/admin/ordrar",
  ].join("\n");
  const html = `
<div style="font-family:Helvetica,Arial,sans-serif;color:#1F2530;line-height:1.55;">
  <p style="margin:0 0 12px;font-size:14px;"><strong>Betalningar som snart förfaller</strong> — ${atRisk.length} order är godkända men inte debiterade.</p>
  <p style="margin:0 0 12px;font-size:13px;color:#525860;">Skicka ordern (debiterar betalningen) eller annullera den innan reservationen löper ut.</p>
  <ul style="padding-left:18px;margin:0 0 16px;">
    ${atRisk
      .map(
        (r) =>
          `<li style="margin:4px 0;"><strong>${escapeHtml(r.orderNumber)}</strong> — ${escapeHtml(r.total)} kr, ${r.ageDays} dagar gammal</li>`
      )
      .join("")}
  </ul>
  <p style="margin:0;font-size:13px;color:#525860;">
    <a href="https://www.biomax.nu/admin/ordrar" style="color:#1E3A5F;">Hantera ordrar →</a>
  </p>
</div>`.trim();

  let sent = 0;
  const errors: { email: string; error: string }[] = [];
  for (const email of recipients) {
    const r = await sendTransactional({
      to: { email },
      subject: `Betalningar förfaller snart: ${atRisk.length} order ej debiterad`,
      html,
      text,
      category: "auth-expiry-alert",
      customId: `auth-expiry:${new Date().toISOString().slice(0, 10)}`,
    });
    if (!r.ok) errors.push({ email, error: r.error });
    else sent++;
  }

  return NextResponse.json({
    ok: true,
    candidates: stale.length,
    atRisk: atRisk.length,
    sent,
    errors,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
