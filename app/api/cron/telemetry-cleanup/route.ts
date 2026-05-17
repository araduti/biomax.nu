/**
 * Weekly cron: prune telemetry tables that otherwise grow unbounded.
 *
 *   - WebVital: ~940 rows/day with no TTL → ~340k rows/year, would
 *     become the largest table and dominate backup/vacuum cost.
 *     Keep 90 days (plenty for trend dashboards).
 *   - GscSnapshot: keep 13 months so year-over-year comparison still
 *     works, prune older.
 *
 * Both date columns are indexed, so the deletes are index range scans,
 * not table scans.
 *
 * Auth: bearer `CRON_SECRET` (localhost allowed in dev) — same contract
 * as every other /api/cron/* route.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cronAuthorized } from "@/lib/api/cron-auth";

export const runtime = "nodejs";

const WEBVITAL_RETENTION_DAYS = 90;
const GSC_RETENTION_DAYS = 395; // ~13 months

export async function GET(req: Request) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const webVitalCutoff = new Date(now - WEBVITAL_RETENTION_DAYS * 86400_000);
  const gscCutoff = new Date(now - GSC_RETENTION_DAYS * 86400_000);

  try {
    const [webVitals, gscSnapshots] = await Promise.all([
      prisma.webVital.deleteMany({
        where: { createdAt: { lt: webVitalCutoff } },
      }),
      prisma.gscSnapshot.deleteMany({
        where: { date: { lt: gscCutoff } },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      webVitalsDeleted: webVitals.count,
      gscSnapshotsDeleted: gscSnapshots.count,
    });
  } catch (err) {
    console.error("[telemetry-cleanup] failed:", err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
