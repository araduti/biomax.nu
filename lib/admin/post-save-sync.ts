/**
 * Post-save derivations.
 *
 * Some properties of a Product are derived from its content but expensive
 * to recompute on every read. We persist them on save instead:
 *
 *   - `seoHealthLevel` — drives the admin product list health dot.
 *   - `ProductIngredient` rows — replace the legacy "scan every product's
 *     `ingredientList` JSON in JS" pattern used by /kunskap and /kop.
 *
 * Both syncs are idempotent and best-effort — failures are logged but
 * never propagate to the caller. The admin save is the source of truth;
 * a stale derivation surface fixes itself on the next edit.
 */
import { tenantScope } from "@/lib/tenant/db";
import { currentTenant } from "@/lib/tenant";
import { getSeoHealth, type SeoHealthLevel as Level } from "@/lib/admin/seo-health";
import { parseIngredientList } from "@/lib/products/ingredient-list";
import { findIngredient } from "@/lib/knowledge/ingredients";
import type { SeoHealthLevel as PrismaSeoHealthLevel } from "@prisma/client";

const LEVEL_TO_PRISMA: Record<Level, PrismaSeoHealthLevel> = {
  complete: "COMPLETE",
  partial: "PARTIAL",
  "needs-work": "NEEDS_WORK",
};

type ProductForSync = {
  id: string;
  seoTitle: string | null;
  seoDescription: string | null;
  seoFocusKw: string | null;
  shortDescription: string;
  longDescription: string;
  ingredientList: unknown;
  usage: string | null;
  warnings: string | null;
};

/**
 * Recompute SEO health and overwrite the persisted level. Cheap — no I/O
 * beyond the single UPDATE.
 */
export async function syncSeoHealth(p: ProductForSync): Promise<void> {
  try {
    const health = getSeoHealth(p);
    const { id: tenantId } = await currentTenant();
    await tenantScope(tenantId, (tx) =>
      tx.product.update({
        where: { id: p.id },
        data: { seoHealthLevel: LEVEL_TO_PRISMA[health.level] },
      })
    );
  } catch (err) {
    console.error("[post-save] syncSeoHealth failed:", err);
  }
}

/**
 * Resolve `ingredientList.rows[].name` → ingredient slugs (via the knowledge
 * registry's fuzzy matcher) and replace the ProductIngredient join rows
 * for this product. Uses the same matcher the public site uses, so the
 * join always matches what `findProductsForIngredient` would have returned
 * by scanning in JS.
 */
export async function syncProductIngredients(p: {
  id: string;
  ingredientList: unknown;
}): Promise<void> {
  try {
    const list = parseIngredientList(p.ingredientList);
    const slugs = new Set<string>();
    if (list) {
      for (const row of list.rows) {
        const ing = findIngredient(row.name);
        if (ing) slugs.add(ing.slug);
      }
    }

    // Replace-all semantics: simpler + correct under removals. The table
    // is small (a few ingredient slugs per product) so deleteMany+createMany
    // is well within Prisma's comfort zone. Stamp tenantId on every new
    // row (mirrors lib/admin/audit.ts) so RLS isolates the join rows to
    // the acting tenant.
    const { id: tenantId } = await currentTenant();
    await tenantScope(tenantId, async (tx) => {
      await tx.productIngredient.deleteMany({
        where: { productId: p.id },
      });
      if (slugs.size > 0) {
        await tx.productIngredient.createMany({
          data: Array.from(slugs).map((ingredientSlug) => ({
            productId: p.id,
            ingredientSlug,
            tenantId,
          })),
          skipDuplicates: true,
        });
      }
    });
  } catch (err) {
    console.error("[post-save] syncProductIngredients failed:", err);
  }
}
