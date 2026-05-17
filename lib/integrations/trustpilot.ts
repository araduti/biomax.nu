/**
 * Trustpilot — env-gated, cached. Returns real rating/count + recent
 * reviews when TRUSTPILOT_* is configured; otherwise `null`. We never
 * fabricate a rating or review count (standing rule) — callers fall
 * back to non-numeric trust copy when this returns null.
 *
 * Env:
 *   TRUSTPILOT_API_KEY          — Business API key
 *   TRUSTPILOT_BUSINESS_UNIT_ID — the biomax.nu business unit id
 *
 * Cached 24h via `next: { revalidate }`.
 */

const API_KEY = process.env.TRUSTPILOT_API_KEY?.trim();
const UNIT_ID = process.env.TRUSTPILOT_BUSINESS_UNIT_ID?.trim();
const BASE = "https://api.trustpilot.com/v1";
const DAY = 86_400;

export type TrustpilotReview = {
  id: string;
  stars: number;
  title: string;
  text: string;
  name: string;
};

export type TrustpilotSummary = {
  rating: number; // e.g. 4.7
  count: number; // total reviews
  reviews: TrustpilotReview[]; // up to 3 recent 4★+
};

export function isTrustpilotConfigured(): boolean {
  return Boolean(API_KEY && UNIT_ID);
}

export async function getTrustpilotSummary(): Promise<TrustpilotSummary | null> {
  if (!isTrustpilotConfigured()) return null;
  try {
    const headers = { apikey: API_KEY as string };
    const [unitRes, revRes] = await Promise.all([
      fetch(`${BASE}/business-units/${UNIT_ID}`, {
        headers,
        next: { revalidate: DAY },
      }),
      fetch(
        `${BASE}/business-units/${UNIT_ID}/reviews?stars=4&stars=5&perPage=3&orderBy=createdat.desc`,
        { headers, next: { revalidate: DAY } }
      ),
    ]);
    if (!unitRes.ok) return null;
    const unit = (await unitRes.json()) as {
      score?: { trustScore?: number };
      numberOfReviews?: { total?: number };
    };
    const rating = Number(unit.score?.trustScore);
    const count = Number(unit.numberOfReviews?.total);
    if (!Number.isFinite(rating) || !Number.isFinite(count)) return null;

    let reviews: TrustpilotReview[] = [];
    if (revRes.ok) {
      const j = (await revRes.json()) as {
        reviews?: Array<{
          id: string;
          stars: number;
          title: string;
          text: string;
          consumer?: { displayName?: string };
        }>;
      };
      reviews = (j.reviews ?? []).slice(0, 3).map((r) => ({
        id: r.id,
        stars: r.stars,
        title: r.title,
        text: r.text,
        name: r.consumer?.displayName ?? "Verifierad kund",
      }));
    }
    return { rating, count, reviews };
  } catch {
    return null;
  }
}
