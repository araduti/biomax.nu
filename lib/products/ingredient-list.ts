/**
 * Structured ingredient table — stored as JSON on Product.ingredientList.
 *
 * Mirrors the layout customers expect on biomax.nu (and ADR 0007's editorial
 * commitment to clinical clarity): a table of ingredient + amount per unit,
 * plus an optional free-text footnote for excipients ("Rismjöl, gelatin
 * kapsel...") and dietary-intake disclaimers.
 */
export type IngredientRow = {
  name: string;
  /** Free-text amount string — "100 mg", "1 mg", "500 µg", "100–200 mg". */
  amount: string;
};

export type IngredientList = {
  rows: IngredientRow[];
  /** Header shown in the table — "kapsel", "tablett", "tugg", "g", "ml". */
  perUnit: string;
  /** Free-text under the table. Excipients + RDI disclaimer typically. */
  footnote: string;
};

export const EMPTY_INGREDIENT_LIST: IngredientList = {
  rows: [],
  perUnit: "kapsel",
  footnote: "",
};

/** Type guard for safely consuming JSON from Prisma. */
export function isIngredientList(value: unknown): value is IngredientList {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<IngredientList>;
  return (
    Array.isArray(v.rows) &&
    typeof v.perUnit === "string" &&
    typeof v.footnote === "string" &&
    v.rows.every(
      (r) =>
        r &&
        typeof r === "object" &&
        typeof (r as IngredientRow).name === "string" &&
        typeof (r as IngredientRow).amount === "string"
    )
  );
}

/** Coerce any DB value back to a usable IngredientList (or null). */
export function parseIngredientList(value: unknown): IngredientList | null {
  if (isIngredientList(value)) {
    // Drop empty trailing rows
    const rows = value.rows.filter(
      (r) => r.name.trim() || r.amount.trim()
    );
    if (rows.length === 0) return null;
    return { ...value, rows };
  }
  return null;
}

/** True if the list has any displayable content. */
export function hasContent(list: IngredientList | null): boolean {
  if (!list) return false;
  return list.rows.length > 0 || list.footnote.trim().length > 0;
}
