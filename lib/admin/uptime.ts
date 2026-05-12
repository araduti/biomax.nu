/**
 * Aggregations over `UptimeProbe` for the Drifttid admin page.
 *
 * Two views the dashboard cares about:
 *   • Latest verdict per URL (right now, is it up?)
 *   • Recent rolling history per URL (last 24 h timeline + 30-day uptime %)
 */
import { prisma } from "@/lib/prisma";

export type UptimeStatus = "up" | "down" | "degraded";

export type UrlStatus = {
  url: string;
  status: UptimeStatus;
  httpStatus: number;
  latencyMs: number;
  checkedAt: Date;
  error: string | null;
};

export type UptimeWindow = {
  url: string;
  /** Rolling % uptime over the window. */
  uptimePct: number;
  /** Median latency over the window (ms). */
  medianLatencyMs: number;
  /** Number of incidents in the window — contiguous spans of non-up. */
  incidents: number;
  /** Total probe count in the window. */
  probes: number;
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

export async function getLatestPerUrl(): Promise<UrlStatus[]> {
  // Pull the last 24h, dedupe to the freshest per URL in JS — small dataset.
  const cutoff = new Date();
  cutoff.setUTCHours(cutoff.getUTCHours() - 24);
  const rows = await prisma.uptimeProbe.findMany({
    where: { checkedAt: { gte: cutoff } },
    orderBy: { checkedAt: "desc" },
    select: {
      url: true,
      status: true,
      httpStatus: true,
      latencyMs: true,
      checkedAt: true,
      error: true,
    },
  });
  const seen = new Set<string>();
  const out: UrlStatus[] = [];
  for (const r of rows) {
    if (seen.has(r.url)) continue;
    seen.add(r.url);
    out.push({
      url: r.url,
      status: r.status as UptimeStatus,
      httpStatus: r.httpStatus,
      latencyMs: r.latencyMs,
      checkedAt: r.checkedAt,
      error: r.error,
    });
  }
  return out;
}

export async function getWindowSummary(
  days = 30
): Promise<Map<string, UptimeWindow>> {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  const rows = await prisma.uptimeProbe.findMany({
    where: { checkedAt: { gte: cutoff } },
    orderBy: [{ url: "asc" }, { checkedAt: "asc" }],
    select: {
      url: true,
      status: true,
      latencyMs: true,
    },
  });

  const byUrl = new Map<string, typeof rows>();
  for (const r of rows) {
    const arr = byUrl.get(r.url) ?? [];
    arr.push(r);
    byUrl.set(r.url, arr);
  }

  const result = new Map<string, UptimeWindow>();
  for (const [url, arr] of byUrl) {
    const up = arr.filter((r) => r.status === "up").length;
    const uptimePct = arr.length > 0 ? (up / arr.length) * 100 : 100;
    const medianLatencyMs = median(arr.map((r) => r.latencyMs));
    // Count incidents = contiguous spans of non-up status.
    let incidents = 0;
    let inIncident = false;
    for (const r of arr) {
      const isDown = r.status !== "up";
      if (isDown && !inIncident) {
        incidents++;
        inIncident = true;
      } else if (!isDown) {
        inIncident = false;
      }
    }
    result.set(url, {
      url,
      uptimePct,
      medianLatencyMs,
      incidents,
      probes: arr.length,
    });
  }
  return result;
}

export type RecentTick = {
  status: UptimeStatus;
  latencyMs: number;
  checkedAt: Date;
};

/** Last N probes per URL — drives the colored-tick timeline on the page. */
export async function getRecentTicksPerUrl(
  perUrl = 60
): Promise<Map<string, RecentTick[]>> {
  // Last 24h of data is enough for ~60 ticks at a 5-min cadence.
  const cutoff = new Date();
  cutoff.setUTCHours(cutoff.getUTCHours() - 24);
  const rows = await prisma.uptimeProbe.findMany({
    where: { checkedAt: { gte: cutoff } },
    orderBy: { checkedAt: "desc" },
    select: {
      url: true,
      status: true,
      latencyMs: true,
      checkedAt: true,
    },
  });
  const map = new Map<string, RecentTick[]>();
  for (const r of rows) {
    const arr = map.get(r.url) ?? [];
    if (arr.length >= perUrl) continue;
    arr.push({
      status: r.status as UptimeStatus,
      latencyMs: r.latencyMs,
      checkedAt: r.checkedAt,
    });
    map.set(r.url, arr);
  }
  // Reverse each so oldest-first reads naturally left→right.
  for (const [k, v] of map) map.set(k, v.reverse());
  return map;
}
