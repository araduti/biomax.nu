import type { Product } from "@prisma/client";
import { parseIngredientList } from "@/lib/products/ingredient-list";

/**
 * Synthesise FAQ entries from a product's structured fields. Only returns
 * questions where we have a real answer — never fabricate to fill the schema.
 *
 * Three high-value FAQ shapes for kosttillskott:
 *   1. "Hur tar man ___?" — answered by `usage`
 *   2. "Vad innehåller ___?" — answered by ingredientList row names
 *   3. "Vad bör jag tänka på med ___?" — answered by `warnings`
 *
 * If the product has a `seoFaqJson` field with manually authored Q&As, those
 * win — editorial intent overrides our auto-derived defaults.
 */
export type ProductFaqItem = { question: string; answer: string };

type FaqInput = Pick<
  Product,
  "name" | "usage" | "warnings" | "ingredientList" | "seoFaqJson"
>;

export function buildProductFaq(p: FaqInput): ProductFaqItem[] {
  // Manual override wins
  const manual = parseManualFaq(p.seoFaqJson);
  if (manual && manual.length > 0) return manual;

  const items: ProductFaqItem[] = [];

  if (p.usage?.trim()) {
    items.push({
      question: `Hur tar man ${p.name}?`,
      answer: p.usage.trim(),
    });
  }

  const list = parseIngredientList(p.ingredientList);
  if (list && list.rows.length > 0) {
    const summary = list.rows
      .map((r) => `${r.name}${r.amount ? ` (${r.amount})` : ""}`)
      .join(", ");
    items.push({
      question: `Vad innehåller ${p.name}?`,
      answer: `${p.name} innehåller per ${list.perUnit || "enhet"}: ${summary}.`,
    });
  }

  if (p.warnings?.trim()) {
    items.push({
      question: `Vad bör jag tänka på när jag tar ${p.name}?`,
      answer: p.warnings.trim(),
    });
  }

  return items;
}

function parseManualFaq(value: unknown): ProductFaqItem[] | null {
  if (!Array.isArray(value)) return null;
  const out: ProductFaqItem[] = [];
  for (const v of value) {
    if (
      v &&
      typeof v === "object" &&
      typeof (v as ProductFaqItem).question === "string" &&
      typeof (v as ProductFaqItem).answer === "string"
    ) {
      const q = (v as ProductFaqItem).question.trim();
      const a = (v as ProductFaqItem).answer.trim();
      if (q && a) out.push({ question: q, answer: a });
    }
  }
  return out;
}
