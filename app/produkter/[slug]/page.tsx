import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TopBar } from "@/components/site/top-bar";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ProductHero } from "@/components/product/product-hero";
import { ProductContent } from "@/components/product/product-content";
import { RelatedProducts } from "@/components/product/related-products";
import { JsonLd } from "@/components/seo/json-ld";
import { productLd, breadcrumbLd, faqLd } from "@/lib/jsonld";
import { buildProductFaq } from "@/lib/products/faq";
import { stripHtml } from "@/lib/sanitize";
import {
  isProductAvailable,
  publicProductWhere,
} from "@/lib/products/availability";

// Render fresh on every request during build/seed iteration so admin edits
// and import scripts surface immediately. Switch back to `revalidate = 600`
// (or tag-based revalidation) once content has stabilised.
export const dynamic = "force-dynamic";

type RouteParams = Promise<{ slug: string }>;

async function getProduct(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: { categories: true },
  });
}

export async function generateMetadata({
  params,
}: {
  params: RouteParams;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Produkt hittades inte" };

  // Cascade: SEO field → fallback to shortDescription/name → final default.
  const description =
    product.seoDescription ||
    stripHtml(product.shortDescription, 160) ||
    `${product.name} från Biomax — vetenskapligt baserat naturpreparat sedan 2001.`;
  const title = product.seoTitle || product.name;

  // OG fields: prefer the OG-specific override, then SEO, then the basic.
  // OG audience is social feeds, so the override lets editorial write punchier
  // copy targeted at that surface without affecting the SERP snippet.
  const ogTitle = product.ogTitle || title;
  const ogDescription = product.ogDescription || description;
  const ogImage = product.ogImageUrl || product.imageUrl;
  const ogKeywords = [
    product.seoFocusKw,
    ...(product.aiKeywords ?? []),
  ].filter((k): k is string => !!k && k.trim().length > 0);

  return {
    title,
    description,
    alternates: { canonical: `/produkter/${product.slug}` },
    keywords: ogKeywords.length > 0 ? ogKeywords : undefined,
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      type: "website",
      url: `/produkter/${product.slug}`,
      images: ogImage ? [{ url: ogImage, alt: product.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: RouteParams }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) {
    // Slug may have been renamed — check the redirect table before 404.
    const hit = await prisma.redirect.findUnique({
      where: { fromPath: `/produkter/${slug}` },
      select: { toPath: true },
    });
    if (hit) redirect(hit.toPath);
    notFound();
  }
  if (!isProductAvailable(product)) notFound();

  const primaryCategory = product.categories[0];

  // Editor-pinned cross-sells take priority. Order is `score DESC` (newest pin
  // gets the highest score in the action). Falls back to category-based
  // auto-pick when no pins exist.
  const pinned = await prisma.productCrossSell.findMany({
    where: { sourceProductId: product.id },
    orderBy: { score: "desc" },
    select: {
      targetProduct: {
        include: { categories: { select: { name: true }, take: 1 } },
      },
    },
  });
  const pinnedProducts = pinned
    .map((p) => p.targetProduct)
    .filter((p) => isProductAvailable(p));

  const related =
    pinnedProducts.length > 0
      ? pinnedProducts
      : primaryCategory
        ? await prisma.product.findMany({
            where: {
              ...publicProductWhere(),
              price: { gt: 0 },
              slug: { not: product.slug },
              categories: { some: { id: primaryCategory.id } },
            },
            include: { categories: { select: { name: true }, take: 1 } },
            orderBy: { totalSales: "desc" },
            take: 3,
          })
        : [];

  const crumbs = [
    { label: "Hem", href: "/" },
    { label: "Produkter", href: "/produkter" },
    ...(primaryCategory
      ? [
          {
            label: primaryCategory.name,
            href: `/kategorier/${primaryCategory.slug}`,
          },
        ]
      : []),
    { label: product.name, href: `/produkter/${product.slug}` },
  ];

  const inStock = !product.manageStock || product.stock > 0;

  return (
    <>
      <TopBar />
      <Header />
      <JsonLd data={breadcrumbLd(crumbs)} />
      <JsonLd
        data={productLd({
          name: product.name,
          slug: product.slug,
          sku: product.sku,
          description: stripHtml(
            product.longDescription || product.shortDescription,
            500
          ),
          imageUrl: product.imageUrl,
          galleryUrls: product.galleryUrls,
          price: product.price.toString(),
          currency: "SEK",
          inStock,
          category: primaryCategory?.name,
          dateModified: product.dateReviewed
            ? product.dateReviewed.toISOString()
            : product.updatedAt.toISOString(),
        })}
      />
      {(() => {
        const faq = buildProductFaq(product);
        return faq.length >= 2 ? <JsonLd data={faqLd(faq)} /> : null;
      })()}
      <main>
        <div className="max-w-[1240px] mx-auto px-6 md:px-8 pt-8 pb-4">
          <Breadcrumb crumbs={crumbs} />
        </div>
        <ProductHero product={product} />
        <ProductContent product={product} />
        <RelatedProducts
          products={related}
          categoryName={primaryCategory?.name}
        />
      </main>
      <Footer />
    </>
  );
}
