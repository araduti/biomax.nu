"use server";

import { bumpTag, productCacheTag, productListCacheTag } from "@/lib/cache/tags";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./guard";

export type VariantInput = {
  /** Existing variant ID to update; omit when creating. */
  id?: string;
  sku: string;
  label: string;
  price: string;
  compareAtPrice?: string | null;
  stock: number;
  manageStock: boolean;
  weight?: string | null;
  isDefault: boolean;
};

export type VariantsBulkResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Replace the full variant list for a product with the provided rows.
 * Order in the array becomes the `position` column. Variants not in the
 * payload are deleted; variants with an `id` are updated; variants
 * without an `id` are created.
 *
 * Validates SKU uniqueness across the whole catalogue (the schema
 * enforces it too — this just gives the editor a clean error message
 * instead of a Prisma stack trace).
 */
export async function setProductVariants(
  productSlug: string,
  variants: VariantInput[]
): Promise<VariantsBulkResult> {
  await requireAdmin();
  const product = await prisma.product.findUnique({
    where: { slug: productSlug },
    select: {
      id: true,
      status: true,
      variants: { select: { id: true, stock: true, manageStock: true } },
    },
  });
  if (!product) return { ok: false, error: "Produkten hittades inte." };

  // Snapshot pre-state so we can fire the back-in-stock fanout when this
  // save flips the product from "all variants empty" → "at least one in
  // stock". Mirrors the equivalent transition check in updateProduct().
  const beforeAnyInStock =
    product.variants.length > 0 &&
    product.variants.some((v) => !v.manageStock || v.stock > 0);

  // Validate each row before doing anything mutative.
  for (const v of variants) {
    if (!v.sku.trim()) return { ok: false, error: "Varje variant behöver en SKU." };
    if (!v.label.trim())
      return { ok: false, error: "Varje variant behöver en etikett." };
    const price = parseFloat(v.price);
    if (!Number.isFinite(price) || price < 0)
      return { ok: false, error: `Ogiltigt pris för ${v.label}.` };
    if (
      v.compareAtPrice != null &&
      v.compareAtPrice !== "" &&
      (!Number.isFinite(parseFloat(v.compareAtPrice)) ||
        parseFloat(v.compareAtPrice) < 0)
    )
      return { ok: false, error: `Ogiltigt jämförpris för ${v.label}.` };
    if (!Number.isInteger(v.stock) || v.stock < 0)
      return { ok: false, error: `Ogiltigt lagersaldo för ${v.label}.` };
  }

  // SKU collision check across other products. Skip variants we're
  // updating (their own SKU is fine to keep).
  const incomingSkus = variants.map((v) => v.sku.trim());
  const duplicates = incomingSkus.filter(
    (s, i) => incomingSkus.indexOf(s) !== i
  );
  if (duplicates.length > 0)
    return {
      ok: false,
      error: `Dubblerade SKU inom paketet: ${[...new Set(duplicates)].join(", ")}`,
    };

  const ownIds = new Set(
    variants.filter((v) => v.id).map((v) => v.id!)
  );
  const conflicts = await prisma.productVariant.findMany({
    where: {
      sku: { in: incomingSkus },
      id: { notIn: Array.from(ownIds) },
    },
    select: { sku: true },
  });
  if (conflicts.length > 0)
    return {
      ok: false,
      error: `SKU används redan av andra produkter: ${conflicts.map((c) => c.sku).join(", ")}`,
    };

  const keepIds = new Set(variants.filter((v) => v.id).map((v) => v.id!));
  const toDelete = product.variants
    .map((v) => v.id)
    .filter((id) => !keepIds.has(id));

  try {
    await prisma.$transaction([
      ...toDelete.map((id) =>
        prisma.productVariant.delete({ where: { id } })
      ),
      ...variants.map((v, position) => {
        const data = {
          productId: product.id,
          sku: v.sku.trim(),
          label: v.label.trim(),
          position,
          price: parseFloat(v.price),
          compareAtPrice:
            v.compareAtPrice && v.compareAtPrice !== ""
              ? parseFloat(v.compareAtPrice)
              : null,
          stock: v.stock,
          manageStock: v.manageStock,
          weight: v.weight && v.weight !== "" ? parseFloat(v.weight) : null,
          isDefault: v.isDefault,
        };
        if (v.id) {
          return prisma.productVariant.update({
            where: { id: v.id },
            data,
          });
        }
        return prisma.productVariant.create({ data });
      }),
    ]);
  } catch (err) {
    console.error("setProductVariants failed:", err);
    return { ok: false, error: "Kunde inte spara varianterna." };
  }

  // Stock-notify fanout: if any variant just went 0 → positive AND the
  // product is published, fire pending notifications. Soft-fails — a
  // Brevo issue must not block the admin save.
  const afterAnyInStock =
    variants.length > 0 &&
    variants.some((v) => !v.manageStock || v.stock > 0);
  if (!beforeAnyInStock && afterAnyInStock && product.status === "PUBLISHED") {
    try {
      const { fanoutStockNotifications } = await import(
        "@/lib/stock-notifications/actions"
      );
      const result = await fanoutStockNotifications(product.id);
      if (result.sent > 0) {
        console.log(
          `[stock-notify] fanned out ${result.sent} mails for ${productSlug} (variant transition)`
        );
      }
    } catch (err) {
      console.error("[stock-notify] variant fanout threw:", err);
    }
  }

  bumpTag(productCacheTag(productSlug));
  bumpTag(productListCacheTag());
  return { ok: true };
}
