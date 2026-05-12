/**
 * Aggregations over the `WebVital` sample table for the admin Prestanda
 * dashboard. We compute percentiles in memory — at low/medium volume this
 * stays fast and avoids Postgres window-function gymnastics. If volume
 * grows past ~100k samples per window we'd switch to TimescaleDB or a
 * pre-aggregated rollup table.
 */
import { prisma } from "@/lib/prisma";

export type CoreMetric = "LCP" | "INP" | "CLS" | "FCP" | "TTFB";
export const CORE_METRICS: CoreMetric[] = ["LCP", "INP", "CLS", "FCP", "TTFB"];

/**
 * Google's Core Web Vitals thresholds. "Good" / "Needs improvement" / "Poor"
 * are the buckets reported in PageSpeed Insights and Search Console.
 *
 *   • LCP — ms; ≤ 2500 good, ≤ 4000 ok
 *   • INP — ms; ≤ 200 good, ≤ 500 ok
 *   • CLS — score; ≤ 0.1 good, ≤ 0.25 ok
 *   • FCP — ms; ≤ 1800 good, ≤ 3000 ok (informational; not a Core Web Vital)
 *   • TTFB — ms; ≤ 800 good, ≤ 1800 ok (informational)
 */
export const THRESHOLDS: Record<CoreMetric, { good: number; ok: number; unit: string }> = {
  LCP: { good: 2500, ok: 4000, unit: "ms" },
  INP: { good: 200, ok: 500, unit: "ms" },
  CLS: { good: 0.1, ok: 0.25, unit: "" },
  FCP: { good: 1800, ok: 3000, unit: "ms" },
  TTFB: { good: 800, ok: 1800, unit: "ms" },
};

export type Verdict = "good" | "ok" | "poor";

export function verdictFor(metric: CoreMetric, value: number): Verdict {
  const t = THRESHOLDS[metric];
  if (value <= t.good) return "good";
  if (value <= t.ok) return "ok";
  return "poor";
}

export function formatValue(metric: CoreMetric, value: number): string {
  if (metric === "CLS") return value.toFixed(3);
  return `${Math.round(value)} ms`;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p));
  return sorted[idx];
}

export type MetricSummary = {
  metric: CoreMetric;
  count: number;
  p50: number;
  p75: number;
  p95: number;
  /** Verdict at p75 — Core Web Vitals are scored on this percentile. */
  verdict: Verdict;
};

export type RoutePerf = {
  route: string;
  count: number;
  metrics: Partial<Record<CoreMetric, MetricSummary>>;
};

export type PerfSnapshot = {
  /** Sample window in days. */
  windowDays: number;
  /** Total samples received in window. */
  totalSamples: number;
  /** Site-wide percentiles per metric. */
  siteWide: MetricSummary[];
  /** Per-route breakdown, sorted by sample count desc. */
  routes: RoutePerf[];
};

const DEFAULT_WINDOW_DAYS = 7;

/**
 * Group routes the way Google groups paths (parameterised). Concrete product
 * slugs collapse to `/produkter/[slug]`, ingredient monographs to
 * `/kunskap/ingredienser/[slug]`, etc. Keeps the dashboard scannable.
 */
function normaliseRoute(path: string): string {
  if (path.startsWith("/produkter/") && path.length > "/produkter/".length) {
    return "/produkter/[slug]";
  }
  if (path.startsWith("/kop/") && path.length > "/kop/".length) {
    return "/kop/[slug]";
  }
  if (path.startsWith("/kunskap/ingredienser/") && path.length > "/kunskap/ingredienser/".length) {
    return "/kunskap/ingredienser/[slug]";
  }
  if (path.startsWith("/kategorier/") && path.length > "/kategorier/".length) {
    return "/kategorier/[slug]";
  }
  return path;
}

export async function getPerfSnapshot(
  windowDays = DEFAULT_WINDOW_DAYS
): Promise<PerfSnapshot> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - windowDays);

  const rows = await prisma.webVital.findMany({
    where: { createdAt: { gte: since } },
    select: { metric: true, value: true, route: true },
  });

  const totalSamples = rows.length;

  // ── Site-wide ─────────────────────────────────────────────────
  const byMetric = new Map<CoreMetric, number[]>();
  for (const r of rows) {
    if (!CORE_METRICS.includes(r.metric as CoreMetric)) continue;
    const m = r.metric as CoreMetric;
    const arr = byMetric.get(m) ?? [];
    arr.push(r.value);
    byMetric.set(m, arr);
  }
  const siteWide: MetricSummary[] = [];
  for (const m of CORE_METRICS) {
    const arr = byMetric.get(m);
    if (!arr || arr.length === 0) continue;
    arr.sort((a, b) => a - b);
    const p75 = percentile(arr, 0.75);
    siteWide.push({
      metric: m,
      count: arr.length,
      p50: percentile(arr, 0.5),
      p75,
      p95: percentile(arr, 0.95),
      verdict: verdictFor(m, p75),
    });
  }

  // ── Per-route ─────────────────────────────────────────────────
  const byRoute = new Map<string, Map<CoreMetric, number[]>>();
  for (const r of rows) {
    if (!CORE_METRICS.includes(r.metric as CoreMetric)) continue;
    const route = normaliseRoute(r.route);
    let perRoute = byRoute.get(route);
    if (!perRoute) {
      perRoute = new Map();
      byRoute.set(route, perRoute);
    }
    const m = r.metric as CoreMetric;
    const arr = perRoute.get(m) ?? [];
    arr.push(r.value);
    perRoute.set(m, arr);
  }

  const routes: RoutePerf[] = [];
  for (const [route, perMetric] of byRoute.entries()) {
    let count = 0;
    const metrics: Partial<Record<CoreMetric, MetricSummary>> = {};
    for (const [m, arr] of perMetric.entries()) {
      arr.sort((a, b) => a - b);
      count += arr.length;
      const p75 = percentile(arr, 0.75);
      metrics[m] = {
        metric: m,
        count: arr.length,
        p50: percentile(arr, 0.5),
        p75,
        p95: percentile(arr, 0.95),
        verdict: verdictFor(m, p75),
      };
    }
    routes.push({ route, count, metrics });
  }
  routes.sort((a, b) => b.count - a.count);

  return {
    windowDays,
    totalSamples,
    siteWide,
    routes,
  };
}
