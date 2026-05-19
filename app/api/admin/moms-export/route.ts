/**
 * VAT (moms) reporting export.
 *
 * Generates a CSV summarising PAID/FULFILLED orders within a date range,
 * grouped by VAT rate. Format is Bokföringslagen-friendly: per-order
 * detail rows + a summary block. The bookkeeper imports this into
 * Fortnox manually (Fortnox API integration is a separate item).
 *
 * Query params:
 *   from=YYYY-MM-DD   inclusive
 *   to=YYYY-MM-DD     inclusive
 *
 * Auth: requireAdmin. The action is also audit-logged so we can
 * reconstruct who exported what when.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenantRole } from "@/lib/admin/guard";
import { audit } from "@/lib/admin/audit";

export const runtime = "nodejs";

const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const dateFmt = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function fmtAmount(n: number): string {
  // Swedish CSV convention uses comma decimal — Fortnox imports accept
  // both, but accountants prefer the local format on inspection.
  return n.toFixed(2).replace(".", ",");
}

function csvEscape(s: string): string {
  if (s.includes('"') || s.includes(",") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: Request) {
  const admin = await requireTenantRole("admin");

  const url = new URL(req.url);
  const fromStr = url.searchParams.get("from") ?? "";
  const toStr = url.searchParams.get("to") ?? "";

  const parsed = z
    .object({ from: DateSchema, to: DateSchema })
    .safeParse({ from: fromStr, to: toStr });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "from och to måste anges som YYYY-MM-DD." },
      { status: 400 }
    );
  }

  const fromDate = new Date(`${parsed.data.from}T00:00:00Z`);
  const toDate = new Date(`${parsed.data.to}T00:00:00Z`);
  toDate.setUTCDate(toDate.getUTCDate() + 1); // inclusive

  const orders = await prisma.order.findMany({
    where: {
      status: { in: ["PAID", "FULFILLED"] },
      createdAt: { gte: fromDate, lt: toDate },
    },
    orderBy: { createdAt: "asc" },
    select: {
      orderNumber: true,
      createdAt: true,
      currency: true,
      subtotal: true,
      shippingAmount: true,
      taxAmount: true,
      taxRateBp: true,
      totalAmount: true,
      status: true,
    },
  });

  // Detail rows.
  const rows: string[] = [];
  rows.push(
    [
      "Ordernummer",
      "Datum",
      "Status",
      "Valuta",
      "Momssats (%)",
      "Delsumma",
      "Frakt",
      "Moms",
      "Totalt",
    ]
      .map(csvEscape)
      .join(",")
  );

  // Summary aggregation by VAT rate (basis points → percent label).
  const byRate = new Map<
    number,
    { count: number; subtotal: number; shipping: number; tax: number; total: number }
  >();

  for (const o of orders) {
    const rate = o.taxRateBp;
    const subtotal = parseFloat(o.subtotal.toString());
    const shipping = parseFloat(o.shippingAmount.toString());
    const tax = parseFloat(o.taxAmount.toString());
    const total = parseFloat(o.totalAmount.toString());

    rows.push(
      [
        o.orderNumber,
        dateFmt.format(o.createdAt),
        o.status,
        o.currency,
        (rate / 100).toFixed(0),
        fmtAmount(subtotal),
        fmtAmount(shipping),
        fmtAmount(tax),
        fmtAmount(total),
      ]
        .map(csvEscape)
        .join(",")
    );

    const bucket = byRate.get(rate) ?? {
      count: 0,
      subtotal: 0,
      shipping: 0,
      tax: 0,
      total: 0,
    };
    bucket.count++;
    bucket.subtotal += subtotal;
    bucket.shipping += shipping;
    bucket.tax += tax;
    bucket.total += total;
    byRate.set(rate, bucket);
  }

  // Summary block.
  rows.push("");
  rows.push(["Summa per momssats"].map(csvEscape).join(","));
  rows.push(
    [
      "Momssats (%)",
      "Antal ordrar",
      "Delsumma",
      "Frakt",
      "Moms",
      "Totalt",
    ]
      .map(csvEscape)
      .join(",")
  );
  const sortedRates = Array.from(byRate.keys()).sort((a, b) => a - b);
  for (const rate of sortedRates) {
    const b = byRate.get(rate)!;
    rows.push(
      [
        (rate / 100).toFixed(0),
        b.count.toString(),
        fmtAmount(b.subtotal),
        fmtAmount(b.shipping),
        fmtAmount(b.tax),
        fmtAmount(b.total),
      ]
        .map(csvEscape)
        .join(",")
    );
  }

  const csv = rows.join("\n");
  const filename = `biomax-moms-${parsed.data.from}-${parsed.data.to}.csv`;

  await audit({
    actorId: admin.userId,
    action: "moms.export",
    diff: { from: parsed.data.from, to: parsed.data.to, orderCount: orders.length },
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
