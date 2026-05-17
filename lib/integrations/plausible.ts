/**
 * Plausible Stats API — server-side analytics for the Översikt
 * "Besök · konv." KPI (Phase 2 of the Direction D dashboard).
 *
 * Mode-boundary pattern, same as Klarna / PostNord / Unsplash:
 *
 *  - **Live**: `PLAUSIBLE_API_KEY` set → calls the v1 Aggregate
 *    endpoint with a Bearer token.
 *  - **Stub**: key absent → `getPlausibleSnapshot()` returns null and
 *    the KPI renders "—" (not a fabricated number).
 *
 * Resilience contract: analytics is *peripheral*. A Plausible outage,
 * rate-limit, or auth error must never break the dashboard — every
 * failure path returns null and the page degrades to "—". We never
 * throw out of this module.
 *
 * Site id reuses the public `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` already used
 * by the tracking script, so there's one source of truth for "which
 * Plausible site". Host follows `PLAUSIBLE_API_HOST` →
 * `NEXT_PUBLIC_PLAUSIBLE_HOST` → plausible.io (cloud default), so a
 * future self-hosted move is one env var.
 *
 * Server-only: the API key must never reach the client. Calls happen
 * in server components / server actions; CSP `connect-src` is
 * irrelevant here (browser-enforced only).
 */

const SITE_ID =
  process.env.PLAUSIBLE_SITE_ID ?? process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
const API_HOST = (
  process.env.PLAUSIBLE_API_HOST ??
  process.env.NEXT_PUBLIC_PLAUSIBLE_HOST ??
  "https://plausible.io"
).replace(/\/$/, "");

export function isPlausibleConfigured(): boolean {
  return Boolean(process.env.PLAUSIBLE_API_KEY?.trim() && SITE_ID);
}

/** Plausible v1 Aggregate periods we use. */
type Period = "day" | "month";

async function aggregateVisitors(period: Period): Promise<number | null> {
  if (!isPlausibleConfigured()) return null;
  const url = new URL(`${API_HOST}/api/v1/stats/aggregate`);
  url.searchParams.set("site_id", SITE_ID!);
  url.searchParams.set("period", period);
  url.searchParams.set("metrics", "visitors");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${process.env.PLAUSIBLE_API_KEY}`,
        Accept: "application/json",
      },
      // Plausible data lags only seconds, but the admin re-renders on
      // every navigation — a 10-min cache keeps us well under any rate
      // limit without the number ever feeling stale.
      next: { revalidate: 600 },
    });
    if (!res.ok) {
      console.warn(
        `[plausible] aggregate ${period} → ${res.status} ${await res
          .text()
          .catch(() => "")}`
      );
      return null;
    }
    const json = (await res.json()) as {
      results?: { visitors?: { value?: number } };
    };
    const v = json.results?.visitors?.value;
    return typeof v === "number" ? v : null;
  } catch (err) {
    console.warn("[plausible] aggregate failed:", err);
    return null;
  }
}

export type PlausibleSnapshot = {
  visitorsToday: number;
  visitorsMonth: number;
};

/**
 * Today's + this-month's unique visitors. Returns null when Plausible
 * isn't configured OR when the API is unreachable — callers render "—"
 * in both cases (configured-but-down and not-configured are the same
 * to the dashboard: no trustworthy number to show).
 */
export async function getPlausibleSnapshot(): Promise<PlausibleSnapshot | null> {
  if (!isPlausibleConfigured()) return null;
  const [today, month] = await Promise.all([
    aggregateVisitors("day"),
    aggregateVisitors("month"),
  ]);
  if (today === null && month === null) return null;
  return {
    visitorsToday: today ?? 0,
    visitorsMonth: month ?? 0,
  };
}
