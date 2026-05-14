/**
 * Familjen Biomax — loyalty program constants.
 *
 * Single source of truth for earn/burn mechanics. Live in code (not the
 * DB) so historical transactions are immutable — changing a constant
 * affects future awards only, never re-prices past EARN_ORDER rows.
 *
 * Coding rule: every place that needs a rate must import from here.
 * Hard-coding "10 kr per 100 poäng" in copy is fine, but the arithmetic
 * must go through these constants so a future tweak (5 kr per 100 poäng,
 * say) is a one-line change.
 */

/** Points earned per 1 kr of gross order total (paid amount). */
export const POINTS_PER_KR_EARNED = 1;

/** Welcome bonus credited at signup / auto-enroll. */
export const WELCOME_BONUS_POINTS = 50;

/**
 * Phase-2 redemption ratio: 100 points = 10 kr discount at checkout.
 * Encoded as the inverse rate (öre per point) to keep integer math —
 * 1 point = 10 öre = 0.10 kr. Use `pointsToOre(pts)` to convert.
 */
export const ORE_PER_POINT = 10;

/**
 * Minimum redemption block. Lets us avoid "spend 7 points to save 70
 * öre" UX, and keeps the discount column readable. Tunable.
 */
export const MIN_REDEMPTION_POINTS = 100;

/** Rolling inactivity window before an account expires. */
export const LOYALTY_INACTIVITY_MONTHS = 24;

/** Public program name — used everywhere in copy. */
export const LOYALTY_PROGRAM_NAME = "Familjen Biomax";

/** Convert points to öre (1 öre = 0.01 kr) for checkout math. */
export function pointsToOre(points: number): number {
  return points * ORE_PER_POINT;
}

/** Convert points to kr (decimal) for display. */
export function pointsToKr(points: number): number {
  return (points * ORE_PER_POINT) / 100;
}

/** Compute points earned for a given paid amount in kr (gross). */
export function pointsFromKr(kr: number): number {
  return Math.floor(kr * POINTS_PER_KR_EARNED);
}
