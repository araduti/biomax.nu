/**
 * Subscription configuration — single source of truth for the intervals
 * we expose in the UI and the default discount applied. Editor-side
 * tweaks happen in the database (Subscription.discountPercent /
 * intervalDays), not here, but new subscriptions default to these.
 */
export const SUBSCRIPTION_INTERVAL_DAYS = [30, 60, 90] as const;
export type SubscriptionIntervalDays = (typeof SUBSCRIPTION_INTERVAL_DAYS)[number];

export const DEFAULT_SUBSCRIPTION_DISCOUNT_PERCENT = 10;
export const DEFAULT_SUBSCRIPTION_INTERVAL_DAYS: SubscriptionIntervalDays = 30;

export function intervalLabelSwedish(days: number): string {
  switch (days) {
    case 30:
      return "Varje månad";
    case 60:
      return "Varannan månad";
    case 90:
      return "Varje kvartal";
    default:
      return `Var ${days}:e dag`;
  }
}
