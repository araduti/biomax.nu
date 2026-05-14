/**
 * Backfill the columns/tables added in the post-audit migration:
 *   - `Product.seoHealthLevel`  ← computed from current content
 *   - `ProductIngredient` rows  ← resolved from each product's ingredientList
 *
 * Idempotent: re-running overwrites both surfaces from the current state
 * of the products table. Run once after the migration; future writes are
 * handled by `lib/admin/post-save-sync.ts`.
 */
import { prisma } from "@/lib/prisma";
import { syncSeoHealth, syncProductIngredients } from "@/lib/admin/post-save-sync";

async function main() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      slug: true,
      seoTitle: true,
      seoDescription: true,
      seoFocusKw: true,
      shortDescription: true,
      longDescription: true,
      ingredientList: true,
      usage: true,
      warnings: true,
    },
  });
  console.log(`Backfilling ${products.length} products…`);

  let ok = 0;
  for (const p of products) {
    await Promise.all([
      syncSeoHealth(p),
      syncProductIngredients({ id: p.id, ingredientList: p.ingredientList }),
    ]);
    ok++;
    if (ok % 20 === 0) console.log(`  …${ok}/${products.length}`);
  }
  console.log(`Done. Synced ${ok} products.`);

  // Quick spot-check.
  const joinCount = await prisma.productIngredient.count();
  const levelStats = await prisma.product.groupBy({
    by: ["seoHealthLevel"],
    _count: { _all: true },
  });
  console.log(`ProductIngredient rows: ${joinCount}`);
  console.log("seoHealthLevel distribution:");
  for (const row of levelStats) {
    console.log(`  ${row.seoHealthLevel ?? "(null)"}: ${row._count._all}`);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
