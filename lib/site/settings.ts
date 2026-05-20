import { cache } from "react";
import { hostTenantScope } from "@/lib/tenant/db";
import { tenantCache } from "@/lib/tenant/cache";
import { currentTenant } from "@/lib/tenant";
import { siteSettingsCacheTag } from "@/lib/cache/tags";

/**
 * All site-setting keys. Adding a new setting? Add it here, the default
 * below, and a typed helper if it has structured shape. The string-typed
 * lookup is intentional — saves a migration per setting at the cost of
 * needing this single registry to stay accurate.
 */
export const SETTING_KEYS = {
  shippingFlatSek: "shipping_flat_sek",
  freeShippingThresholdSek: "free_shipping_threshold_sek",
  lowStockDefault: "low_stock_default",
  /// Comma-separated emails that receive the daily low-stock alert.
  /// Stored as a single string for simplicity; the cron splits on `,`.
  warehouseAlertEmails: "warehouse_alert_emails",
  /// Trustpilot live numbers — pasted by an admin (or, when paid-tier
  /// API access lands, refreshed by a weekly cron). When unset, the
  /// hero strip renders a CTA-only variant (no fabricated score).
  trustpilotRating: "trustpilot_rating",
  trustpilotReviewCount: "trustpilot_review_count",
  trustpilotProfileUrl: "trustpilot_profile_url",
} as const;

type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

const DEFAULTS: Record<SettingKey, unknown> = {
  shipping_flat_sek: 49,
  // Matches the historical value used across the site (top-bar, cart,
  // checkout, /faq, /villkor, /kop, /frakt-och-retur). Source-of-truth
  // here; everywhere else reads via getShippingRules().
  free_shipping_threshold_sek: 499,
  low_stock_default: 5,
  warehouse_alert_emails: "",
  trustpilot_rating: null,
  trustpilot_review_count: null,
  trustpilot_profile_url: "https://se.trustpilot.com/review/biomax.nu",
};

async function readRaw(key: SettingKey): Promise<unknown> {
  const row = await hostTenantScope((tx) =>
    tx.siteSetting.findUnique({
      where: { key },
      select: { value: true },
    })
  );
  return row?.value ?? DEFAULTS[key];
}

function asInt(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string") {
    const n = parseInt(value, 10);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

export type ShippingRules = {
  flatSek: number;
  freeThresholdSek: number | null;
};

async function getShippingRulesUncached(): Promise<ShippingRules> {
  const [flat, thresholdRow] = await Promise.all([
    readRaw(SETTING_KEYS.shippingFlatSek),
    // Read the raw row separately so we can distinguish "row exists with
    // value null" (= no free shipping ever) from "row doesn't exist"
    // (= use the default).
    hostTenantScope((tx) =>
      tx.siteSetting.findUnique({
        where: { key: SETTING_KEYS.freeShippingThresholdSek },
        select: { value: true },
      })
    ),
  ]);
  let freeThresholdSek: number | null;
  if (thresholdRow === null) {
    freeThresholdSek = asInt(DEFAULTS.free_shipping_threshold_sek, 599);
  } else if (thresholdRow.value === null) {
    freeThresholdSek = null;
  } else {
    freeThresholdSek = asInt(thresholdRow.value, 599);
  }
  return {
    flatSek: asInt(flat, 49),
    freeThresholdSek,
  };
}

/**
 * Cached shipping rules. Called from the root layout, top-bar and
 * product hero — i.e. several times per render. `cache()` collapses
 * same-render duplicates; `unstable_cache` (tag `site-settings`)
 * serves it from cache between admin saves instead of hitting the DB
 * on every page render. Invalidated by `updateShippingRules`.
 */
export const getShippingRules = cache(async (): Promise<ShippingRules> => {
  const tenant = await currentTenant();
  return tenantCache(
    tenant.id,
    getShippingRulesUncached,
    ["site:shipping-rules"],
    { tags: [siteSettingsCacheTag()], revalidate: 3600 }
  )();
});

export async function getLowStockDefault(): Promise<number> {
  return asInt(await readRaw(SETTING_KEYS.lowStockDefault), 5);
}

/**
 * Parsed list of emails that receive the daily low-stock alert. Empty
 * array means "no warehouse contact configured" — the cron logs and
 * exits without sending.
 */
export async function getWarehouseAlertEmails(): Promise<string[]> {
  const raw = await readRaw(SETTING_KEYS.warehouseAlertEmails);
  if (typeof raw !== "string" || raw.trim().length === 0) return [];
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
}

export type TrustpilotSummary = {
  rating: number | null;
  reviewCount: number | null;
  profileUrl: string;
};

/**
 * Live Trustpilot numbers from SiteSetting. The widget treats null
 * rating/count as "we haven't got data yet" and renders a CTA-only
 * variant instead of fabricating a score.
 */
async function getTrustpilotSummaryUncached(): Promise<TrustpilotSummary> {
  const [ratingRaw, countRaw, urlRaw] = await Promise.all([
    readRaw(SETTING_KEYS.trustpilotRating),
    readRaw(SETTING_KEYS.trustpilotReviewCount),
    readRaw(SETTING_KEYS.trustpilotProfileUrl),
  ]);
  const rating =
    typeof ratingRaw === "number"
      ? ratingRaw
      : typeof ratingRaw === "string" && ratingRaw.trim().length > 0
        ? parseFloat(ratingRaw)
        : null;
  const reviewCount = asInt(countRaw, 0) || null;
  const profileUrl =
    typeof urlRaw === "string" && urlRaw.trim().length > 0
      ? urlRaw
      : "https://se.trustpilot.com/review/biomax.nu";
  return {
    rating: rating && Number.isFinite(rating) ? rating : null,
    reviewCount,
    profileUrl,
  };
}

/**
 * Cached Trustpilot summary. Rendered in the homepage Trustpilot bar
 * on every ISR revalidation; the numbers are admin-written, not
 * per-request. Invalidated by `updateTrustpilotSummary`.
 */
export const getTrustpilotSummary = cache(async (): Promise<TrustpilotSummary> => {
  const tenant = await currentTenant();
  return tenantCache(
    tenant.id,
    getTrustpilotSummaryUncached,
    ["site:trustpilot"],
    { tags: [siteSettingsCacheTag()], revalidate: 3600 }
  )();
});

/** Bulk read used by the admin settings page so all keys round-trip in one query. */
export async function getAllSettings(): Promise<Record<SettingKey, unknown>> {
  const rows = await hostTenantScope((tx) =>
    tx.siteSetting.findMany({
      where: { key: { in: Object.values(SETTING_KEYS) } },
      select: { key: true, value: true },
    })
  );
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  const out = {} as Record<SettingKey, unknown>;
  for (const key of Object.values(SETTING_KEYS)) {
    out[key] = byKey.get(key) ?? DEFAULTS[key];
  }
  return out;
}
