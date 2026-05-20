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
 *
 * Tenant scope (sub-slice 3b-2 cron seam): runs once per ACTIVE tenant;
 * the alert recipients (warehouse_alert_emails SiteSetting) and the
 * Order rows are both tenant-owned. Kustom credentials are also
 * per-tenant (3b-3e); each tenant's iteration is wrapped via
 * runWithTenantContext so getKustomOmOrder resolves the right secret.
 */
import { NextResponse } from "next/server";
import { sendTransactional } from "@/lib/email/client";
import { cronAuthorized } from "@/lib/api/cron-auth";
import { getKustomOmOrder, isKlarnaConfigured } from "@/lib/klarna/client";
import { forEachActiveTenant } from "@/lib/cron/for-each-tenant";
import { runWithTenantContext } from "@/lib/tenant/context";

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

  let totalCandidates = 0;
  let totalAtRisk = 0;
  let totalSent = 0;
  const mailErrors: { tenant: string; email: string; error: string }[] = [];

  const summary = await forEachActiveTenant(
    "auth-expiry",
    async (tx, tenant) => {
      // PAID = authorised but not captured (capture happens at FULFILLED).
      const candidates = await tx.order.findMany({
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
      totalCandidates += stale.length;

      // Confirm against Kustom — only still-AUTHORIZED orders are at risk.
      // Each Kustom call resolves per-tenant credentials via the ALS
      // context (ADR 0028 / 3b-3e).
      const atRisk: {
        orderNumber: string;
        total: string;
        ageDays: number;
      }[] = [];
      await runWithTenantContext(tenant.id, async () => {
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
      });

      totalAtRisk += atRisk.length;
      if (atRisk.length === 0) return;

      // Read warehouse_alert_emails via the per-tenant tx so the
      // SiteSetting row is RLS-scoped (the shared getWarehouseAlertEmails
      // helper still uses an out-of-scope prisma.* read pending its own
      // migration to the seam; inlining here keeps THIS cron strictly
      // tenant-isolated without forcing that wider refactor).
      const settingRow = await tx.siteSetting.findUnique({
        where: { key: "warehouse_alert_emails" },
        select: { value: true },
      });
      const recipients =
        typeof settingRow?.value === "string"
          ? settingRow.value
              .split(",")
              .map((e) => e.trim().toLowerCase())
              .filter((e) => e.includes("@"))
          : [];
      if (recipients.length === 0) {
        console.warn(
          JSON.stringify({
            cronName: "auth-expiry",
            tenantId: tenant.id,
            slug: tenant.slug,
            skipped: "warehouse_alert_emails not configured",
            atRisk: atRisk.length,
          })
        );
        return;
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

      for (const email of recipients) {
        const r = await sendTransactional({
          to: { email },
          subject: `Betalningar förfaller snart: ${atRisk.length} order ej debiterad`,
          html,
          text,
          category: "auth-expiry-alert",
          customId: `auth-expiry:${tenant.slug}:${new Date().toISOString().slice(0, 10)}`,
        });
        if (!r.ok) mailErrors.push({ tenant: tenant.slug, email, error: r.error });
        else totalSent++;
      }
    },
    { txTimeoutMs: 120_000 }
  );

  return NextResponse.json({
    ok: true,
    tenants: summary,
    candidates: totalCandidates,
    atRisk: totalAtRisk,
    sent: totalSent,
    errors: mailErrors,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
