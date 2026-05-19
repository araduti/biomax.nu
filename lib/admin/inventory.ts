import { hostTenantScope } from "@/lib/tenant/db";
import { getLowStockDefault } from "@/lib/site/settings";

export type InventoryRow = {
  kind: "product" | "variant";
  /** Stable id used by the edit form — productId for single-SKU,
   *  variantId for variant rows. */
  rowId: string;
  /** Parent product slug for the admin product-edit link. */
  productSlug: string;
  /** Display name — `Product name — Variant label` for variants. */
  name: string;
  sku: string;
  /** ProductImage (parent) so the row reads at a glance. */
  imageUrl: string;
  stock: number;
  threshold: number;
  manageStock: boolean;
  /** Bucket for sorting + filter chips. */
  severity: "out" | "low" | "ok";
};

export type InventorySnapshot = {
  rows: InventoryRow[];
  counts: { all: number; out: number; low: number; ok: number };
  threshold: number;
};

/**
 * Full inventory snapshot for /admin/lager.
 *
 * Variant-aware:
 *   - For products with ≥2 variants we emit one row per variant
 *     (`kind: "variant"`). The parent's `stock` field is ignored — for
 *     variant products it's a phantom field; only the variants count.
 *   - For products with <2 variants we emit a single product row
 *     (`kind: "product"`).
 *
 * Only PUBLISHED products are included — DRAFT/ARCHIVED have
 * intentional zero stock and would be noise in the inventory view.
 *
 * Severity bucketing:
 *   - `out`  → manageStock + stock === 0
 *   - `low`  → manageStock + 0 < stock <= threshold
 *   - `ok`   → everything else (including `!manageStock` unlimited)
 *
 * Sorted by severity ascending then by stock ascending — the most-
 * urgent rows surface first; "ok" rows fall to the bottom.
 */
export async function getInventory(): Promise<InventorySnapshot> {
  const threshold = await getLowStockDefault();

  const products = await hostTenantScope((tx) =>
    tx.product.findMany({
      where: { status: "PUBLISHED" },
      select: {
        id: true,
        slug: true,
        sku: true,
        name: true,
        stock: true,
        manageStock: true,
        lowStockThreshold: true,
        imageUrl: true,
        variants: {
          select: {
            id: true,
            sku: true,
            label: true,
            stock: true,
            manageStock: true,
          },
          orderBy: { position: "asc" },
        },
      },
      orderBy: { name: "asc" },
    })
  );

  const rows: InventoryRow[] = [];
  for (const p of products) {
    const productThreshold = p.lowStockThreshold ?? threshold;
    if (p.variants.length >= 2) {
      for (const v of p.variants) {
        rows.push({
          kind: "variant",
          rowId: v.id,
          productSlug: p.slug,
          name: `${p.name} — ${v.label}`,
          sku: v.sku,
          imageUrl: p.imageUrl,
          stock: v.stock,
          threshold: productThreshold,
          manageStock: v.manageStock,
          severity: severityOf(v.stock, productThreshold, v.manageStock),
        });
      }
    } else {
      rows.push({
        kind: "product",
        rowId: p.id,
        productSlug: p.slug,
        name: p.name,
        sku: p.sku,
        imageUrl: p.imageUrl,
        stock: p.stock,
        threshold: productThreshold,
        manageStock: p.manageStock,
        severity: severityOf(p.stock, productThreshold, p.manageStock),
      });
    }
  }

  const severityRank = { out: 0, low: 1, ok: 2 };
  rows.sort((a, b) => {
    const s = severityRank[a.severity] - severityRank[b.severity];
    return s !== 0 ? s : a.stock - b.stock;
  });

  const counts = {
    all: rows.length,
    out: rows.filter((r) => r.severity === "out").length,
    low: rows.filter((r) => r.severity === "low").length,
    ok: rows.filter((r) => r.severity === "ok").length,
  };

  return { rows, counts, threshold };
}

function severityOf(
  stock: number,
  threshold: number,
  manageStock: boolean
): InventoryRow["severity"] {
  if (!manageStock) return "ok";
  if (stock === 0) return "out";
  if (stock <= threshold) return "low";
  return "ok";
}
