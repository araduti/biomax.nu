import Link from "next/link";
import type { Product, Category } from "@prisma/client";
import { Display, Eyebrow, Accent } from "@/components/ui/typography";
import { ProductCard } from "@/components/product/product-card";
import { Section } from "@/components/ui/section";

type ProductWithCategories = Pick<
  Product,
  "id" | "slug" | "name" | "shortDescription" | "imageUrl" | "price" | "totalSales"
> & {
  categories: Pick<Category, "name">[];
};

/**
 * Homepage bestsellers strip. Uses the shared ProductCard so the visual
 * treatment matches the /produkter catalog exactly — same image framing,
 * same typography hierarchy, same tag system. The editorial difference is
 * carried by the section header (eyebrow + italic accent) and the 3-up
 * (vs catalog 4-up) layout.
 */
export function Bestsellers({ products }: { products: ProductWithCategories[] }) {
  return (
    <Section tone="warm">
      <>
        <header className="flex flex-wrap justify-between items-baseline gap-4 mb-12">
          <div>
            <Eyebrow className="mb-3">Signaturprodukter</Eyebrow>
            <Display size="lg">
              Tre formuleringar som <Accent>definierar Biomax</Accent>
            </Display>
          </div>
          <Link
            href="/produkter"
            className="font-sans text-small font-semibold text-primary border-b border-primary/40 pb-0.5 hover:border-primary transition-colors"
          >
            Se alla produkter →
          </Link>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 lg:gap-x-16 gap-y-16">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </>
    </Section>
  );
}
