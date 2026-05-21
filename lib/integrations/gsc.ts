/**
 * Google Search Console API client.
 *
 * Same mode-boundary pattern as Klarna/Brevo/Sentry: works as a stub locally,
 * comes alive in production when env vars are set. The integration uses a
 * **service account** (no OAuth dance, no refresh tokens, no consent screens)
 * — the simplest auth path for an internal admin tool.
 *
 * Setup contract (one-time, documented in ADR 0014):
 *   1. Create a Google Cloud service account
 *   2. Download its JSON key, paste into env var GSC_SERVICE_ACCOUNT_KEY
 *   3. In Search Console, add the service account email as a "Restricted user"
 *      of the verified property (e.g. https://www.biomax.nu/)
 *   4. Set GSC_PROPERTY env to that property URL
 *
 * Required env (production only):
 *   GSC_SERVICE_ACCOUNT_KEY  — entire JSON key file as a string
 *   GSC_PROPERTY             — site URL (e.g. "https://www.biomax.nu/" — note trailing slash)
 *
 * Without those, all functions return null/empty so /admin/seo just shows the
 * "Anslut Google Search Console" empty state.
 */
import { JWT } from "google-auth-library";

const API_BASE = "https://searchconsole.googleapis.com/webmasters/v3";

let cachedClient: JWT | null = null;
let cachedKeyHash: string | null = null;

export function isGscConfigured(): boolean {
  return (
    !!process.env.GSC_SERVICE_ACCOUNT_KEY?.trim() &&
    !!process.env.GSC_PROPERTY?.trim()
  );
}

/** Lazily build (and reuse) the JWT client across requests within the process. */
function getClient(): JWT {
  const raw = process.env.GSC_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error("GSC_SERVICE_ACCOUNT_KEY is not set");

  const hash = simpleHash(raw);
  if (cachedClient && cachedKeyHash === hash) return cachedClient;

  let creds: { client_email: string; private_key: string };
  try {
    creds = JSON.parse(raw);
  } catch {
    throw new Error("GSC_SERVICE_ACCOUNT_KEY is not valid JSON");
  }
  if (!creds.client_email || !creds.private_key) {
    throw new Error("GSC_SERVICE_ACCOUNT_KEY missing client_email or private_key");
  }

  cachedClient = new JWT({
    email: creds.client_email,
    key: creds.private_key.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
  cachedKeyHash = hash;
  return cachedClient;
}

function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h.toString(36);
}

async function gscFetch<T>(path: string, body: unknown): Promise<T> {
  const client = getClient();
  const property = process.env.GSC_PROPERTY!;
  const url = `${API_BASE}/sites/${encodeURIComponent(property)}${path}`;
  const res = await client.request<T>({
    url,
    method: "POST",
    data: body,
  });
  return res.data;
}

// ── Domain types ────────────────────────────────────────────────────

export type GscRow = {
  query?: string;
  page?: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GscSummary = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  /** Same metrics for the immediately-preceding equal-length window. */
  previous: {
    clicks: number;
    impressions: number;
  } | null;
};

// ── Date helpers — GSC uses UTC dates in YYYY-MM-DD ─────────────────

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function daysAgo(n: number): string {
  // GSC data lags ~2 days; we shift the window accordingly.
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return isoDate(d);
}

const DEFAULT_LAG_DAYS = 2;
const DEFAULT_WINDOW_DAYS = 28;

// ── Public API ──────────────────────────────────────────────────────

/**
 * Top queries driving traffic to the site over the last 28 days (with the
 * ~2-day GSC freshness lag applied). Returns an empty array when GSC is not
 * configured so callers don't need to special-case.
 */
/**
 * Google's Search Analytics API returns rows shaped `{ keys: [...],
 * clicks, impressions, ctr, position }`, where `keys` is positional and
 * indexed by the request's `dimensions` array. We map `keys[0]` to the
 * named field consumers expect (`query` / `page`).
 */
type RawGscRow = {
  keys?: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

function mapToQueryRow(r: RawGscRow): GscRow {
  return {
    query: r.keys?.[0],
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr,
    position: r.position,
  };
}

function mapToPageRow(r: RawGscRow): GscRow {
  return {
    page: r.keys?.[0],
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr,
    position: r.position,
  };
}

export async function getTopQueries(limit = 25): Promise<GscRow[]> {
  if (!isGscConfigured()) return [];
  const startDate = daysAgo(DEFAULT_LAG_DAYS + DEFAULT_WINDOW_DAYS);
  const endDate = daysAgo(DEFAULT_LAG_DAYS);
  try {
    const data = await gscFetch<{ rows?: RawGscRow[] }>(
      "/searchAnalytics/query",
      {
        startDate,
        endDate,
        dimensions: ["query"],
        rowLimit: limit,
      }
    );
    return (data.rows ?? []).map(mapToQueryRow);
  } catch (err) {
    console.error("[gsc] getTopQueries failed:", err);
    return [];
  }
}

/** Top landing pages — useful for spotting which routes drive organic traffic. */
export async function getTopPages(limit = 25): Promise<GscRow[]> {
  if (!isGscConfigured()) return [];
  const startDate = daysAgo(DEFAULT_LAG_DAYS + DEFAULT_WINDOW_DAYS);
  const endDate = daysAgo(DEFAULT_LAG_DAYS);
  try {
    const data = await gscFetch<{ rows?: RawGscRow[] }>(
      "/searchAnalytics/query",
      {
        startDate,
        endDate,
        dimensions: ["page"],
        rowLimit: limit,
      }
    );
    return (data.rows ?? []).map(mapToPageRow);
  } catch (err) {
    console.error("[gsc] getTopPages failed:", err);
    return [];
  }
}

/**
 * Site-wide summary for the last 28 days plus the prior 28 for delta. We make
 * both calls in parallel and tolerate either failing — the dashboard renders
 * with whatever it gets.
 */
export async function getSiteSummary(): Promise<GscSummary | null> {
  if (!isGscConfigured()) return null;
  const lag = DEFAULT_LAG_DAYS;
  const window = DEFAULT_WINDOW_DAYS;
  const currStart = daysAgo(lag + window);
  const currEnd = daysAgo(lag);
  const prevStart = daysAgo(lag + window * 2);
  const prevEnd = daysAgo(lag + window + 1);

  try {
    const [curr, prev] = await Promise.all([
      gscFetch<{ rows?: { clicks: number; impressions: number; ctr: number; position: number }[] }>(
        "/searchAnalytics/query",
        { startDate: currStart, endDate: currEnd, dimensions: [] }
      ),
      gscFetch<{ rows?: { clicks: number; impressions: number }[] }>(
        "/searchAnalytics/query",
        { startDate: prevStart, endDate: prevEnd, dimensions: [] }
      ).catch(() => ({ rows: undefined })),
    ]);

    const c = curr.rows?.[0];
    if (!c) return null;
    const p = prev.rows?.[0];
    return {
      clicks: c.clicks,
      impressions: c.impressions,
      ctr: c.ctr,
      position: c.position,
      previous: p
        ? { clicks: p.clicks, impressions: p.impressions }
        : null,
    };
  } catch (err) {
    console.error("[gsc] getSiteSummary failed:", err);
    return null;
  }
}

/**
 * Per-page query breakdown. Used on /admin/produkter/[slug] to show "what
 * queries are driving traffic to THIS product". Cached for 30 min — GSC
 * data lags ~48h anyway, so anything more aggressive is wasted, and this
 * lets the admin route stay dynamic (no whole-page ISR on a private route).
 *
 * GSC integration is single-tenant today (one GSC_PROPERTY env var, biomax-
 * specific) — the cache key already includes the tenant-distinguishing page
 * URL (each tenant has its own hostname), so a global cache key is safe even
 * under strict RLS. When GSC becomes per-tenant (industry-supplements pack),
 * migrate to tenantCache(). ADR 0032 D4 escape hatch.
 */
// eslint-disable-next-line no-restricted-imports
import { unstable_cache } from "next/cache";

async function _getQueriesForPage(
  url: string,
  limit = 15
): Promise<GscRow[]> {
  if (!isGscConfigured()) return [];
  const startDate = daysAgo(DEFAULT_LAG_DAYS + DEFAULT_WINDOW_DAYS);
  const endDate = daysAgo(DEFAULT_LAG_DAYS);
  try {
    const data = await gscFetch<{ rows?: RawGscRow[] }>(
      "/searchAnalytics/query",
      {
        startDate,
        endDate,
        dimensions: ["query"],
        rowLimit: limit,
        dimensionFilterGroups: [
          {
            filters: [
              { dimension: "page", operator: "equals", expression: url },
            ],
          },
        ],
      }
    );
    return (data.rows ?? []).map(mapToQueryRow);
  } catch (err) {
    console.error("[gsc] getQueriesForPage failed:", err);
    return [];
  }
}

export async function getQueriesForPage(
  url: string,
  limit = 15
): Promise<GscRow[]> {
  // GSC integration is currently single-tenant — one GSC_PROPERTY env
  // var (biomax-specific, #16 flagged for per-tenant config in the
  // industry-supplements pack). The cache key includes `url` which is
  // tenant-distinguishing by construction (each tenant has its own
  // hostname), so this is safe even at strict-RLS post-#3f. When the
  // GSC integration becomes per-tenant, migrate to tenantCache().
  // eslint-disable-next-line no-restricted-imports
  return unstable_cache(
    () => _getQueriesForPage(url, limit),
    ["gsc:queries-for-page", url, String(limit)],
    { revalidate: 1800, tags: ["gsc:queries-for-page"] }
  )();
}

/** Format ratio as a percent string (0.0234 → "2.3 %"). */
export function fmtCtr(ctr: number): string {
  return `${(ctr * 100).toFixed(1)} %`;
}

/** Format position with one decimal ("3.41" → "3.4"). */
export function fmtPosition(position: number): string {
  return position.toFixed(1);
}
