"use server";

import { bumpTag, productCacheTag, productListCacheTag } from "@/lib/cache/tags";
import { requireTenantRole } from "./guard";
import { tenantScope } from "@/lib/tenant/db";

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
  const { tenantId } = await requireTenantRole("admin");

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

  type SaveOutcome =
    | { kind: "missing" }
    | { kind: "conflict"; skus: string[] }
    | {
        kind: "ok";
        productId: string;
        status: string;
        beforeAnyInStock: boolean;
      };
  let outcome: SaveOutcome;
  try {
    outcome = await tenantScope(tenantId, async (tx): Promise<SaveOutcome> => {
      const product = await tx.product.findUnique({
        where: { slug: productSlug },
        select: {
          id: true,
          status: true,
          variants: { select: { id: true, stock: true, manageStock: true } },
        },
      });
      if (!product) return { kind: "missing" };

      // Snapshot pre-state so we can fire the back-in-stock fanout when
      // this save flips the product from "all variants empty" → "at
      // least one in stock". Mirrors the transition check in updateProduct().
      const beforeAnyInStock =
        product.variants.length > 0 &&
        product.variants.some((v) => !v.manageStock || v.stock > 0);

      const conflicts = await tx.productVariant.findMany({
        where: {
          sku: { in: incomingSkus },
          id: { notIn: Array.from(ownIds) },
        },
        select: { sku: true },
      });
      if (conflicts.length > 0)
        return { kind: "conflict", skus: conflicts.map((c) => c.sku) };

      const keepIds = new Set(variants.filter((v) => v.id).map((v) => v.id!));
      const toDelete = product.variants
        .map((v) => v.id)
        .filter((id) => !keepIds.has(id));

      for (const id of toDelete) {
        await tx.productVariant.delete({ where: { id } });
      }
      for (let position = 0; position < variants.length; position++) {
        const v = variants[position];
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
          tenantId,
        };
        if (v.id) {
          await tx.productVariant.update({ where: { id: v.id }, data });
        } else {
          await tx.productVariant.create({ data });
        }
      }

      return {
        kind: "ok",
        productId: product.id,
        status: product.status,
        beforeAnyInStock,
      };
    });
  } catch (err) {
    console.error("setProductVariants failed:", err);
    return { ok: false, error: "Kunde inte spara varianterna." };
  }

  if (outcome.kind === "missing")
    return { ok: false, error: "Produkten hittades inte." };
  if (outcome.kind === "conflict")
    return {
      ok: false,
      error: `SKU används redan av andra produkter: ${outcome.skus.join(", ")}`,
    };

  // Stock-notify fanout: if any variant just went 0 → positive AND the
  // product is published, fire pending notifications. Soft-fails — a
  // Brevo issue must not block the admin save.
  const afterAnyInStock =
    variants.length > 0 &&
    variants.some((v) => !v.manageStock || v.stock > 0);
  if (
    !outcome.beforeAnyInStock &&
    afterAnyInStock &&
    outcome.status === "PUBLISHED"
  ) {
    try {
      const { fanoutStockNotifications } = await import(
        "@/lib/stock-notifications/actions"
      );
      const result = await fanoutStockNotifications(outcome.productId);
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
