/**
 * Uptime pinger — pings a curated set of URLs and persists the result.
 *
 * Designed to run on a SEPARATE host from biomax.nu (a small VPS, Hetzner
 * Cloud, Cloudflare Workers cron, anywhere). If you run it on the same host
 * as the app, an outage takes down both the site AND the monitoring — defeats
 * the purpose. The persistence target (the same Postgres) is fine to share.
 *
 * Usage:
 *   UPTIME_BASE_URL=https://www.biomax.nu \
 *   DATABASE_URL=postgresql://... \
 *   UPTIME_ORIGIN=hetzner-fsn1 \
 *   npx tsx scripts/uptime-probe.ts
 *
 * Recommended cron — every 5 minutes:
 *   * /5 * * * * cd /srv/biomax-monitor && \
 *     UPTIME_BASE_URL=https://www.biomax.nu \
 *     UPTIME_ORIGIN=hetzner-fsn1 \
 *     DATABASE_URL=postgresql://... \
 *     npx tsx scripts/uptime-probe.ts \
 *     >> /var/log/biomax-uptime.log 2>&1
 *
 * Probe latency thresholds:
 *   < 1500 ms → up
 *   1500–4000 ms → degraded (we got a response, but slowly)
 *   timeout / non-2xx → down
 */
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

const ROUTES = [
  "/",
  "/produkter",
  "/produkter/q10-100mg-100-kapslar",
  "/kunskap",
  "/checkout",
];

const TIMEOUT_MS = 10_000;
const DEGRADED_AT_MS = 1500;
const DOWN_AT_MS = 4000;

type ProbeResult = {
  url: string;
  status: "up" | "down" | "degraded";
  httpStatus: number;
  latencyMs: number;
  error: string | null;
  origin: string | null;
};

async function probe(url: string): Promise<ProbeResult> {
  const origin = process.env.UPTIME_ORIGIN ?? null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": "biomax-uptime-probe/1.0" },
      signal: controller.signal,
      redirect: "manual",
    });
    const latencyMs = Date.now() - t0;
    const ok = res.status >= 200 && res.status < 400;
    let status: ProbeResult["status"];
    if (!ok) status = "down";
    else if (latencyMs >= DOWN_AT_MS) status = "down";
    else if (latencyMs >= DEGRADED_AT_MS) status = "degraded";
    else status = "up";
    return {
      url,
      status,
      httpStatus: res.status,
      latencyMs,
      error: ok ? null : `HTTP ${res.status}`,
      origin,
    };
  } catch (err) {
    const latencyMs = Date.now() - t0;
    return {
      url,
      status: "down",
      httpStatus: 0,
      latencyMs,
      error: err instanceof Error ? err.message.slice(0, 200) : "unknown",
      origin,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const base = process.env.UPTIME_BASE_URL?.replace(/\/$/, "");
  if (!base) {
    console.error("UPTIME_BASE_URL not set (e.g. https://www.biomax.nu)");
    process.exit(1);
  }

  console.log(
    `[uptime] Pinging ${ROUTES.length} routes against ${base}${
      process.env.UPTIME_ORIGIN ? ` from ${process.env.UPTIME_ORIGIN}` : ""
    }…`
  );

  const { prisma } = await import("@/lib/prisma");
  const urls = ROUTES.map((r) => base + r);

  let failures = 0;
  for (const url of urls) {
    const result = await probe(url);
    await prisma.uptimeProbe.create({ data: result });
    if (result.status !== "up") failures++;
    console.log(
      `[uptime] ${result.status.padEnd(8)} ${result.latencyMs.toString().padStart(5)}ms  ${url}${result.error ? ` — ${result.error}` : ""}`
    );
  }

  await prisma.$disconnect();

  // Non-zero exit when anything's down so cron mailer/alerts fire.
  if (failures > 0) {
    console.error(`[uptime] ${failures} probe(s) reported degraded or down.`);
    process.exit(2);
  }
}

main().catch((err) => {
  console.error("[uptime] FATAL:", err);
  process.exit(1);
});
