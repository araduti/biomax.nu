"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireTenantRole } from "./guard";
import { tenantScope } from "@/lib/tenant/db";
import { audit } from "./audit";
import { cuidSchema, fail } from "@/lib/validation/shared";
import {
  bumpTag,
  productCacheTag,
  productListCacheTag,
} from "@/lib/cache/tags";

/**
 * Admin inventory quick-edit. Lets the warehouse adjust a row's stock
 * without diving into the full product/variant editor — important for
 * weekly count reconciliation where the editor wants to change ten
 * numbers in a row, not open ten edit pages.
 *
 * Two actions:
 *   - setProductStock({ productId, stock })
 *   - setVariantStock({ variantId, stock })
 *
 * Both audit-log + invalidate the matching cache tags. Stock-notify
 * fanout (back-in-stock email) is fired when a 0 → positive transition
 * happens, mirroring the same hook in `lib/admin/product-actions.ts`.
 */

const SetProductStock = z.object({
  productId: cuidSchema,
  stock: z.coerce.number().int().min(0).max(999_999),
});

const SetVariantStock = z.object({
  variantId: cuidSchema,
  stock: z.coerce.number().int().min(0).max(999_999),
});

export type InventoryResult = { ok: true } | { ok: false; error: string };

export async function setProductStock(
  raw: unknown
): Promise<InventoryResult> {
  const actor = await requireTenantRole("admin");
  const { tenantId } = actor;
  const parsed = SetProductStock.safeParse(raw);
  if (!parsed.success) return fail(parsed.error);
  const { productId, stock } = parsed.data;

  const existing = await tenantScope(tenantId, (tx) =>
    tx.product.findUnique({
      where: { id: productId },
      select: { slug: true, stock: true, manageStock: true, status: true },
    })
  );
  if (!existing) return { ok: false, error: "Produkten hittades inte." };

  const wasOutOfStock =
    existing.manageStock &&
    existing.stock <= 0 &&
    existing.status === "PUBLISHED";

  try {
    await tenantScope(tenantId, (tx) =>
      tx.product.update({
        where: { id: productId },
        data: { stock },
      })
    );
    await audit({
      actorId: actor.userId,
      action: "inventory.product-stock-update",
      entityType: "Product",
      entityId: productId,
      diff: { slug: existing.slug, from: existing.stock, to: stock },
    });

    if (wasOutOfStock && stock > 0) {
      try {
        const { fanoutStockNotifications } = await import(
          "@/lib/stock-notifications/actions"
        );
        const result = await fanoutStockNotifications(productId);
        if (result.sent > 0) {
          console.log(
            `[stock-notify] fanned out ${result.sent} mails for ${existing.slug}`
          );
        }
      } catch (err) {
        console.error("[stock-notify] fanout threw:", err);
      }
    }

    bumpTag(productCacheTag(existing.slug));
    bumpTag(productListCacheTag());
    return { ok: true };
  } catch (err) {
    console.error("setProductStock failed:", err);
    return { ok: false, error: "Kunde inte spara." };
  }
}

export async function setVariantStock(
  raw: unknown
): Promise<InventoryResult> {
  const actor = await requireTenantRole("admin");
  const { tenantId } = actor;
  const parsed = SetVariantStock.safeParse(raw);
  if (!parsed.success) return fail(parsed.error);
  const { variantId, stock } = parsed.data;

  const existing = await tenantScope(tenantId, (tx) =>
    tx.productVariant.findUnique({
      where: { id: variantId },
      select: {
        label: true,
        stock: true,
        manageStock: true,
        product: {
          select: {
            id: true,
            slug: true,
            status: true,
            variants: {
              select: { id: true, stock: true, manageStock: true },
            },
          },
        },
      },
    })
  );
  if (!existing) return { ok: false, error: "Varianten hittades inte." };

  // Pre-transition aggregate: was the parent product effectively
  // out-of-stock (every variant at 0)? If so, the upcoming positive
  // value flips it back in — fan out the notify-me queue, same rule
  // the variant-actions save hook uses.
  const beforeAnyInStock =
    existing.product.variants.length > 0 &&
    existing.product.variants.some(
      (v) => !v.manageStock || v.stock > 0
    );

  try {
    await tenantScope(tenantId, (tx) =>
      tx.productVariant.update({
        where: { id: variantId },
        data: { stock },
      })
    );
    await audit({
      actorId: actor.userId,
      action: "inventory.variant-stock-update",
      entityType: "ProductVariant",
      entityId: variantId,
      diff: {
        productSlug: existing.product.slug,
        variant: existing.label,
        from: existing.stock,
        to: stock,
      },
    });

    const afterAnyInStock =
      stock > 0 ||
      existing.product.variants.some(
        (v) => v.id !== variantId && (!v.manageStock || v.stock > 0)
      );
    if (
      !beforeAnyInStock &&
      afterAnyInStock &&
      existing.product.status === "PUBLISHED"
    ) {
      try {
        const { fanoutStockNotifications } = await import(
          "@/lib/stock-notifications/actions"
        );
        await fanoutStockNotifications(existing.product.id);
      } catch (err) {
        console.error("[stock-notify] variant fanout threw:", err);
      }
    }

    bumpTag(productCacheTag(existing.product.slug));
    bumpTag(productListCacheTag());
    return { ok: true };
  } catch (err) {
    console.error("setVariantStock failed:", err);
    return { ok: false, error: "Kunde inte spara." };
  }
}
