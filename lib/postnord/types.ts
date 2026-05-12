/**
 * Normalised shape we expose to the rest of the app. PostNord's raw payload
 * is shape-shifty (servicePointId vs id, weekday casing varies, openingHours
 * arrays nest); the boundary translates it once into this canonical type so
 * downstream consumers don't care about the API quirks.
 */
export type ServicePoint = {
  id: string;
  name: string;
  /** e.g. "Coop", "Pressbyrån", "ICA Maxi". Used to render a chip. */
  type: string;
  street: string;
  postalCode: string;
  city: string;
  countryCode: string;
  /** Straight-line distance from the queried postal code, in metres. */
  distanceM: number;
  /** Today's hours formatted as "07:00–22:00" or "Stängt". */
  openTodayLabel: string;
  /** Weekday → "07:00–22:00" lookup. Mon=0…Sun=6 per dayjs convention. */
  openingHours: Record<number, string>;
  latitude: number;
  longitude: number;
};

export type FindServicePointsArgs = {
  postalCode: string;
  countryCode?: string;
  /** Max points to return (PostNord caps at ~20). */
  limit?: number;
};

export type FindServicePointsResult =
  | { ok: true; mode: "stub" | "live"; points: ServicePoint[] }
  | { ok: false; error: string };
