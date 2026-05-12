/**
 * Normalize product photography to a consistent visual treatment.
 *
 * The WordPress imports brought in supplier product shots with wildly varying
 * subject scales, framings, and backgrounds. This script:
 *   1. Trims near-white edges (sharp.trim) — the bottle becomes the new bounding box
 *   2. Resizes the trimmed result to fit a 1000×1000 square (preserving aspect)
 *   3. Pads the empty area with the brand's warm cream (#F4F0E8)
 *   4. Saves back to the original path as progressive JPEG
 *
 * After running, every product photo is 1000×1000 with identical background,
 * the bottle scaled to fit, no visible source-photo edges. The catalog cards
 * can then drop their compensating chrome.
 *
 * Idempotent: running twice trims further but converges quickly. Originals
 * are overwritten — re-run scripts/import-wordpress.ts to refetch from biomax.nu
 * CDN if you need pristine source images.
 *
 * Usage:
 *   npx tsx scripts/normalize-product-images.ts
 */

import sharp from "sharp";
import { readdir, rename, stat } from "node:fs/promises";
import { join } from "node:path";

const SRC_DIR = "public/products";
const SIZE = 1000;
// White padding — ensures `mix-blend-multiply` against the brand cream
// container produces clean cream (no cream-on-cream double-darken).
const BG = { r: 255, g: 255, b: 255, alpha: 1 };

async function main() {
  const files = await readdir(SRC_DIR);
  const images = files.filter(
    (f) => /\.(jpe?g|png)$/i.test(f) && !f.startsWith("_")
  );
  console.log(`Normalizing ${images.length} product images → ${SIZE}×${SIZE}`);

  let ok = 0;
  let failed = 0;
  for (const file of images) {
    const path = join(SRC_DIR, file);
    const tmpPath = path + ".tmp";

    try {
      const before = await stat(path);
      await sharp(path)
        // Remove near-white edges — bottle becomes the bounding box
        .trim({ background: "#FFFFFF", threshold: 18 })
        // Centre-fit the trimmed result into a 1000×1000 square
        // Pad the empty area with the brand warm cream so the photo's
        // background becomes invisible against the card surface.
        .resize(SIZE, SIZE, {
          fit: "contain",
          background: BG,
          withoutEnlargement: false,
        })
        .flatten({ background: BG })
        .jpeg({ quality: 88, progressive: true, mozjpeg: true })
        .toFile(tmpPath);
      await rename(tmpPath, path);
      const after = await stat(path);
      ok++;
      console.log(
        `  ✓ ${file.padEnd(60)} ${(before.size / 1024).toFixed(0).padStart(4)}KB → ${(
          after.size / 1024
        )
          .toFixed(0)
          .padStart(4)}KB`
      );
    } catch (err) {
      failed++;
      console.warn(`  ⚠ ${file}: ${(err as Error).message}`);
    }
  }
  console.log(`\nDone. ${ok} normalized, ${failed} failed.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
