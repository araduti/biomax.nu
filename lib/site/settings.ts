import { prisma } from "@/lib/prisma";

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
} as const;

type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

const DEFAULTS: Record<SettingKey, unknown> = {
  shipping_flat_sek: 49,
  free_shipping_threshold_sek: 599,
  low_stock_default: 5,
};

async function readRaw(key: SettingKey): Promise<unknown> {
  const row = await prisma.siteSetting.findUnique({
    where: { key },
    select: { value: true },
  });
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

export async function getShippingRules(): Promise<ShippingRules> {
  const [flat, thresholdRow] = await Promise.all([
    readRaw(SETTING_KEYS.shippingFlatSek),
    // Read the raw row separately so we can distinguish "row exists with
    // value null" (= no free shipping ever) from "row doesn't exist"
    // (= use the default).
    prisma.siteSetting.findUnique({
      where: { key: SETTING_KEYS.freeShippingThresholdSek },
      select: { value: true },
    }),
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

export async function getLowStockDefault(): Promise<number> {
  return asInt(await readRaw(SETTING_KEYS.lowStockDefault), 5);
}

/** Bulk read used by the admin settings page so all keys round-trip in one query. */
export async function getAllSettings(): Promise<Record<SettingKey, unknown>> {
  const rows = await prisma.siteSetting.findMany({
    where: { key: { in: Object.values(SETTING_KEYS) } },
    select: { key: true, value: true },
  });
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  const out = {} as Record<SettingKey, unknown>;
  for (const key of Object.values(SETTING_KEYS)) {
    out[key] = byKey.get(key) ?? DEFAULTS[key];
  }
  return out;
}
