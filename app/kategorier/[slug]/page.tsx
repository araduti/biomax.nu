import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { currentTenant } from "@/lib/tenant";
import { tenantScope, hostTenantScope } from "@/lib/tenant/db";
import { publicProductWhere } from "@/lib/products/availability";
import { TopBar } from "@/components/site/top-bar";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { CategoryHero } from "@/components/category/category-hero";
import { ProductGrid } from "@/components/product/product-grid";
import { getRatingsByProductIds } from "@/lib/reviews/queries";
import {
  CategoryFilter,
  type FilterOption,
} from "@/components/product/category-filter";
import { JsonLd } from "@/components/seo/json-ld";
import {
  breadcrumbLd,
  itemListLd,
  collectionPageLd,
} from "@/lib/jsonld";
import { categoryMetaBySlug } from "@/lib/categories";

// Multi-tenant (ADR 0032 D4): no path-keyed route ISR — would serve
// one tenant's category HTML to another. Dynamic per request.
export const dynamic = "force-dynamic";

type RouteParams = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: RouteParams;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await hostTenantScope((tx) =>
    tx.category.findUnique({ where: { slug } })
  );
  if (!category) return { title: "Hälsoområde hittades inte" };
  const meta = categoryMetaBySlug(slug);
  return {
    title: `${category.name} — naturpreparat`,
    description:
      meta?.description ||
      `${category.name} från Biomax — vetenskapligt baserade naturpreparat med klinisk dokumentation.`,
    alternates: { canonical: `/kategorier/${slug}` },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: RouteParams;
}) {
  const { slug } = await params;
  const { id: tenantId } = await currentTenant();
  const category = await tenantScope(tenantId, (tx) =>
    tx.category.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        _count: { select: { products: { where: publicProductWhere() } } },
      },
    })
  );
  if (!category) {
    const hit = await tenantScope(tenantId, (tx) =>
      tx.redirect.findUnique({
        where: { fromPath: `/kategorier/${slug}` },
        select: { toPath: true },
      })
    );
    if (hit) redirect(hit.toPath);
    notFound();
  }
  const meta = categoryMetaBySlug(slug);
  if (!meta) notFound();

  const [products, allCategories] = await tenantScope(tenantId, (tx) =>
    Promise.all([
      tx.product.findMany({
        where: {
          ...publicProductWhere(),
          price: { gt: 0 },
          categories: { some: { id: category.id } },
        },
        // Explicit select — see comment in app/produkter/page.tsx.
        select: {
          id: true,
          slug: true,
          name: true,
          shortDescription: true,
          imageUrl: true,
          price: true,
          totalSales: true,
          categories: { select: { name: true }, take: 1 },
        },
        orderBy: { totalSales: "desc" },
      }),
      tx.category.findMany({
        where: {
          slug: { not: "uncategorized" },
          products: { some: publicProductWhere() },
        },
        select: {
          slug: true,
          name: true,
          _count: { select: { products: { where: publicProductWhere() } } },
        },
        orderBy: { name: "asc" },
      }),
    ])
  );

  const ratings = await getRatingsByProductIds(products.map((p) => p.id));

  const filterOptions: FilterOption[] = allCategories.map((c) => ({
    slug: c.slug,
    name: c.name,
    count: c._count.products,
    href: `/kategorier/${c.slug}`,
  }));

  const crumbs = [
    { label: "Hem", href: "/" },
    { label: "Hälsoområden", href: "/kategorier" },
    { label: category.name, href: `/kategorier/${category.slug}` },
  ];

  return (
    <>
      <TopBar />
      <Header />
      <JsonLd data={breadcrumbLd(crumbs)} />
      <JsonLd
        data={collectionPageLd({
          name: category.name,
          description: meta.description,
          url: `/kategorier/${slug}`,
        })}
      />
      <JsonLd
        data={itemListLd({
          name: category.name,
          url: `/kategorier/${slug}`,
          items: products.map((p) => ({
            name: p.name,
            href: `/produkter/${p.slug}`,
          })),
        })}
      />
      <main>
        <div className="max-w-[1240px] mx-auto px-6 md:px-8 pt-8 pb-4">
          <Breadcrumb crumbs={crumbs} />
        </div>
        <CategoryHero
          name={category.name}
          meta={meta}
          productCount={category._count.products}
        />
        <section className="bg-surface px-6 md:px-8 py-10">
          <div className="max-w-[1240px] mx-auto">
            <CategoryFilter options={filterOptions} activeSlug={category.slug} />
          </div>
        </section>
        <section className="bg-surface px-6 md:px-8 pb-24">
          <div className="max-w-[1240px] mx-auto">
            <ProductGrid products={products} ratings={ratings} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
