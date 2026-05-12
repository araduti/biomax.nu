import type { ServicePoint } from "./types";

/**
 * Deterministic Kållered-area service-point fixtures. Used when
 * `POSTNORD_API_KEY` is unset so dev/CI can exercise the full UI without
 * credentials. We pick locations that actually exist near the Biomax HQ
 * (Ekenleden 15A, 428 36 Kållered) so the data is plausible.
 *
 * NOT shipped to prod — the route handler gates on `POSTNORD_API_KEY`
 * being set before falling through to live; absent key = stub.
 */
const FIXTURES: ServicePoint[] = [
  {
    id: "stub-1",
    name: "Coop Kållered",
    type: "Coop",
    street: "Kålleredsgårdsvägen 12",
    postalCode: "428 36",
    city: "Kållered",
    countryCode: "SE",
    distanceM: 320,
    openTodayLabel: "07:00–22:00",
    openingHours: {
      0: "07:00–22:00",
      1: "07:00–22:00",
      2: "07:00–22:00",
      3: "07:00–22:00",
      4: "07:00–22:00",
      5: "08:00–22:00",
      6: "08:00–22:00",
    },
    latitude: 57.6041,
    longitude: 12.0723,
  },
  {
    id: "stub-2",
    name: "ICA Supermarket Lindome",
    type: "ICA",
    street: "Industrivägen 18",
    postalCode: "437 33",
    city: "Lindome",
    countryCode: "SE",
    distanceM: 2450,
    openTodayLabel: "07:00–21:00",
    openingHours: {
      0: "07:00–21:00",
      1: "07:00–21:00",
      2: "07:00–21:00",
      3: "07:00–21:00",
      4: "07:00–21:00",
      5: "08:00–21:00",
      6: "08:00–21:00",
    },
    latitude: 57.5754,
    longitude: 12.0734,
  },
  {
    id: "stub-3",
    name: "Pressbyrån Mölndals Galleria",
    type: "Pressbyrån",
    street: "Brogatan 18",
    postalCode: "431 30",
    city: "Mölndal",
    countryCode: "SE",
    distanceM: 4810,
    openTodayLabel: "08:00–20:00",
    openingHours: {
      0: "08:00–20:00",
      1: "08:00–20:00",
      2: "08:00–20:00",
      3: "08:00–20:00",
      4: "08:00–20:00",
      5: "09:00–19:00",
      6: "10:00–18:00",
    },
    latitude: 57.6557,
    longitude: 12.0136,
  },
  {
    id: "stub-4",
    name: "Tempo Sisjön",
    type: "Tempo",
    street: "Askims Verkstadsväg 2",
    postalCode: "436 34",
    city: "Askim",
    countryCode: "SE",
    distanceM: 5640,
    openTodayLabel: "08:00–21:00",
    openingHours: {
      0: "08:00–21:00",
      1: "08:00–21:00",
      2: "08:00–21:00",
      3: "08:00–21:00",
      4: "08:00–21:00",
      5: "09:00–20:00",
      6: "10:00–18:00",
    },
    latitude: 57.6360,
    longitude: 11.9460,
  },
  {
    id: "stub-5",
    name: "Coop Nära Mölndalsbro",
    type: "Coop",
    street: "Storgatan 1",
    postalCode: "431 22",
    city: "Mölndal",
    countryCode: "SE",
    distanceM: 6120,
    openTodayLabel: "07:00–22:00",
    openingHours: {
      0: "07:00–22:00",
      1: "07:00–22:00",
      2: "07:00–22:00",
      3: "07:00–22:00",
      4: "07:00–22:00",
      5: "08:00–22:00",
      6: "08:00–22:00",
    },
    latitude: 57.6552,
    longitude: 12.0144,
  },
];

export function stubServicePoints(limit = 5): ServicePoint[] {
  return FIXTURES.slice(0, Math.max(1, Math.min(limit, FIXTURES.length)));
}
