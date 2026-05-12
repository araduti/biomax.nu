/**
 * URL Inspection API — answers "is this URL indexed by Google?" plus context
 * (when it was crawled, which user-agent, canonical mismatch, blocked by
 * robots/meta, etc.).
 *
 * Quota: 2 000 inspections/day per service account. We keep one row per URL
 * (latest verdict) rather than time-series — historical drift is rare for
 * a small catalogue, and the cron runs weekly anyway.
 */
import { JWT } from "google-auth-library";
import { prisma } from "@/lib/prisma";
import { isGscConfigured } from "@/lib/integrations/gsc";

const API_URL =
  "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";

let cachedClient: JWT | null = null;
function getClient(): JWT {
  if (cachedClient) return cachedClient;
  const raw = process.env.GSC_SERVICE_ACCOUNT_KEY!;
  const creds = JSON.parse(raw) as {
    client_email: string;
    private_key: string;
  };
  cachedClient = new JWT({
    email: creds.client_email,
    key: creds.private_key.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
  return cachedClient;
}

type ApiResponse = {
  inspectionResult?: {
    indexStatusResult?: {
      verdict?: string;
      coverageState?: string;
      robotsTxtState?: string;
      indexingState?: string;
      lastCrawlTime?: string;
      pageFetchState?: string;
      googleCanonical?: string;
      userCanonical?: string;
      crawledAs?: string;
    };
    richResultsResult?: {
      verdict?: string;
    };
  };
};

export type IndexInspection = {
  verdict: string;
  coverageState: string | null;
  robotsState: string | null;
  indexingState: string | null;
  pageFetchState: string | null;
  lastCrawlTime: Date | null;
  googleCanonical: string | null;
  userCanonical: string | null;
  crawledAs: string | null;
  richResultsVerdict: string | null;
};

/** Single URL inspection — does NOT persist; caller decides. */
export async function inspectUrl(url: string): Promise<IndexInspection> {
  if (!isGscConfigured()) {
    throw new Error("GSC is not configured");
  }
  const client = getClient();
  const property = process.env.GSC_PROPERTY!;
  const res = await client.request<ApiResponse>({
    url: API_URL,
    method: "POST",
    data: {
      inspectionUrl: url,
      siteUrl: property,
    },
  });
  const idx = res.data.inspectionResult?.indexStatusResult ?? {};
  const rich = res.data.inspectionResult?.richResultsResult;
  return {
    verdict: idx.verdict ?? "VERDICT_UNSPECIFIED",
    coverageState: idx.coverageState ?? null,
    robotsState: idx.robotsTxtState ?? null,
    indexingState: idx.indexingState ?? null,
    pageFetchState: idx.pageFetchState ?? null,
    lastCrawlTime: idx.lastCrawlTime ? new Date(idx.lastCrawlTime) : null,
    googleCanonical: idx.googleCanonical ?? null,
    userCanonical: idx.userCanonical ?? null,
    crawledAs: idx.crawledAs ?? null,
    richResultsVerdict: rich?.verdict ?? null,
  };
}

/** Inspect + upsert. Idempotent — re-running just refreshes the row. */
export async function inspectAndStore(url: string): Promise<IndexInspection> {
  const result = await inspectUrl(url);
  await prisma.gscIndexCheck.upsert({
    where: { url },
    create: { url, ...result },
    update: { ...result, checkedAt: new Date() },
  });
  return result;
}

/**
 * Inspect every public URL Biomax cares about and persist results.
 * Designed for weekly cron — one URL per ~600 ms (well under the 600/min
 * burst limit) and well within the 2000/day quota for ~50 URLs.
 */
export async function inspectAllSitePages(): Promise<{
  inspected: number;
  failed: number;
}> {
  const products = await prisma.product.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true },
  });
  const property = process.env.GSC_PROPERTY!;
  // GSC_PROPERTY is the verified site URL (with trailing slash). Strip the
  // trailing slash to compose absolute URLs.
  const base = property.replace(/\/$/, "");

  const urls = [
    `${base}/`,
    `${base}/produkter`,
    `${base}/kunskap`,
    `${base}/kunskap/ingredienser`,
    ...products.map((p) => `${base}/produkter/${p.slug}`),
  ];

  let inspected = 0;
  let failed = 0;
  for (const url of urls) {
    try {
      await inspectAndStore(url);
      inspected++;
    } catch (err) {
      console.error(`[gsc-inspect] failed for ${url}:`, err);
      failed++;
    }
    // 600 ms gap → 100 calls/min. Safely under the 600/min limit.
    await new Promise((r) => setTimeout(r, 600));
  }

  return { inspected, failed };
}

// ── Read API ────────────────────────────────────────────────────────

/** Fetch the stored verdict for a URL, or null if never inspected. */
export async function getIndexCheck(
  url: string
): Promise<Awaited<ReturnType<typeof prisma.gscIndexCheck.findUnique>>> {
  return prisma.gscIndexCheck.findUnique({ where: { url } });
}

export type IndexCheckSummary = {
  total: number;
  pass: number;
  partial: number;
  fail: number;
  neutral: number;
  /** Pages with non-PASS verdict — the action queue. */
  problems: Array<{
    url: string;
    verdict: string;
    coverageState: string | null;
    checkedAt: Date;
  }>;
};

/** Site-wide summary for the /admin/seo dashboard. */
export async function getIndexCheckSummary(): Promise<IndexCheckSummary> {
  const all = await prisma.gscIndexCheck.findMany({
    orderBy: { checkedAt: "desc" },
    select: {
      url: true,
      verdict: true,
      coverageState: true,
      checkedAt: true,
    },
  });
  const counts = { PASS: 0, PARTIAL: 0, FAIL: 0, NEUTRAL: 0 };
  for (const r of all) {
    if (r.verdict in counts) counts[r.verdict as keyof typeof counts]++;
  }
  return {
    total: all.length,
    pass: counts.PASS,
    partial: counts.PARTIAL,
    fail: counts.FAIL,
    neutral: counts.NEUTRAL,
    problems: all.filter((r) => r.verdict !== "PASS"),
  };
}

// ── Display helpers ─────────────────────────────────────────────────

export function indexBadge(verdict: string): {
  label: string;
  tone: "ok" | "warn" | "error" | "muted";
} {
  switch (verdict) {
    case "PASS":
      return { label: "Indexerad", tone: "ok" };
    case "PARTIAL":
      return { label: "Delvis indexerad", tone: "warn" };
    case "FAIL":
      return { label: "Inte indexerad", tone: "error" };
    case "NEUTRAL":
      return { label: "Okänt", tone: "muted" };
    default:
      return { label: "Ej kontrollerad", tone: "muted" };
  }
}
