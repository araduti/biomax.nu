import { hostTenantScope } from "@/lib/tenant/db";

export type BundleSummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  discountPercent: number;
  items: {
    productId: string;
    slug: string;
    name: string;
    imageUrl: string;
    /** Each member product's individual list price in SEK. */
    listPriceSek: number;
  }[];
  /** Sum of member list prices before discount. */
  listTotalSek: number;
  /** List total × (1 - discountPercent/100), rounded to nearest krona. */
  bundlePriceSek: number;
  /** listTotalSek - bundlePriceSek. */
  savingsSek: number;
};

/**
 * Hydrate a bundle row into a render-ready summary with line items,
 * list total, bundle price, and savings. Pure read; safe to call from
 * any server component.
 */
function hydrate(b: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  discountPercent: number;
  items: {
    product: {
      id: string;
      slug: string;
      name: string;
      imageUrl: string;
      price: { toString: () => string };
    };
  }[];
}): BundleSummary {
  const items = b.items.map((i) => ({
    productId: i.product.id,
    slug: i.product.slug,
    name: i.product.name,
    imageUrl: i.product.imageUrl,
    listPriceSek: parseFloat(i.product.price.toString()),
  }));
  const listTotalSek = items.reduce((s, it) => s + it.listPriceSek, 0);
  const bundlePriceSek = Math.round(listTotalSek * (1 - b.discountPercent / 100));
  return {
    id: b.id,
    slug: b.slug,
    name: b.name,
    description: b.description,
    discountPercent: b.discountPercent,
    items,
    listTotalSek,
    bundlePriceSek,
    savingsSek: listTotalSek - bundlePriceSek,
  };
}

/** All active bundles, in position order — for /paket and homepage rail. */
export async function getActiveBundles(): Promise<BundleSummary[]> {
  const rows = await hostTenantScope((tx) =>
    tx.bundle.findMany({
      where: { active: true },
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      include: {
        items: {
          orderBy: { position: "asc" },
          include: {
            product: {
              select: {
                id: true,
                slug: true,
                name: true,
                imageUrl: true,
                price: true,
              },
            },
          },
        },
      },
    })
  );
  return rows.map(hydrate);
}

/** Bundles that include a specific product — for product-page cross-sells. */
export async function getBundlesForProduct(
  productId: string
): Promise<BundleSummary[]> {
  const rows = await hostTenantScope((tx) =>
    tx.bundle.findMany({
      where: {
        active: true,
        items: { some: { productId } },
      },
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      take: 3,
      include: {
        items: {
          orderBy: { position: "asc" },
          include: {
            product: {
              select: {
                id: true,
                slug: true,
                name: true,
                imageUrl: true,
                price: true,
              },
            },
          },
        },
      },
    })
  );
  return rows.map(hydrate);
}

export async function getBundleBySlug(
  slug: string
): Promise<BundleSummary | null> {
  const row = await hostTenantScope((tx) =>
    tx.bundle.findUnique({
      where: { slug },
      include: {
        items: {
          orderBy: { position: "asc" },
          include: {
            product: {
              select: {
                id: true,
                slug: true,
                name: true,
                imageUrl: true,
                price: true,
              },
            },
          },
        },
      },
    })
  );
  return row ? hydrate(row) : null;
}
