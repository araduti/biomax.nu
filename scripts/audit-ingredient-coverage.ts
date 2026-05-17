/**
 * Audit ingredient → knowledge-base coverage across every product.
 *
 * For each Product with a structured `ingredientList.rows[]`, run
 * `findIngredient(row.name)` and report misses. Misses mean a tooltip
 * link and a /kunskap/ingredienser/[slug] page won't render — the user
 * sees the row but can't click through.
 *
 * Exit code 1 if any miss is found, so this can run in CI later.
 *
 * Usage:
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/audit-ingredient-coverage.ts
 */
import { prisma } from "@/lib/prisma";
import { findIngredient } from "@/lib/knowledge/ingredients";
import {
  parseIngredientList,
  type IngredientList,
} from "@/lib/products/ingredient-list";

type Miss = { product: string; slug: string; rowName: string };

async function main() {
  const products = await prisma.product.findMany({
    select: {
      slug: true,
      name: true,
      status: true,
      ingredientList: true,
    },
    orderBy: { name: "asc" },
  });

  const misses: Miss[] = [];
  let totalRows = 0;
  let totalResolved = 0;
  let productsWithStructuredList = 0;
  const productsWithoutStructuredList: string[] = [];

  for (const p of products) {
    const list: IngredientList | null = parseIngredientList(p.ingredientList);
    if (!list || list.rows.length === 0) {
      productsWithoutStructuredList.push(`${p.name} (${p.status})`);
      continue;
    }
    productsWithStructuredList++;

    for (const row of list.rows) {
      const name = row.name.trim();
      if (!name) continue;
      totalRows++;
      const hit = findIngredient(name);
      if (hit) {
        totalResolved++;
      } else {
        misses.push({ product: p.name, slug: p.slug, rowName: name });
      }
    }
  }

  // ── Report ──────────────────────────────────────────────────────
  console.log(`\nIngredient coverage audit — ${new Date().toISOString().slice(0, 10)}`);
  console.log("=".repeat(72));
  console.log(`Products in catalogue:                ${products.length}`);
  console.log(`Products with structured rows:        ${productsWithStructuredList}`);
  console.log(`Products without structured rows:     ${productsWithoutStructuredList.length}`);
  console.log(`Total ingredient rows checked:        ${totalRows}`);
  console.log(`Resolved against knowledge base:      ${totalResolved}`);
  console.log(`Unresolved (misses):                  ${misses.length}`);

  if (productsWithoutStructuredList.length > 0) {
    console.log(
      `\nProducts WITHOUT a structured ingredient list (no rows to audit):`
    );
    for (const name of productsWithoutStructuredList) {
      console.log(`  • ${name}`);
    }
  }

  if (misses.length === 0) {
    console.log(`\n✓ All ${totalRows} ingredient rows resolve.`);
    return;
  }

  console.log(`\n✗ ${misses.length} unresolved rows:`);
  let currentSlug = "";
  for (const m of misses) {
    if (m.slug !== currentSlug) {
      console.log(`\n  ${m.product}  (/${m.slug})`);
      currentSlug = m.slug;
    }
    console.log(`    ✗ ${m.rowName}`);
  }
  process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
