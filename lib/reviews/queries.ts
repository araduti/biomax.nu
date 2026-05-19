import { hostTenantScope } from "@/lib/tenant/db";
import type { ReviewStatus } from "@prisma/client";

/**
 * Find the current user's latest review for a product, irrespective of
 * moderation status. Used by the product page to swap the submission
 * form for a "your review is in"-confirmation when the user has already
 * reviewed (mirrors the server-side guard in submitReview).
 */
export async function getMyReviewForProduct(
  userId: string,
  productId: string
): Promise<{ status: ReviewStatus; createdAt: Date } | null> {
  return hostTenantScope((tx) =>
    tx.review.findFirst({
      where: { userId, productId },
      orderBy: { createdAt: "desc" },
      select: { status: true, createdAt: true },
    })
  );
}

export type PublicReview = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  verified: boolean;
  authorDisplay: string;
  createdAt: Date;
  storeResponse: string | null;
  storeRespondedAt: Date | null;
  /** Optional behov-slug the reviewer bought this product for. NULL when
   *  the reviewer didn't supply one (legacy or skip). */
  reviewerGoal: string | null;
};

export type ReviewAggregate = {
  count: number;
  /** Decimal average, 0–5. 0 when count === 0. */
  average: number;
  /** Histogram: [5★, 4★, 3★, 2★, 1★] in this order. */
  histogram: [number, number, number, number, number];
};

/**
 * Public-facing review list for a product — APPROVED only, newest first.
 * Optional `goalFilter` narrows to reviews where the reviewer ticked
 * "Köpt för X". `null` returns all. Limit defaults to 20 to keep PDP lean.
 */
export async function getProductReviews(
  productId: string,
  limit = 20,
  goalFilter: string | null = null
): Promise<PublicReview[]> {
  const rows = await hostTenantScope((tx) =>
    tx.review.findMany({
      where: {
        productId,
        status: "APPROVED",
        ...(goalFilter ? { reviewerGoal: goalFilter } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        rating: true,
        title: true,
        body: true,
        verified: true,
        authorName: true,
        createdAt: true,
        storeResponse: true,
        storeRespondedAt: true,
        reviewerGoal: true,
        user: { select: { name: true } },
      },
    })
  );
  return rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    body: r.body ?? "",
    verified: r.verified,
    authorDisplay: r.authorName?.trim() || r.user?.name || "Anonym kund",
    createdAt: r.createdAt,
    storeResponse: r.storeResponse,
    storeRespondedAt: r.storeRespondedAt,
    reviewerGoal: r.reviewerGoal,
  }));
}

/**
 * Per-goal review counts for the filter chips. Lets the PDP render
 * "Sömn (12) · Stress (8) · Energi (3)" without per-chip queries.
 */
export async function getReviewGoalCounts(
  productId: string
): Promise<Array<{ goal: string; count: number }>> {
  const rows = await hostTenantScope((tx) =>
    tx.review.groupBy({
      by: ["reviewerGoal"],
      where: {
        productId,
        status: "APPROVED",
        reviewerGoal: { not: null },
      },
      _count: { reviewerGoal: true },
      orderBy: { _count: { reviewerGoal: "desc" } },
    })
  );
  return rows
    .map((r) => ({
      goal: r.reviewerGoal ?? "",
      count: r._count.reviewerGoal,
    }))
    .filter((r) => r.goal);
}

/**
 * Aggregate rating for the hero badge + AggregateRating JSON-LD.
 * Counts only APPROVED reviews — pending/rejected don't influence the
 * publicly displayed stars.
 */
export async function getProductRating(
  productId: string
): Promise<ReviewAggregate> {
  const grouped = await hostTenantScope((tx) =>
    tx.review.groupBy({
      by: ["rating"],
      where: { productId, status: "APPROVED" },
      _count: { rating: true },
    })
  );

  const histogram: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  let count = 0;
  let sum = 0;
  for (const row of grouped) {
    const c = row._count.rating;
    count += c;
    sum += row.rating * c;
    // rating 5 → index 0, rating 1 → index 4
    const idx = 5 - row.rating;
    if (idx >= 0 && idx < 5) histogram[idx] = c;
  }
  return {
    count,
    average: count === 0 ? 0 : Math.round((sum / count) * 10) / 10,
    histogram,
  };
}

/**
 * Cross-product review pull for goal landing pages (`/hjalp/[slug]`).
 *
 * Returns APPROVED reviews authored by customers who tagged the same
 * `reviewerGoal` as the landing-page slug, across the curated products
 * the page renders. The intent is "Vad andra med samma besvär säger" —
 * social proof tied to the visitor's situation, not generic stars.
 *
 * Ordered: newest first within each product. We surface `productName`
 * + `productSlug` so the consumer can link the quote back to its source
 * PDP. A length-floor on the body keeps one-word reviews ("bra!") out of
 * the strip — they don't carry their weight as social proof on a goal
 * page.
 */
export type GoalReviewQuote = PublicReview & {
  productSlug: string;
  productName: string;
};

export async function getGoalReviewsForProducts(
  productIds: string[],
  goalSlug: string,
  limit = 4,
  minBodyChars = 60
): Promise<GoalReviewQuote[]> {
  if (productIds.length === 0) return [];
  const rows = await hostTenantScope((tx) =>
    tx.review.findMany({
      where: {
        productId: { in: productIds },
        reviewerGoal: goalSlug,
        status: "APPROVED",
      },
      orderBy: { createdAt: "desc" },
      take: limit * 4,
      select: {
        id: true,
        rating: true,
        title: true,
        body: true,
        verified: true,
        authorName: true,
        createdAt: true,
        storeResponse: true,
        storeRespondedAt: true,
        reviewerGoal: true,
        user: { select: { name: true } },
        product: { select: { slug: true, name: true } },
      },
    })
  );
  return rows
    .filter((r) => (r.body ?? "").trim().length >= minBodyChars)
    .slice(0, limit)
    .map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body ?? "",
      verified: r.verified,
      authorDisplay: r.authorName?.trim() || r.user?.name || "Anonym kund",
      createdAt: r.createdAt,
      storeResponse: r.storeResponse,
      storeRespondedAt: r.storeRespondedAt,
      reviewerGoal: r.reviewerGoal,
      productSlug: r.product.slug,
      productName: r.product.name,
    }));
}

/** Bulk aggregate for the catalogue listing — single query, keyed by id. */
export async function getRatingsByProductIds(
  productIds: string[]
): Promise<Map<string, { count: number; average: number }>> {
  if (productIds.length === 0) return new Map();
  const rows = await hostTenantScope((tx) =>
    tx.review.groupBy({
      by: ["productId"],
      where: { productId: { in: productIds }, status: "APPROVED" },
      _count: { rating: true },
      _avg: { rating: true },
    })
  );
  const out = new Map<string, { count: number; average: number }>();
  for (const r of rows) {
    out.set(r.productId, {
      count: r._count.rating,
      average: r._avg.rating === null ? 0 : Math.round(r._avg.rating * 10) / 10,
    });
  }
  return out;
}
