/**
 * Per-user Översikt widget preferences — client only.
 *
 * Stores which widgets are visible and in what order. localStorage is
 * sufficient for our scale (single-store admin, 2-3 users); a future
 * upgrade to a DB-backed `User.adminPrefs` JSON column is a drop-in if
 * we want cross-device sync.
 *
 * Schema:
 *   { order: WidgetId[], hidden: WidgetId[] }
 *
 * `order` is the explicit display order. New widgets added in code
 * (not yet in localStorage) get appended at the end on read so the
 * Add picker shows them automatically.
 */

export type WidgetId =
  | "todos"
  | "metrics"
  | "recent-orders"
  | "low-stock"
  | "recent-activity";

export type WidgetWidth = "half" | "full";

export const ALL_WIDGETS: {
  id: WidgetId;
  label: string;
  defaultOn: boolean;
  defaultWidth: WidgetWidth;
}[] = [
  { id: "todos", label: "Att göra nu", defaultOn: true, defaultWidth: "full" },
  { id: "metrics", label: "Denna månad", defaultOn: true, defaultWidth: "full" },
  // Recent orders + Lågt lager pair naturally as a 2-column row.
  { id: "recent-orders", label: "Senaste ordrar", defaultOn: true, defaultWidth: "half" },
  { id: "low-stock", label: "Lågt lager", defaultOn: true, defaultWidth: "half" },
  { id: "recent-activity", label: "Senaste aktivitet", defaultOn: true, defaultWidth: "full" },
];

export type WidgetPrefs = {
  order: WidgetId[];
  hidden: WidgetId[];
  /** Per-widget width override. Missing entries fall back to `defaultWidth`. */
  widths: Partial<Record<WidgetId, WidgetWidth>>;
};

const STORAGE_KEY = "biomax-admin-overview-widgets";

export function defaultPrefs(): WidgetPrefs {
  return {
    order: ALL_WIDGETS.map((w) => w.id),
    hidden: ALL_WIDGETS.filter((w) => !w.defaultOn).map((w) => w.id),
    widths: {},
  };
}

/**
 * Resolve a widget's effective width: explicit pref override, else the
 * widget definition's `defaultWidth`. Returns "full" for unknown ids
 * (defensive — shouldn't happen but stops layout from breaking).
 */
export function effectiveWidth(
  prefs: WidgetPrefs,
  id: WidgetId
): WidgetWidth {
  const override = prefs.widths[id];
  if (override) return override;
  const def = ALL_WIDGETS.find((w) => w.id === id);
  return def?.defaultWidth ?? "full";
}

/**
 * Read prefs from localStorage, merging in any new widgets not yet
 * known. Returns defaults if nothing stored or parse fails.
 */
export function readPrefs(): WidgetPrefs {
  if (typeof window === "undefined") return defaultPrefs();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPrefs();
    const parsed = JSON.parse(raw) as Partial<WidgetPrefs>;
    const known = new Set(ALL_WIDGETS.map((w) => w.id));
    const order: WidgetId[] = [];
    const seen = new Set<WidgetId>();
    // Honor stored order (filter out unknown / duplicates)
    for (const id of parsed.order ?? []) {
      if (known.has(id as WidgetId) && !seen.has(id as WidgetId)) {
        order.push(id as WidgetId);
        seen.add(id as WidgetId);
      }
    }
    // Append any widgets defined in code but missing from stored order
    for (const w of ALL_WIDGETS) {
      if (!seen.has(w.id)) order.push(w.id);
    }
    const hidden: WidgetId[] = (parsed.hidden ?? []).filter((id) =>
      known.has(id as WidgetId)
    ) as WidgetId[];
    const widths: Partial<Record<WidgetId, WidgetWidth>> = {};
    if (parsed.widths) {
      for (const [k, v] of Object.entries(parsed.widths)) {
        if (known.has(k as WidgetId) && (v === "half" || v === "full")) {
          widths[k as WidgetId] = v;
        }
      }
    }
    return { order, hidden, widths };
  } catch {
    return defaultPrefs();
  }
}

export function writePrefs(prefs: WidgetPrefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* private mode / quota — best effort */
  }
}
