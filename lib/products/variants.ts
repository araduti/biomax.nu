import type { Product, ProductVariant } from "@prisma/client";

/**
 * Public shape we render variants with on the public site. Trimmed down
 * from the Prisma row — `Decimal` → `string` so client components can
 * safely receive it through serialization boundaries.
 */
export type PublicVariant = {
  id: string;
  sku: string;
  label: string;
  position: number;
  /** Decimal in SEK as string. */
  price: string;
  /** Decimal in SEK as string, when on sale. */
  compareAtPrice: string | null;
  /** Convenience: live stock-availability state. */
  inStock: boolean;
  stock: number;
  manageStock: boolean;
  isDefault: boolean;
};

/** Resolved variant info for a product — what the page needs to render. */
export type ResolvedVariants =
  | { hasVariants: false }
  | {
      hasVariants: true;
      variants: PublicVariant[];
      /** The variant pre-selected on page load (default → first). */
      defaultVariant: PublicVariant;
      /** Cheapest variant — used for "Från X kr"-style labels in catalogue. */
      cheapestVariant: PublicVariant;
    };

function toPublicVariant(v: ProductVariant): PublicVariant {
  const inStock = !v.manageStock || v.stock > 0;
  return {
    id: v.id,
    sku: v.sku,
    label: v.label,
    position: v.position,
    price: v.price.toString(),
    compareAtPrice: v.compareAtPrice ? v.compareAtPrice.toString() : null,
    inStock,
    stock: v.stock,
    manageStock: v.manageStock,
    isDefault: v.isDefault,
  };
}

/**
 * Decide how the public product page should render. Returns a discriminated
 * union so the rendering JSX can switch cleanly: variantless products use
 * the parent Product's price/stock; multi-variant products use the variant
 * selector + the chosen variant's price/stock.
 *
 * A product with exactly **one** variant is treated as variantless from
 * a UX perspective (no selector shown) — the variant just exists as a row
 * for inventory/order purposes. We still render the variant's price/stock
 * rather than the parent product's so editors only have to maintain one.
 *
 * Caller is responsible for passing the variants array (typically fetched
 * via `include: { variants: { orderBy: { position: "asc" } } }`).
 */
export function resolveVariants(
  variants: ProductVariant[]
): ResolvedVariants {
  if (variants.length < 2) return { hasVariants: false };

  const sorted = [...variants].sort((a, b) => a.position - b.position);
  const publicVariants = sorted.map(toPublicVariant);
  const explicit = publicVariants.find((v) => v.isDefault);
  const defaultVariant = explicit ?? publicVariants[0];
  const cheapestVariant = [...publicVariants].sort(
    (a, b) => parseFloat(a.price) - parseFloat(b.price)
  )[0];

  return {
    hasVariants: true,
    variants: publicVariants,
    defaultVariant,
    cheapestVariant,
  };
}

/**
 * Convenience for the product hero + cart line: turn a Product + (optional)
 * variant array into a single "display price/stock" pair. Used so the
 * surrounding component doesn't have to know about the variant model when
 * it doesn't need to.
 */
export function displayPrice(
  product: Pick<Product, "price" | "compareAtPrice" | "stock" | "manageStock">,
  resolved: ResolvedVariants
): {
  priceSek: number;
  compareAtPriceSek: number | null;
  inStock: boolean;
  stock: number;
  manageStock: boolean;
} {
  if (!resolved.hasVariants) {
    return {
      priceSek: parseFloat(product.price.toString()),
      compareAtPriceSek: product.compareAtPrice
        ? parseFloat(product.compareAtPrice.toString())
        : null,
      inStock: !product.manageStock || product.stock > 0,
      stock: product.stock,
      manageStock: product.manageStock,
    };
  }
  const v = resolved.defaultVariant;
  return {
    priceSek: parseFloat(v.price),
    compareAtPriceSek: v.compareAtPrice ? parseFloat(v.compareAtPrice) : null,
    inStock: v.inStock,
    stock: v.stock,
    manageStock: v.manageStock,
  };
}
