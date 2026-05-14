/**
 * Swedish-aware slugifier — the single source of truth for converting a
 * display string ("Björkglukos & Lactium®") into a URL slug
 * ("bjorkglukos-lactium").
 *
 * Two things `String.prototype.normalize("NFD")` alone can't handle:
 *   1. Swedish å/ä/ö don't decompose to ASCII letters under NFD — they're
 *      single codepoints. We need explicit mappings.
 *   2. Other Unicode (registered/trademark symbols, smart quotes, …) needs
 *      to collapse to "-" rather than vanish silently.
 *
 * Output guarantees:
 *   - lowercase, ASCII only
 *   - hyphen-separated; no leading, trailing, or repeated hyphens
 *   - empty-string-in → empty-string-out (caller decides what to do)
 */
const SWEDISH_FOLD: Record<string, string> = {
  å: "a",
  ä: "a",
  ö: "o",
  // Capital forms covered by .toLowerCase() at the top.
};

export function slugify(input: string): string {
  let s = (input ?? "").toLowerCase().trim();
  s = s.replace(/[åäö]/g, (c) => SWEDISH_FOLD[c] ?? c);
  s = s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  s = s.replace(/[^a-z0-9]+/g, "-");
  s = s.replace(/^-+|-+$/g, "");
  return s;
}
