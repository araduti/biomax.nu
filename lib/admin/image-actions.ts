"use server";

import { writeFile, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname } from "node:path";
import { bumpTag, productCacheTag, productListCacheTag } from "@/lib/cache/tags";
import sharp from "sharp";
import { requireTenantRole } from "./guard";
import { tenantScope } from "@/lib/tenant/db";

const SIZE = 1000;
const PRODUCT_DIR = "public/products";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export type ImageUploadResult =
  | { ok: true; imageUrl: string }
  | { ok: false; error: string };

/**
 * Upload + normalize a product image.
 *
 *   1. Validate (mime type, size limit)
 *   2. Trim near-white edges, resize to 1000×1000 with white padding
 *      (same pipeline as scripts/normalize-product-images.ts so admin uploads
 *      look identical to bulk-imported originals)
 *   3. Save to public/products/{slug}-{timestamp}.jpg as progressive JPEG
 *   4. Update product.imageUrl
 *   5. Optionally delete the old file (only if it was in /products/ and not
 *      the placeholder)
 *
 * The form-data contract: { file: File, slug: string }.
 */
export async function uploadProductImage(
  formData: FormData
): Promise<ImageUploadResult> {
  const { tenantId } = await requireTenantRole("admin");

  const file = formData.get("file");
  const slug = formData.get("slug");

  if (!(file instanceof File)) {
    return { ok: false, error: "Ingen bild bifogad." };
  }
  if (typeof slug !== "string" || !slug) {
    return { ok: false, error: "Produktslug saknas." };
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    return {
      ok: false,
      error: `Filtypen stöds inte (${file.type}). Använd JPG, PNG, WebP eller GIF.`,
    };
  }
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      error: `Bilden är för stor (${Math.round(file.size / 1024 / 1024)} MB). Max 10 MB.`,
    };
  }

  const product = await tenantScope(tenantId, (tx) =>
    tx.product.findFirst({
      where: { slug },
      select: { id: true, imageUrl: true },
    })
  );
  if (!product) return { ok: false, error: "Produkten hittades inte." };

  // Read + normalize
  let processed: Buffer;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    processed = await sharp(input)
      .trim({ background: "#FFFFFF", threshold: 18 })
      .resize(SIZE, SIZE, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality: 88, progressive: true, mozjpeg: true })
      .toBuffer();
  } catch (err) {
    console.error("[admin] image processing failed:", err);
    return { ok: false, error: "Kunde inte bearbeta bilden." };
  }

  // Write
  const timestamp = Date.now();
  const filename = `${slug}-${timestamp}.jpg`;
  const dest = join(PRODUCT_DIR, filename);
  try {
    await writeFile(dest, processed);
  } catch (err) {
    console.error("[admin] image write failed:", err);
    return { ok: false, error: "Kunde inte spara bilden på servern." };
  }

  const newUrl = `/products/${filename}`;

  // Update DB
  try {
    await tenantScope(tenantId, (tx) =>
      tx.product.update({
        where: { id: product.id },
        data: { imageUrl: newUrl },
      })
    );
  } catch (err) {
    console.error("[admin] db update failed:", err);
    // Roll back the file write
    try {
      await unlink(dest);
    } catch {
      /* ignore */
    }
    return { ok: false, error: "Kunde inte uppdatera produkten." };
  }

  // Best-effort cleanup of old file (only if in /products/ and not placeholder)
  if (
    product.imageUrl &&
    product.imageUrl.startsWith("/products/") &&
    !product.imageUrl.includes("_placeholder") &&
    product.imageUrl !== newUrl
  ) {
    const oldPath = join("public", product.imageUrl);
    if (existsSync(oldPath)) {
      try {
        await unlink(oldPath);
      } catch (err) {
        console.warn("[admin] could not delete old image:", err);
      }
    }
  }

  // Tag-scoped: PDP entry for this slug + the shared catalogue/list tag.
  // Admin views are dynamic; home/category pages share `productListCacheTag`.
  bumpTag(productCacheTag(slug));
  bumpTag(productListCacheTag());

  return { ok: true, imageUrl: newUrl };
}

// ── Gallery (multi-image) ───────────────────────────────────────────

/**
 * Process one input file the same way uploadProductImage does, but persist
 * to `Product.galleryUrls` as an appended entry. Caller can call this once
 * per image; the UI handles batching.
 *
 * Same form-data contract as the primary upload — `{ file, slug }`.
 */
export async function uploadGalleryImage(
  formData: FormData
): Promise<ImageUploadResult> {
  const { tenantId } = await requireTenantRole("admin");

  const file = formData.get("file");
  const slug = formData.get("slug");

  if (!(file instanceof File)) {
    return { ok: false, error: "Ingen bild bifogad." };
  }
  if (typeof slug !== "string" || !slug) {
    return { ok: false, error: "Produktslug saknas." };
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    return {
      ok: false,
      error: `Filtypen stöds inte (${file.type}). Använd JPG, PNG, WebP eller GIF.`,
    };
  }
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      error: `Bilden är för stor (${Math.round(file.size / 1024 / 1024)} MB). Max 10 MB.`,
    };
  }

  const product = await tenantScope(tenantId, (tx) =>
    tx.product.findFirst({
      where: { slug },
      select: { id: true, galleryUrls: true },
    })
  );
  if (!product) return { ok: false, error: "Produkten hittades inte." };
  if (product.galleryUrls.length >= 12) {
    return {
      ok: false,
      error: "Galleriet är fullt (max 12 bilder). Ta bort en bild först.",
    };
  }

  // Same normalization pipeline as the primary image — gives uniform visuals.
  let processed: Buffer;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    processed = await sharp(input)
      .trim({ background: "#FFFFFF", threshold: 18 })
      .resize(SIZE, SIZE, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality: 88, progressive: true, mozjpeg: true })
      .toBuffer();
  } catch (err) {
    console.error("[admin] gallery image processing failed:", err);
    return { ok: false, error: "Kunde inte bearbeta bilden." };
  }

  const timestamp = Date.now();
  const filename = `${slug}-gallery-${timestamp}.jpg`;
  const dest = join(PRODUCT_DIR, filename);
  try {
    await writeFile(dest, processed);
  } catch (err) {
    console.error("[admin] gallery image write failed:", err);
    return { ok: false, error: "Kunde inte spara bilden på servern." };
  }

  const newUrl = `/products/${filename}`;

  try {
    await tenantScope(tenantId, (tx) =>
      tx.product.update({
        where: { id: product.id },
        data: { galleryUrls: { push: newUrl } },
      })
    );
  } catch (err) {
    console.error("[admin] db gallery append failed:", err);
    try {
      await unlink(dest);
    } catch {
      /* ignore */
    }
    return { ok: false, error: "Kunde inte uppdatera produkten." };
  }

  bumpTag(productCacheTag(slug));

  return { ok: true, imageUrl: newUrl };
}

export type GalleryMutationResult =
  | { ok: true; galleryUrls: string[] }
  | { ok: false; error: string };

/**
 * Replace the entire `galleryUrls` array — used for reorder + delete from the
 * admin UI. Cleans up any files that fell out of the list and were owned by
 * this product (under `/products/`).
 */
export async function setGalleryUrls(
  slug: string,
  urls: string[]
): Promise<GalleryMutationResult> {
  const { tenantId } = await requireTenantRole("admin");

  if (typeof slug !== "string" || !slug) {
    return { ok: false, error: "Produktslug saknas." };
  }

  const product = await tenantScope(tenantId, (tx) =>
    tx.product.findFirst({
      where: { slug },
      select: { id: true, galleryUrls: true },
    })
  );
  if (!product) return { ok: false, error: "Produkten hittades inte." };

  // Dedupe + sanity cap on input.
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const u of urls) {
    const url = u.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    cleaned.push(url);
    if (cleaned.length >= 12) break;
  }

  // Files dropped from the gallery — only delete if we own them.
  const dropped = product.galleryUrls.filter((u) => !seen.has(u));

  try {
    await tenantScope(tenantId, (tx) =>
      tx.product.update({
        where: { id: product.id },
        data: { galleryUrls: cleaned },
      })
    );
  } catch (err) {
    console.error("[admin] gallery set failed:", err);
    return { ok: false, error: "Kunde inte spara galleriet." };
  }

  // Best-effort file cleanup for dropped images.
  for (const u of dropped) {
    if (!u.startsWith("/products/") || u.includes("_placeholder")) continue;
    const path = join("public", u);
    if (!existsSync(path)) continue;
    try {
      await unlink(path);
    } catch (err) {
      console.warn("[admin] could not delete dropped gallery image:", err);
    }
  }

  bumpTag(productCacheTag(slug));

  return { ok: true, galleryUrls: cleaned };
}
