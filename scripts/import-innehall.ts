/**
 * Import scraped innehållsförteckning data from biomax.nu into the new DB.
 *
 * Usage:
 *   python3 /tmp/scrape_biomax.py > /tmp/biomax_innehall.json
 *   npx tsx scripts/import-innehall.ts /tmp/biomax_innehall.json
 */
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { readFileSync } from "node:fs";

type Row = { name: string; amount: string };
type Scraped = {
  slug: string;
  ingredientList: { rows: Row[]; perUnit: string; footnote: string } | null;
  usage: string;
  storage: string;
  warnings: string;
};

function normalizeUnit(unit: string): string {
  // "1 skopa" -> "skopa", trailing punctuation off
  return unit.replace(/^\s*1\s+/, "").trim();
}

function fixFootnote(s: string): string {
  return s.replace(/Kapsel of gelatin/gi, "Kapsel av gelatin");
}

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: npx tsx scripts/import-innehall.ts <json>");
    process.exit(1);
  }
  const data: Scraped[] = JSON.parse(readFileSync(path, "utf8"));

  const { PrismaClient } = await import("@prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  let updated = 0;
  let skipped = 0;
  for (const item of data) {
    const product = await prisma.product.findFirst({
      where: { slug: item.slug },
      select: { id: true },
    });
    if (!product) {
      console.warn(`  · ${item.slug} — not in DB, skipping`);
      skipped++;
      continue;
    }
    const list = item.ingredientList
      ? {
          rows: item.ingredientList.rows.map((r) => ({
            name: r.name.trim(),
            amount: r.amount.trim(),
          })),
          perUnit: normalizeUnit(item.ingredientList.perUnit) || "kapsel",
          footnote: fixFootnote(item.ingredientList.footnote.trim()),
        }
      : null;

    await prisma.product.update({
      where: { id: product.id },
      data: {
        ingredientList: list ?? undefined,
        usage: item.usage.trim() || null,
        storage: item.storage.trim() || null,
        warnings: item.warnings.trim() || null,
      },
    });
    console.log(
      `  ✓ ${item.slug} — ${list?.rows.length ?? 0} rows, unit=${list?.perUnit ?? "—"}`
    );
    updated++;
  }
  console.log(`\nDone. ${updated} updated, ${skipped} skipped.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
