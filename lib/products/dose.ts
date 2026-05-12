/**
 * Single source of truth for "dosing" — the chips + day-phase timeline on the
 * Användning card. Three pieces:
 *
 *   - `Dose`: the canonical shape consumed by public components.
 *   - `isDose`: type guard for JSON read from `Product.dosing`.
 *   - `getEffectiveDose(product)`: returns the editorial override when set,
 *     else falls back to parsing `product.usage` free text.
 *
 * The parser still lives in `dose-parser.ts` and stays untouched — it's the
 * Plan B when no manual override exists.
 */
import { parseDose, buildTimeline } from "@/lib/products/dose-parser";

export type DayPhase = "morgon" | "lunch" | "eftermiddag" | "kvall";
export const DAY_PHASES: DayPhase[] = ["morgon", "lunch", "eftermiddag", "kvall"];
export const PHASE_LABEL: Record<DayPhase, string> = {
  morgon: "Morgon",
  lunch: "Lunch",
  eftermiddag: "Eftermiddag",
  kvall: "Kväll",
};

export type DoseTimingTone = "with" | "before" | "neutral";

export type Dose = {
  /** "1 kapsel", "1-2 kapslar", "1 tsk" — the dose-per-occasion chip. */
  amount: string | null;
  /** "1×/dag", "2×/dag", "5×/dag" — the frequency chip. */
  frequency: string | null;
  /** Display label + visual tone for the timing chip. */
  timing: { label: string; tone: DoseTimingTone } | null;
  /** Which day phases get a filled dot on the timeline. */
  schedule: DayPhase[];
};

export const EMPTY_DOSE: Dose = {
  amount: null,
  frequency: null,
  timing: null,
  schedule: [],
};

/**
 * True when *any* signal is set — used by callers to decide whether to render
 * chips/timeline at all (a fully-empty Dose means "we have nothing to say").
 */
export function doseHasSignal(d: Dose): boolean {
  return (
    !!d.amount ||
    !!d.frequency ||
    !!d.timing ||
    d.schedule.length > 0
  );
}

/** Validate that an arbitrary JSON value matches the Dose shape. */
export function isDose(v: unknown): v is Dose {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (o.amount !== null && typeof o.amount !== "string") return false;
  if (o.frequency !== null && typeof o.frequency !== "string") return false;
  if (o.timing !== null) {
    const t = o.timing as Record<string, unknown> | null;
    if (
      !t ||
      typeof t !== "object" ||
      typeof t.label !== "string" ||
      (t.tone !== "with" && t.tone !== "before" && t.tone !== "neutral")
    ) {
      return false;
    }
  }
  if (!Array.isArray(o.schedule)) return false;
  for (const p of o.schedule) {
    if (
      p !== "morgon" &&
      p !== "lunch" &&
      p !== "eftermiddag" &&
      p !== "kvall"
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Resolve the dose to display for a product:
 *   1. If `Product.dosing` is a valid Dose, use it verbatim.
 *   2. Else, parse `Product.usage` free text and derive the schedule from
 *      parsed frequency + timing.
 */
export function getEffectiveDose(product: {
  dosing: unknown;
  usage: string | null;
}): Dose {
  if (isDose(product.dosing)) return product.dosing;

  // Fallback: parse free text.
  const chips = parseDose(product.usage);
  const schedule = buildTimeline(chips);
  return {
    amount: chips.amount,
    frequency: chips.frequency,
    timing: chips.timing
      ? {
          label: chips.timing.label,
          // Parser uses `tone: "with" | "before" | "neutral" | "meal"`;
          // collapse "meal" → "with" since that's how it's been rendered.
          tone:
            chips.timing.tone === "with" ||
            chips.timing.tone === "before" ||
            chips.timing.tone === "neutral"
              ? chips.timing.tone
              : "with",
        }
      : null,
    schedule,
  };
}
