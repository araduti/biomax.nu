/**
 * Estimated delivery window for the PDP and cart drawer.
 *
 * Rules (Europe/Stockholm):
 *   - Orders placed Mon–Fri before 13:00 ship the same business day
 *   - Orders placed after 13:00 ship the next business day
 *   - Orders placed on Sat/Sun ship Monday
 *   - PostNord standardpaket transit: 1–3 business days from ship date
 *
 * Renders deterministically given a Date input so we can unit-test the
 * pure function and the same logic powers the email confirmation +
 * subscription renewal copy.
 *
 * We deliberately don't try to be smarter than this. Public holidays,
 * service-point overloads, and PostNord weather pauses are noise we
 * can't model from frontend code; the customer sees a *window* not a
 * promise, which matches what Apotea / Bodystore / Apohem all do.
 */

const CUTOFF_HOUR_LOCAL = 13;
const TRANSIT_MIN_DAYS = 1;
const TRANSIT_MAX_DAYS = 3;

/** Get the local hour in Europe/Stockholm for a given date. */
function stockholmHour(d: Date): number {
  const fmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    hour: "2-digit",
    hour12: false,
  });
  return parseInt(fmt.format(d), 10);
}

/** Day-of-week (0=Sun, 6=Sat) in Europe/Stockholm. */
function stockholmDayOfWeek(d: Date): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Stockholm",
    weekday: "short",
  });
  // "Sun" "Mon" "Tue" "Wed" "Thu" "Fri" "Sat"
  const map: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return map[fmt.format(d)] ?? 0;
}

function isWeekend(dow: number): boolean {
  return dow === 0 || dow === 6;
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

function nextBusinessDay(d: Date): Date {
  let cur = addDays(d, 1);
  while (isWeekend(stockholmDayOfWeek(cur))) {
    cur = addDays(cur, 1);
  }
  return cur;
}

function addBusinessDays(d: Date, days: number): Date {
  let cur = d;
  for (let i = 0; i < days; i++) cur = nextBusinessDay(cur);
  return cur;
}

export type DeliveryEta = {
  /** Day the order ships from us. */
  shipDate: Date;
  /** Earliest customer-side arrival. */
  earliestArrival: Date;
  /** Latest customer-side arrival. */
  latestArrival: Date;
  /** True when "order in the next N min and it ships today" is still in play. */
  shipsToday: boolean;
  /** Minutes until same-day-ship cutoff; null when no longer possible. */
  minutesToCutoff: number | null;
};

export function estimateDelivery(now: Date = new Date()): DeliveryEta {
  const dow = stockholmDayOfWeek(now);
  const hour = stockholmHour(now);
  const beforeCutoff = hour < CUTOFF_HOUR_LOCAL;
  const isBusinessDay = !isWeekend(dow);

  let shipDate: Date;
  let shipsToday = false;
  let minutesToCutoff: number | null = null;

  if (isBusinessDay && beforeCutoff) {
    shipDate = new Date(now);
    shipsToday = true;
    // Compute remaining minutes until the local 13:00 cutoff.
    const minutesFmt = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Europe/Stockholm",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const [h, m] = minutesFmt.format(now).split(":").map(Number);
    minutesToCutoff = (CUTOFF_HOUR_LOCAL - h!) * 60 - m!;
  } else {
    shipDate = nextBusinessDay(now);
  }

  return {
    shipDate,
    earliestArrival: addBusinessDays(shipDate, TRANSIT_MIN_DAYS),
    latestArrival: addBusinessDays(shipDate, TRANSIT_MAX_DAYS),
    shipsToday,
    minutesToCutoff,
  };
}

const weekdayFmt = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Stockholm",
  weekday: "long",
  day: "numeric",
  month: "long",
});

/**
 * Human Swedish label like "torsdag 16 maj – måndag 20 maj". For
 * same-day shipping we also surface the countdown to the cutoff.
 */
export function formatEta(eta: DeliveryEta): string {
  const a = weekdayFmt.format(eta.earliestArrival);
  const b = weekdayFmt.format(eta.latestArrival);
  // Collapse if both days are the same (1-day window).
  if (a === b) return a;
  return `${a} – ${b}`;
}
