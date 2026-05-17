/**
 * EU 1169/2011 Annex II — the 14 substances or products causing allergies
 * or intolerances that MUST be declared on food labels. Kosttillskott
 * fall under the same rule via LIVSFS 2014:4.
 *
 * Slugs are stable identifiers stored on `Product.allergens`. Labels are
 * the customer-facing Swedish presentation. `examples` is editorial
 * sub-text rendered in the admin picker to clarify what each catch-all
 * covers (e.g. "nötter" includes mandel, hasselnöt, valnöt, etc.).
 *
 * NEVER add slugs here that aren't on the EU list — the callout's
 * legal weight comes from being authoritative.
 */
export type AllergenEntry = {
  slug: string;
  label: string;
  examples?: string;
};

export const ALLERGENS: AllergenEntry[] = [
  {
    slug: "spannmal-gluten",
    label: "Spannmål som innehåller gluten",
    examples: "vete, råg, korn, havre, spelt, kamut och hybridiserade sorter",
  },
  { slug: "kraftdjur", label: "Kräftdjur" },
  { slug: "agg", label: "Ägg" },
  { slug: "fisk", label: "Fisk" },
  { slug: "jordnotter", label: "Jordnötter" },
  { slug: "soja", label: "Sojabönor" },
  { slug: "mjolk", label: "Mjölk", examples: "inkl. laktos" },
  {
    slug: "notter",
    label: "Nötter",
    examples: "mandel, hasselnöt, valnöt, cashew, pekan, paranöt, pistasch, makadamianöt",
  },
  { slug: "selleri", label: "Selleri" },
  { slug: "senap", label: "Senap" },
  { slug: "sesamfron", label: "Sesamfrön" },
  {
    slug: "svaveldioxid-sulfiter",
    label: "Svaveldioxid och sulfiter",
    examples: "i koncentrationer >10 mg/kg eller mg/l",
  },
  { slug: "lupin", label: "Lupin" },
  { slug: "blotdjur", label: "Blötdjur" },
];

const ALLERGEN_BY_SLUG = new Map(ALLERGENS.map((a) => [a.slug, a]));

export function allergenLabel(slug: string): string | null {
  return ALLERGEN_BY_SLUG.get(slug)?.label ?? null;
}

/** Filter + label a list of raw slugs for display. Unknown slugs are dropped. */
export function resolveAllergens(slugs: readonly string[]): AllergenEntry[] {
  const seen = new Set<string>();
  const out: AllergenEntry[] = [];
  for (const s of slugs) {
    if (seen.has(s)) continue;
    const entry = ALLERGEN_BY_SLUG.get(s);
    if (!entry) continue;
    seen.add(s);
    out.push(entry);
  }
  return out;
}
