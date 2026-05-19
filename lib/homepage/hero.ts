import { hostTenantScope } from "@/lib/tenant/db";
import { currentSeason, seasons, type Season, type SeasonMeta } from "@/lib/seasons";

/**
 * Resolve the homepage hero from the editor-managed `HomepageHero`
 * table, with a graceful fallback to the hardcoded `lib/seasons.ts` map.
 *
 * Selection rules:
 *   1. Only PUBLISHED rows are eligible.
 *   2. A row is "active right now" if:
 *        - it has a `season` matching `currentSeason()`, OR
 *        - now() falls within `[startsAt, endsAt]` (either bound may be NULL).
 *        - A row with BOTH season and date window must satisfy BOTH.
 *   3. Among active rows, highest `priority` wins. Ties broken by
 *      most recent `updatedAt`.
 *   4. If no row is active, fall back to the hardcoded seasons map.
 *
 * The returned shape matches `SeasonMeta` exactly so existing consumers
 * (the Hero component) don't have to change.
 */

export async function getActiveHero(now: Date = new Date()): Promise<SeasonMeta> {
  const season = currentSeason(now);

  // One round-trip: pull every published row that *could* be active.
  // Cheap (handful of rows) and lets us do the rank + tie-break in JS.
  const rows = await hostTenantScope((tx) =>
    tx.homepageHero.findMany({
      where: {
        status: "PUBLISHED",
        OR: [
          { season: { equals: dbSeason(season) } },
          {
            AND: [
              { season: null },
              // Date-window: startsAt ≤ now AND endsAt ≥ now (either nullable).
              {
                OR: [
                  { startsAt: null },
                  { startsAt: { lte: now } },
                ],
              },
              {
                OR: [
                  { endsAt: null },
                  { endsAt: { gte: now } },
                ],
              },
            ],
          },
        ],
      },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    })
  );

  // Even with a season match, the row's date window — if both set —
  // must include `now`. Filter that here so the DB query stayed simple.
  const active = rows.find((r) => {
    if (r.startsAt && r.startsAt > now) return false;
    if (r.endsAt && r.endsAt < now) return false;
    return true;
  });

  if (active) {
    return {
      id: season, // keep the consumer-facing season id stable for downstream styling
      label: seasons[season].label,
      motif: active.motif,
      caption: active.caption,
      accent: active.accent,
      photoUrl: active.photoUrl,
      photoAlt: active.photoAlt,
    };
  }

  // Fallback — hardcoded map. Keeps the homepage alive if the table is
  // empty, all rows are DRAFT/ARCHIVED, or the DB read fails upstream.
  return seasons[season];
}

/** Map our `Season` enum (string union) to the Prisma enum value. */
function dbSeason(s: Season): "var" | "sommar" | "host" | "vinter" {
  return s;
}
