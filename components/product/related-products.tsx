import type { Product, Category } from "@prisma/client";
import { Display, Eyebrow, Accent } from "@/components/ui/typography";
import { ProductCard } from "./product-card";

type RelatedProduct = Pick<
  Product,
  "id" | "slug" | "name" | "shortDescription" | "imageUrl" | "price" | "totalSales"
> & {
  categories: Pick<Category, "name">[];
};

export function RelatedProducts({
  products,
  categoryName,
}: {
  products: RelatedProduct[];
  categoryName?: string;
}) {
  if (products.length === 0) return null;

  return (
    <section className="bg-surface-warm py-16 md:py-20 px-6 md:px-8 border-t border-border">
      <div className="max-w-[1240px] mx-auto">
        <div className="mb-10 max-w-[640px]">
          <Eyebrow>Kompletterande sortiment</Eyebrow>
          <Display size="lg" className="mt-3">
            Andra <Accent>{categoryName ?? "produkter"}</Accent> från Biomax
          </Display>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-12">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
