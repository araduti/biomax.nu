/**
 * Daily Google Search Console snapshot runner.
 *
 * Usage:
 *   npx tsx scripts/snapshot-gsc.ts            # snapshot the freshest day
 *   npx tsx scripts/snapshot-gsc.ts --backfill # backfill 28 days (one-time)
 *   npx tsx scripts/snapshot-gsc.ts --days 5   # snapshot 5 days back
 *
 * Cron entry on the production host (daily 04:00 server time):
 *   0 4 * * * cd /srv/biomax && \
 *     GSC_SERVICE_ACCOUNT_KEY="$(cat /srv/biomax/secrets/gsc.json)" \
 *     GSC_PROPERTY=https://www.biomax.nu/ \
 *     DATABASE_URL=postgresql://... \
 *     npx tsx scripts/snapshot-gsc.ts \
 *     >> /var/log/biomax-gsc-snapshot.log 2>&1
 *
 * Idempotent — re-running for the same day upserts cleanly. Safe to retry on
 * partial failure.
 *
 * Exit codes:
 *   0  success (or GSC not configured — script logs and exits clean)
 *   1  unexpected error
 */
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import {
  backfill,
  snapshotDay,
} from "@/lib/integrations/gsc-history";
import { isGscConfigured } from "@/lib/integrations/gsc";

async function main() {
  if (!isGscConfigured()) {
    console.log(
      "[gsc-snapshot] GSC ej konfigurerad — sätt GSC_SERVICE_ACCOUNT_KEY och GSC_PROPERTY. Avbryter (0)."
    );
    return;
  }

  const args = process.argv.slice(2);
  const isBackfill = args.includes("--backfill");
  const daysArgIdx = args.indexOf("--days");
  const explicitDaysBack =
    daysArgIdx >= 0 ? parseInt(args[daysArgIdx + 1] ?? "", 10) : NaN;

  if (isBackfill) {
    console.log("[gsc-snapshot] Startar backfill av 28 dagar…");
    const results = await backfill(28);
    let totalRows = 0;
    for (const r of results) {
      totalRows += r.written;
    }
    console.log(
      `[gsc-snapshot] Backfill klar — ${results.length} dagar, ${totalRows} rader sparade.`
    );
    return;
  }

  const daysBack = Number.isFinite(explicitDaysBack) ? explicitDaysBack : 3;
  console.log(`[gsc-snapshot] Hämtar dag ${daysBack} dagar bakåt…`);
  const result = await snapshotDay(daysBack);
  console.log(
    `[gsc-snapshot] Klar — hämtade ${result.fetched} rader, sparade ${result.written}.`
  );
}

main()
  .catch((err) => {
    console.error("[gsc-snapshot] FEL:", err);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("@/lib/prisma");
    await prisma.$disconnect();
  });
