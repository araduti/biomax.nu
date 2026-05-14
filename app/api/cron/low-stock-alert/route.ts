/**
 * Daily low-stock alert.
 *
 * Walks every PUBLISHED product with managed stock and:
 *   - flags products where `stock <= (lowStockThreshold ?? lowStockDefault)`
 *   - flags variants the same way
 *
 * Emails the warehouse contacts (`warehouse_alert_emails` SiteSetting,
 * comma-separated) with the consolidated list. When the list is empty
 * or no warehouse emails are configured, the cron exits silently.
 *
 * Schedule (vercel.json): daily 07:30 UTC.
 * Auth: Bearer CRON_SECRET (localhost-allowed in dev).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTransactional } from "@/lib/email/client";
import { cronAuthorized } from "@/lib/api/cron-auth";
import {
  getLowStockDefault,
  getWarehouseAlertEmails,
} from "@/lib/site/settings";

export const runtime = "nodejs";

type LowStockRow = {
  kind: "product" | "variant";
  sku: string;
  name: string;
  stock: number;
  threshold: number;
  slug: string;
};

export async function GET(req: Request) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const [lowStockDefault, recipients] = await Promise.all([
    getLowStockDefault(),
    getWarehouseAlertEmails(),
  ]);

  if (recipients.length === 0) {
    return NextResponse.json({
      ok: true,
      skipped: "warehouse_alert_emails not configured",
    });
  }

  const products = await prisma.product.findMany({
    where: { status: "PUBLISHED", manageStock: true },
    select: {
      slug: true,
      sku: true,
      name: true,
      stock: true,
      lowStockThreshold: true,
      variants: {
        select: {
          sku: true,
          label: true,
          stock: true,
          manageStock: true,
        },
      },
    },
  });

  const rows: LowStockRow[] = [];
  for (const p of products) {
    const threshold = p.lowStockThreshold ?? lowStockDefault;
    // Variant products: parent.stock is moot — only variants matter.
    if (p.variants.length >= 2) {
      for (const v of p.variants) {
        if (!v.manageStock) continue;
        if (v.stock <= threshold) {
          rows.push({
            kind: "variant",
            sku: v.sku,
            name: `${p.name} — ${v.label}`,
            stock: v.stock,
            threshold,
            slug: p.slug,
          });
        }
      }
    } else if (p.stock <= threshold) {
      rows.push({
        kind: "product",
        sku: p.sku,
        name: p.name,
        stock: p.stock,
        threshold,
        slug: p.slug,
      });
    }
  }

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, candidates: 0 });
  }

  // Sort: out-of-stock first (most urgent), then by stock asc.
  rows.sort((a, b) => a.stock - b.stock);

  // Plain-text + lightweight HTML. We don't want this in our marketing
  // template — it's an internal ops email that should look like an ops
  // email.
  const lines = rows.map(
    (r) =>
      `  · ${r.name} (${r.sku}) — ${r.stock} kvar (tröskel ${r.threshold})`
  );
  const text = [
    `Lagerlarm — ${rows.length} ${rows.length === 1 ? "produkt" : "produkter"} under tröskeln.`,
    "",
    ...lines,
    "",
    "Hantera lager: https://www.biomax.nu/admin/produkter",
  ].join("\n");
  const html = `
<div style="font-family:Helvetica,Arial,sans-serif;color:#1F2530;line-height:1.55;">
  <p style="margin:0 0 12px;font-size:14px;"><strong>Lagerlarm</strong> — ${rows.length} ${rows.length === 1 ? "produkt" : "produkter"} under tröskeln.</p>
  <ul style="padding-left:18px;margin:0 0 16px;">
    ${rows
      .map(
        (r) =>
          `<li style="margin:4px 0;"><strong>${escapeHtml(r.name)}</strong> (<code>${escapeHtml(r.sku)}</code>) — ${r.stock} kvar (tröskel ${r.threshold})</li>`
      )
      .join("")}
  </ul>
  <p style="margin:0;font-size:13px;color:#525860;">
    <a href="https://www.biomax.nu/admin/produkter" style="color:#1E3A5F;">Hantera lager →</a>
  </p>
</div>`.trim();

  let sent = 0;
  const errors: { email: string; error: string }[] = [];
  for (const email of recipients) {
    const r = await sendTransactional({
      to: { email },
      subject: `Lagerlarm: ${rows.length} produkt${rows.length === 1 ? "" : "er"} under tröskeln`,
      html,
      text,
      category: "low-stock-alert",
      customId: `low-stock:${new Date().toISOString().slice(0, 10)}`,
    });
    if (!r.ok) errors.push({ email, error: r.error });
    else sent++;
  }

  return NextResponse.json({
    ok: true,
    candidates: rows.length,
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
