/**
 * PostNord Service Points — find pickup ombud near a postal code.
 *
 * Mode-boundary pattern: when `POSTNORD_API_KEY` is set we call the real
 * endpoint; otherwise we return deterministic fixtures so dev/CI doesn't
 * need credentials. Same shape either way (see ./types.ts).
 *
 * Docs: https://developer.postnord.com/api/details/business-locations/find-by-postalcode
 */
import { stubServicePoints } from "./stub";
import type {
  FindServicePointsArgs,
  FindServicePointsResult,
  ServicePoint,
} from "./types";

const POSTNORD_BASE_URL =
  process.env.POSTNORD_BASE_URL ??
  "https://api2.postnord.com/rest/businesslocation/v5/servicepoints";

const SWE_POSTCODE_RE = /^\d{3}\s?\d{2}$/;

export function isPostNordConfigured(): boolean {
  return Boolean(process.env.POSTNORD_API_KEY);
}

function normalisePostalCode(input: string): string {
  return input.replace(/\s+/g, "");
}

/**
 * "07:00:00" → "07:00" so the UI doesn't have to truncate.
 */
function fmtTime(t: string | null | undefined): string {
  if (!t) return "";
  return t.slice(0, 5);
}

function formatHours(open?: string | null, close?: string | null): string {
  const o = fmtTime(open);
  const c = fmtTime(close);
  if (!o || !c) return "Stängt";
  return `${o}–${c}`;
}

type RawOpeningHour = {
  Day: string;
  Open1?: string;
  Close1?: string;
};

type RawServicePoint = {
  ServicePointId: string;
  Name: string;
  RouteDistance?: string | number;
  VisitingAddress?: {
    Street?: string;
    PostalCode?: string;
    City?: string;
    CountryCode?: string;
  };
  // PostNord uses "Coordinate" or "Coordinates" depending on endpoint version
  Coordinate?: { Northing?: string; Easting?: string };
  Coordinates?: Array<{ Northing?: string; Easting?: string }>;
  OpeningHours?: RawOpeningHour[];
  // Some payloads include a "Operator" subtree carrying the chain name.
  Operator?: string;
};

const WEEKDAY_INDEX: Record<string, number> = {
  MONDAY: 0,
  TUESDAY: 1,
  WEDNESDAY: 2,
  THURSDAY: 3,
  FRIDAY: 4,
  SATURDAY: 5,
  SUNDAY: 6,
};

function extractChain(name: string, operator?: string): string {
  if (operator) return operator;
  const head = name.split(/\s+/)[0] ?? name;
  return head;
}

function normalisePoint(raw: RawServicePoint): ServicePoint {
  const hours: Record<number, string> = {
    0: "Stängt",
    1: "Stängt",
    2: "Stängt",
    3: "Stängt",
    4: "Stängt",
    5: "Stängt",
    6: "Stängt",
  };
  for (const oh of raw.OpeningHours ?? []) {
    const idx = WEEKDAY_INDEX[oh.Day?.toUpperCase()];
    if (idx === undefined) continue;
    hours[idx] = formatHours(oh.Open1, oh.Close1);
  }
  const todayIdx = ((new Date().getDay() + 6) % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const coord = raw.Coordinate ?? raw.Coordinates?.[0];
  const lat = coord?.Northing ? parseFloat(coord.Northing) : 0;
  const lng = coord?.Easting ? parseFloat(coord.Easting) : 0;
  const distance =
    typeof raw.RouteDistance === "number"
      ? raw.RouteDistance
      : parseFloat(String(raw.RouteDistance ?? "0")) || 0;

  return {
    id: raw.ServicePointId,
    name: raw.Name,
    type: extractChain(raw.Name, raw.Operator),
    street: raw.VisitingAddress?.Street ?? "",
    postalCode: raw.VisitingAddress?.PostalCode ?? "",
    city: raw.VisitingAddress?.City ?? "",
    countryCode: raw.VisitingAddress?.CountryCode ?? "SE",
    distanceM: Math.round(distance),
    openTodayLabel: hours[todayIdx] || "Stängt",
    openingHours: hours,
    latitude: lat,
    longitude: lng,
  };
}

export async function findServicePoints(
  args: FindServicePointsArgs
): Promise<FindServicePointsResult> {
  const postalCode = normalisePostalCode(args.postalCode);
  if (!SWE_POSTCODE_RE.test(postalCode))
    return { ok: false, error: "Ange ett giltigt postnummer (5 siffror)." };

  const limit = Math.max(1, Math.min(args.limit ?? 5, 20));
  const countryCode = args.countryCode ?? "SE";

  if (!isPostNordConfigured()) {
    return {
      ok: true,
      mode: "stub",
      points: stubServicePoints(limit),
    };
  }

  const url = new URL(POSTNORD_BASE_URL);
  url.searchParams.set("countryCode", countryCode);
  url.searchParams.set("postalCode", postalCode);
  url.searchParams.set("numberOfServicePoints", String(limit));
  url.searchParams.set("apikey", process.env.POSTNORD_API_KEY!);

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      // PostNord caches well; 10-minute cache is more than enough for this lookup.
      next: { revalidate: 600 },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("PostNord service-points failed:", res.status, body.slice(0, 200));
      return { ok: false, error: "Kunde inte hämta ombud just nu." };
    }
    const json = (await res.json()) as {
      servicePointInformationResponse?: {
        servicePoints?: RawServicePoint[];
      };
    };
    const raw = json.servicePointInformationResponse?.servicePoints ?? [];
    const points = raw.map(normalisePoint);
    return { ok: true, mode: "live", points };
  } catch (err) {
    console.error("PostNord service-points threw:", err);
    return { ok: false, error: "Kunde inte hämta ombud just nu." };
  }
}
