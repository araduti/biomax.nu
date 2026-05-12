/**
 * Best-effort parser for the free-text `usage` field on a product.
 *
 * The Swedish text follows a few recurring shapes:
 *   "1 kapsel dagligen i samband med måltid."
 *   "1 kapsel 2 gånger om dagen i samband med måltider."
 *   "1-2 kapslar, 1-2 gånger per dag, 30 minuter före mat."
 *   "1tsk i ett glas vatten 5ggr/dag."
 *
 * We extract three glanceable chips (amount per dose, frequency, timing) but
 * never throw the original text away — chips supplement, they do not replace.
 */
export type DoseChips = {
  amount: string | null;
  frequency: string | null;
  timing: { label: string; tone: "meal" | "before" | "with" | "neutral" } | null;
};

export type DayPhase = "morgon" | "lunch" | "eftermiddag" | "kvall";

/**
 * Derive a 4-phase day timeline from parsed dose chips. Filled phases
 * indicate when a dose would be taken if the dose is distributed evenly across
 * the day, biased by the parsed timing.
 *
 * The output is a visual aid, not a prescription — when in doubt we under-fill.
 */
export function buildTimeline(chips: DoseChips): DayPhase[] {
  const freq = chips.frequency;
  if (!freq) return [];
  // Normalise "1-2×/dag" → use the upper bound for visualisation.
  const m = /(\d+)(?:-(\d+))?/.exec(freq);
  if (!m) return [];
  const upper = m[2] ? parseInt(m[2], 10) : parseInt(m[1], 10);
  if (!upper) return [];

  const beforeMeal = chips.timing?.tone === "before";

  if (upper === 1) {
    // Single daily dose: "med måltid" → lunch, "före mat" → morgon.
    return [beforeMeal ? "morgon" : "lunch"];
  }
  if (upper === 2) return ["morgon", "kvall"];
  if (upper === 3) return ["morgon", "lunch", "kvall"];
  return ["morgon", "lunch", "eftermiddag", "kvall"];
}

const UNIT_WORDS = [
  "kapslar",
  "kapsel",
  "tabletter",
  "tablett",
  "skopor",
  "skopa",
  "tsk",
  "msk",
  "gram",
  "ml",
  "g",
];

function normalizeNumber(s: string): string {
  // "1tsk" → "1 tsk" had spacing fixed upstream; just clean repeats here
  return s.replace(/–/g, "-").replace(/\s+/g, " ").trim();
}

export function parseDose(text: string | null | undefined): DoseChips {
  if (!text) return { amount: null, frequency: null, timing: null };
  const t = " " + text.toLowerCase().replace(/\s+/g, " ").replace(/–/g, "-") + " ";

  // ── Amount per dose ────────────────────────────────────────
  // First "<number>[-<number>] <unit>" we hit.
  let amount: string | null = null;
  const unitGroup = UNIT_WORDS.join("|");
  // Lookahead enforces a real boundary after the unit — `\b` mishandles
  // Swedish letters, so explicitly forbid a trailing letter (catches the
  // "2 g[ånger]" false-positive against the short "g" alternative).
  const amountRegex = new RegExp(
    `(\\d+(?:[-,.]\\d+)?)\\s*(${unitGroup})(?![\\p{L}])`,
    "u"
  );
  const am = amountRegex.exec(t);
  if (am) {
    amount = normalizeNumber(`${am[1]} ${am[2]}`);
    // Capitalise unit for nicer display ("Kapsel" → "kapsel" stays lowercase
    // — Swedish doesn't capitalise nouns; we keep the unit lowercase).
  }

  // ── Frequency ──────────────────────────────────────────────
  // "X gånger" + optional ("per dag" / "om dagen" / "dagligen") OR "Xggr/dag"
  // OR bare "dagligen" → 1×.
  let frequency: string | null = null;
  const fnum = /(\d+(?:-\d+)?)\s*(?:gånger|ggr)\s*\/?\s*(?:per\s*dag|om\s*dag(?:en|et)?|dag)?/.exec(
    t
  );
  if (fnum) {
    frequency = `${normalizeNumber(fnum[1])}×/dag`;
  } else if (/\bdagligen\b/.test(t) || /\bvarje\s*dag\b/.test(t)) {
    frequency = "1×/dag";
  }

  // ── Timing ─────────────────────────────────────────────────
  let timing: DoseChips["timing"] = null;
  if (/före\s*mat|innan\s*mat|före\s*måltid/.test(t)) {
    // Capture leading minutes phrase if present ("30 minuter före mat")
    const min = /(\d+)\s*minuter\s*före/.exec(t);
    timing = {
      label: min ? `${min[1]} min före mat` : "Före mat",
      tone: "before",
    };
  } else if (/(?:i\s*samband\s*med|tillsammans\s*med|med)\s*(?:måltid(?:er)?|mat)/.test(t)) {
    timing = { label: "Med måltid", tone: "with" };
  } else if (/på\s*tom\s*mage|fastande/.test(t)) {
    timing = { label: "Tom mage", tone: "neutral" };
  }

  return { amount, frequency, timing };
}
