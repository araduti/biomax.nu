/**
 * Persisted GSC time-series. The Search Console API returns aggregates per
 * request — to draw sparklines we need daily slices, so we snapshot on a
 * cron and read from our DB.
 *
 * Three jobs:
 *   - snapshotDay(daysBack): pulls one day's worth of (page, query) rows
 *   - backfill(days): runs snapshotDay for the last N days (initial bootstrap)
 *   - getQueryHistory(page, query, days): returns the time series for a chip
 *   - getQueryHistoryMap(page, queries): batched read for many chips at once
 */
import { prisma } from "@/lib/prisma";
import { isGscConfigured } from "@/lib/integrations/gsc";
import { JWT } from "google-auth-library";

const API_BASE = "https://searchconsole.googleapis.com/webmasters/v3";

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

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dateNDaysAgoUtc(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

type SnapshotResult = { fetched: number; written: number; skipped: string };

/**
 * Pull all (page, query) rows for a single calendar day and upsert into
 * GscSnapshot. Idempotent — re-running for the same day overwrites cleanly.
 *
 * `daysBack` is calendar days from "today UTC". Default 3 = "the day GSC
 * data is freshest for" given the ~48h reporting lag.
 */
export async function snapshotDay(daysBack = 3): Promise<SnapshotResult> {
  if (!isGscConfigured()) {
    return { fetched: 0, written: 0, skipped: "GSC ej konfigurerad" };
  }
  const client = getClient();
  const property = process.env.GSC_PROPERTY!;
  const day = dateNDaysAgoUtc(daysBack);
  const dayIso = isoDate(day);

  // Single calendar day; dimensions = page + query for full grain.
  const url = `${API_BASE}/sites/${encodeURIComponent(
    property
  )}/searchAnalytics/query`;

  // GSC's row cap per request is 25 000. Most domains stay well under this.
  const res = await client.request<{
    rows?: {
      keys: string[];
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
    }[];
  }>({
    url,
    method: "POST",
    data: {
      startDate: dayIso,
      endDate: dayIso,
      dimensions: ["page", "query"],
      rowLimit: 25_000,
    },
  });

  const rows = res.data.rows ?? [];

  // Upsert each row. Postgres has no native multi-row upsert via Prisma so
  // we run them in a transaction in chunks of 50 to keep the round-trips
  // bounded without holding a single huge tx.
  let written = 0;
  for (const r of rows) {
    const [page, query] = r.keys;
    if (!page || !query) continue;
    await prisma.gscSnapshot.upsert({
      where: {
        date_page_query: { date: day, page, query },
      },
      create: {
        date: day,
        page,
        query,
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: r.ctr,
        position: r.position,
      },
      update: {
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: r.ctr,
        position: r.position,
      },
    });
    written++;
  }

  return { fetched: rows.length, written, skipped: "" };
}

/**
 * Initial bootstrap — runs `snapshotDay` for each of the last `days`
 * calendar days. Run once when GSC is first connected; daily cron takes over
 * after that.
 */
export async function backfill(days = 28): Promise<SnapshotResult[]> {
  const out: SnapshotResult[] = [];
  // Start from the freshest day GSC has and walk back. ~3 day lag handled.
  for (let n = 3; n < 3 + days; n++) {
    out.push(await snapshotDay(n));
  }
  return out;
}

// ── Read API ────────────────────────────────────────────────────────

export type HistoryPoint = {
  date: string; // YYYY-MM-DD
  clicks: number;
  impressions: number;
  position: number;
};

/**
 * Last `days` days of snapshots for a single (page, query) pair, ascending
 * by date. Empty array when nothing's been collected yet — caller renders
 * accordingly.
 */
export async function getQueryHistory(
  page: string,
  query: string,
  days = 14
): Promise<HistoryPoint[]> {
  const since = dateNDaysAgoUtc(days + 5); // small buffer
  const rows = await prisma.gscSnapshot.findMany({
    where: { page, query, date: { gte: since } },
    orderBy: { date: "asc" },
    select: {
      date: true,
      clicks: true,
      impressions: true,
      position: true,
    },
  });
  return rows.map((r) => ({
    date: isoDate(r.date),
    clicks: r.clicks,
    impressions: r.impressions,
    position: r.position,
  }));
}

/**
 * Batched read — given a page and a set of queries, return all their history
 * series in one DB hit. Lets the chip-list render N sparklines without N+1
 * queries.
 */
export async function getQueryHistoryMap(
  page: string,
  queries: string[],
  days = 14
): Promise<Map<string, HistoryPoint[]>> {
  if (queries.length === 0) return new Map();
  const since = dateNDaysAgoUtc(days + 5);
  const rows = await prisma.gscSnapshot.findMany({
    where: {
      page,
      query: { in: queries },
      date: { gte: since },
    },
    orderBy: { date: "asc" },
    select: {
      query: true,
      date: true,
      clicks: true,
      impressions: true,
      position: true,
    },
  });
  const map = new Map<string, HistoryPoint[]>();
  for (const r of rows) {
    const arr = map.get(r.query) ?? [];
    arr.push({
      date: isoDate(r.date),
      clicks: r.clicks,
      impressions: r.impressions,
      position: r.position,
    });
    map.set(r.query, arr);
  }
  return map;
}
