/**
 * Weekly URL Inspection runner.
 *
 * Usage:
 *   npx tsx scripts/inspect-gsc-index.ts
 *
 * Cron entry on production (weekly, Monday 03:00 server time):
 *   0 3 * * 1 cd /srv/biomax && \
 *     GSC_SERVICE_ACCOUNT_KEY="$(cat /srv/biomax/secrets/gsc.json)" \
 *     GSC_PROPERTY=https://www.biomax.nu/ \
 *     DATABASE_URL=postgresql://... \
 *     npx tsx scripts/inspect-gsc-index.ts \
 *     >> /var/log/biomax-gsc-inspect.log 2>&1
 *
 * The URL Inspection API is rate-limited to 2 000 calls/day per service
 * account and 600/minute. With ~50 URLs, weekly runs use <0.4 % of quota
 * and finish in well under a minute (we pace at 100/min).
 *
 * Idempotent — each run upserts the latest verdict per URL.
 *
 * Exit codes:
 *   0  success (or GSC not configured — script logs and exits clean)
 *   1  unexpected error
 *   2  partial failure (some URLs failed; check logs)
 */
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { inspectAllSitePages } from "@/lib/integrations/gsc-index-coverage";
import { isGscConfigured } from "@/lib/integrations/gsc";

async function main() {
  if (!isGscConfigured()) {
    console.log(
      "[gsc-inspect] GSC ej konfigurerad — sätt GSC_SERVICE_ACCOUNT_KEY och GSC_PROPERTY. Avbryter (0)."
    );
    return;
  }

  console.log("[gsc-inspect] Startar URL-inspektion av alla publicerade sidor…");
  const t0 = Date.now();
  const result = await inspectAllSitePages();
  const elapsed = Math.round((Date.now() - t0) / 1000);

  console.log(
    `[gsc-inspect] Klar på ${elapsed}s — ${result.inspected} OK, ${result.failed} misslyckades.`
  );

  if (result.failed > 0) {
    process.exit(2);
  }
}

main()
  .catch((err) => {
    console.error("[gsc-inspect] FEL:", err);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("@/lib/prisma");
    await prisma.$disconnect();
  });
