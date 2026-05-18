import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { publicProductWhere } from "@/lib/products/availability";
import { TopBar } from "@/components/site/top-bar";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Display, Eyebrow, Accent } from "@/components/ui/typography";
import {
  CategoryFilter,
  type FilterOption,
} from "@/components/product/category-filter";
import { ProductGrid } from "@/components/product/product-grid";
import { getRatingsByProductIds } from "@/lib/reviews/queries";
import { SortSelect } from "@/components/product/sort-select";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbLd, itemListLd } from "@/lib/jsonld";

export const revalidate = 600;

type Sort = "bestsellers" | "newest" | "sale";

function resolveSort(raw: string | undefined): Sort | "all" {
  if (raw === "bestsellers" || raw === "newest" || raw === "sale") return raw;
  return "all";
}

const META_BY_SORT: Record<
  Sort | "all",
  { title: string; description: string; eyebrow: string; h1: string }
> = {
  all: {
    title: "Alla produkter — naturpreparat med klinisk dokumentation",
    description:
      "Hela Biomax sortiment av vetenskapligt baserade naturpreparat. Sömn & oro, urinvägsinfektion, immunförsvar, leder, hjärta-kärl, mage-tarm, vitaminer & mineraler, kognition.",
    eyebrow: "Sortiment",
    h1: "Alla produkter",
  },
  bestsellers: {
    title: "Bästsäljare — våra mest köpta naturpreparat",
    description:
      "Produkterna som svenska kunder återkommer till. Sortimentet sorterat efter antal genomförda köp.",
    eyebrow: "Sortiment",
    h1: "Bästsäljare",
  },
  newest: {
    title: "Nyheter — senaste tillskotten i sortimentet",
    description:
      "Senaste produkterna vi tagit in. Nytt sortiment uppdateras löpande när forskningsläget och leverantörerna är på plats.",
    eyebrow: "Sortiment",
    h1: "Nyheter",
  },
  sale: {
    title: "Erbjudanden — naturpreparat på rea",
    description:
      "Aktuella nedsatta priser på produkter ur Biomax sortiment.",
    eyebrow: "Sortiment",
    h1: "Erbjudanden",
  },
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}): Promise<Metadata> {
  const { sort } = await searchParams;
  const meta = META_BY_SORT[resolveSort(sort)];
  // Canonical always points at unparam'd /produkter — the sort views are
  // facets of the same collection, not separate canonical pages.
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: "/produkter" },
  };
}

export default async function ProductsIndex({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort: rawSort } = await searchParams;
  const sort = resolveSort(rawSort);
  const meta = META_BY_SORT[sort];

  // Order by clauses — same Prisma query shape, different sort/filter.
  // For "newest" we coalesce on publishedAt then createdAt (Prisma orders
  // nulls last by default in the first clause, so this Just Works).
  const orderBy =
    sort === "newest"
      ? ([{ publishedAt: "desc" as const }, { createdAt: "desc" as const }])
      : ([{ totalSales: "desc" as const }]);

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { ...publicProductWhere(), price: { gt: 0 } },
      orderBy,
      // Explicit select — the card only renders 7 fields. Default `include`
      // would pull longDescription + ingredientList JSON + every SEO/OG
      // field for every card, which is 10-50× the bytes we need.
      select: {
        id: true,
        slug: true,
        name: true,
        shortDescription: true,
        imageUrl: true,
        price: true,
        compareAtPrice: true,
        totalSales: true,
        categories: { select: { name: true }, take: 1 },
      },
    }),
    prisma.category.findMany({
      where: {
        slug: { not: "uncategorized" },
        // Hide empty categories using the SAME visibility rule the listing
        // uses below, otherwise a category with only DRAFT or scheduled
        // products would still appear in the filter row.
        products: { some: { ...publicProductWhere(), price: { gt: 0 } } },
      },
      select: {
        slug: true,
        name: true,
        // Count the same products the listing actually renders, so the
        // "3" on the chip can never disagree with the grid below.
        _count: {
          select: {
            products: { where: { ...publicProductWhere(), price: { gt: 0 } } },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  // "Sale" needs field-to-field comparison (compareAtPrice > price). Prisma's
  // where filters don't do that, so we fetch with compareAtPrice present and
  // filter in JS — at this catalogue size the cost is negligible.
  const filtered =
    sort === "sale"
      ? products.filter((p) => {
          if (!p.compareAtPrice) return false;
          const original = parseFloat(p.compareAtPrice.toString());
          const current = parseFloat(p.price.toString());
          return original > current;
        })
      : products;

  // Bulk-fetch ratings so cards can render "★ 4.6 (24)" without N+1 queries.
  const ratings = await getRatingsByProductIds(filtered.map((p) => p.id));

  const filterOptions: FilterOption[] = categories.map((c) => ({
    slug: c.slug,
    name: c.name,
    count: c._count.products,
    href: `/kategorier/${c.slug}`,
  }));

  const crumbs = [
    { label: "Hem", href: "/" },
    { label: "Produkter", href: "/produkter" },
  ];

  return (
    <>
      <TopBar />
      <Header />
      <JsonLd data={breadcrumbLd(crumbs)} />
      <JsonLd
        data={itemListLd({
          name: meta.title,
          url: "/produkter",
          items: filtered.map((p) => ({
            name: p.name,
            href: `/produkter/${p.slug}`,
          })),
        })}
      />
      <main className="bg-surface min-h-screen">
        <div className="max-w-[1240px] mx-auto px-6 md:px-8 pt-8 pb-4">
          <Breadcrumb crumbs={crumbs} />
        </div>

        <section className="px-6 md:px-8 pb-8">
          <div className="max-w-[1240px] mx-auto">
            {sort === "all" ? (
              <>
                <Eyebrow>Sortiment</Eyebrow>
                <Display as="h1" size="xl" className="mt-3 mb-4">
                  Alla <Accent>produkter</Accent>
                </Display>
                <p className="font-sans text-base md:text-lg text-ink-mute max-w-[640px]">
                  {meta.description}
                </p>
              </>
            ) : (
              // Sort-variant view: lighter header. The H1 IS the sort label,
              // so a redundant "SORTIMENT" eyebrow and a long subtitle just
              // create visual noise above the actual product grid.
              <div className="flex items-baseline justify-between flex-wrap gap-x-6 gap-y-2">
                <Display as="h1" size="xl">
                  {meta.h1}
                </Display>
                <Link
                  href="/produkter"
                  className="font-sans text-small font-semibold text-accent-deep hover:text-primary-deep border-b border-accent/40 hover:border-accent pb-px transition-colors"
                >
                  ← Hela sortimentet
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Single combined filter row: category pills on the left,
            sort dropdown on the right. One row instead of two competing rows. */}
        <section className="px-6 md:px-8 pb-10">
          <div className="max-w-[1240px] mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CategoryFilter options={filterOptions} activeSlug={null} />
            </div>
            <div className="flex-shrink-0">
              <SortSelect current={sort === "all" ? "bestsellers" : sort} />
            </div>
          </div>
        </section>

        <section className="px-6 md:px-8 pb-24">
          <div className="max-w-[1240px] mx-auto">
            {filtered.length === 0 ? (
              <div className="bg-surface-alt border border-border rounded-2xl px-6 md:px-8 py-10 md:py-12 text-center">
                <Eyebrow>{sort === "sale" ? "Inga erbjudanden just nu" : "Inga produkter"}</Eyebrow>
                <p className="mt-3 font-display italic text-xl md:text-2xl text-ink-mute leading-snug max-w-[520px] mx-auto">
                  {sort === "sale"
                    ? "Vi rear sällan — det är medvetet. Kolla tillbaka eller utforska hela sortimentet under tiden."
                    : "Sortimentet är tomt just nu. Kolla tillbaka snart."}
                </p>
                <Link
                  href="/produkter"
                  className="mt-6 inline-flex items-center gap-2 font-sans text-small font-semibold text-accent-deep hover:text-primary-deep transition-colors"
                >
                  Se hela sortimentet <span aria-hidden>→</span>
                </Link>
              </div>
            ) : (
              <ProductGrid products={filtered} ratings={ratings} />
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
