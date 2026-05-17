/**
 * Sweeps stale `RateLimitBucket` rows. Anything whose window started
 * more than 7 days ago is irrelevant — the customer/bot has moved on
 * and re-incrementing would just create a fresh row anyway.
 *
 * Schedule (vercel.json): daily at 03:15 UTC.
 * Auth: Bearer CRON_SECRET (localhost-allowed in dev).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cronAuthorized } from "@/lib/api/cron-auth";

export const runtime = "nodejs";

const STALE_AFTER_DAYS = 7;

export async function GET(req: Request) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - STALE_AFTER_DAYS);

  const result = await prisma.rateLimitBucket.deleteMany({
    where: { windowStart: { lt: cutoff } },
  });

  return NextResponse.json({ ok: true, deleted: result.count });
}
