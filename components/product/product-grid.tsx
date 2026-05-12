import { ProductCard } from "./product-card";
import type { Product, Category } from "@prisma/client";

type GridProduct = Pick<
  Product,
  "id" | "slug" | "name" | "shortDescription" | "imageUrl" | "price" | "totalSales"
> & {
  categories?: Pick<Category, "name">[];
};

export function ProductGrid({ products }: { products: GridProduct[] }) {
  if (products.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="font-display italic text-xl text-ink-mute">
          Inga produkter just nu i denna kategori.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 md:gap-x-12 lg:gap-x-16 gap-y-20">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
