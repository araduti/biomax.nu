import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { currentTenant } from "@/lib/tenant";
import { withTenantRLS } from "@/lib/tenant/rls";
import { TopBar } from "@/components/site/top-bar";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ProductHero } from "@/components/product/product-hero";
import { StickyMobileBuyBar } from "@/components/product/sticky-mobile-buy-bar";
import { ProductContent } from "@/components/product/product-content";
import { RelatedProducts } from "@/components/product/related-products";
import { BundlesForProduct } from "@/components/product/bundles-for-product";
import { getBundlesForProduct } from "@/lib/bundles/queries";
import { JsonLd } from "@/components/seo/json-ld";
import { productLd, breadcrumbLd, faqLd, reviewLd } from "@/lib/jsonld";
import { buildProductFaq } from "@/lib/products/faq";
import { stripHtml } from "@/lib/sanitize";
import {
  isProductAvailable,
  publicProductWhere,
} from "@/lib/products/availability";
import {
  getProductRating,
  getProductReviews,
  getMyReviewForProduct,
  getReviewGoalCounts,
} from "@/lib/reviews/queries";
import { ReviewList } from "@/components/reviews/review-list";
import { ReviewForm } from "@/components/reviews/review-form";
import { currentUser } from "@/lib/session";
import { isInRoutine } from "@/lib/routine/actions";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { productCacheTag } from "@/lib/cache/tags";

// Multi-tenant (ADR 0028/0030 D7): tenant-scoped routes must NOT use
// path-keyed route-level ISR — Next caches the rendered route by URL
// path, not by Host, so one tenant's HTML (and notFound status) would
// be served to another. The route is dynamic; data-layer caching is
// retained via the tenant-keyed `unstable_cache` in getProduct
// (revalidate 600 + tag invalidation preserved there).
export const dynamic = "force-dynamic";

type RouteParams = Promise<{ slug: string }>;

// `unstable_cache` JSON-serializes its result, so Date columns come back
// as ISO strings on a cache hit. We rehydrate them here so callers can
// keep using `.toISOString()` / `.getTime()` exactly as if they came
// fresh from Prisma. (Decimal columns survive as strings; everywhere we
// use price/weight/etc we already go through `.toString()` / parseFloat,
// so those don't need rehydration.)
const DATE_FIELDS = [
  "createdAt",
  "updatedAt",
  "publishedAt",
  "availableFrom",
  "availableUntil",
  "dateReviewed",
] as const;

function rehydrateDates<T>(row: T): T {
  if (!row || typeof row !== "object") return row;
  const r = row as Record<string, unknown>;
  for (const f of DATE_FIELDS) {
    const v = r[f];
    if (typeof v === "string") r[f] = new Date(v);
  }
  const variants = r.variants;
  if (Array.isArray(variants)) {
    for (const v of variants as Record<string, unknown>[]) {
      if (typeof v.createdAt === "string") v.createdAt = new Date(v.createdAt);
      if (typeof v.updatedAt === "string") v.updatedAt = new Date(v.updatedAt);
    }
  }
  return row;
}

async function fetchProduct(tenantId: string, slug: string) {
  // Tenant-isolated read: FORCE RLS on "Product" + SET LOCAL via
  // withTenantRLS → another tenant's slug resolves to null → 404.
  return withTenantRLS(tenantId, (tx) =>
    tx.product.findFirst({
      where: { slug },
      include: {
        categories: { select: { id: true, name: true, slug: true } },
        variants: { orderBy: { position: "asc" } },
      },
    })
  );
}

type ProductRow = Awaited<ReturnType<typeof fetchProduct>>;

const getProduct = cache(async (slug: string): Promise<ProductRow> => {
  const tenant = await currentTenant();
  // Cache key MUST include the tenant (ADR 0028/0030 D7) — a slug-only
  // key would serve one tenant's product to another (cache poisoning,
  // defeating RLS at the cache layer).
  const row = await unstable_cache(
    () => fetchProduct(tenant.id, slug),
    ["product-by-slug", tenant.id, slug],
    { tags: [productCacheTag(slug)], revalidate: 600 }
  )();
  return rehydrateDates(row);
});

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
      // Product images are normalized to 1000×1000 by the upload
      // pipeline; declaring dimensions lets social platforms render
      // the card without a re-fetch round-trip.
      images: ogImage
        ? [{ url: ogImage, alt: product.name, width: 1000, height: 1000 }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: RouteParams;
  searchParams?: Promise<{ recensioner?: string }>;
}) {
  const { slug } = await params;
  const { id: tenantId } = await currentTenant();
  const product = await getProduct(slug);
  if (!product) {
    // Slug may have been renamed — check the redirect table before 404.
    const hit = await withTenantRLS(tenantId, (tx) =>
      tx.redirect.findUnique({
        where: { tenantId_fromPath: { tenantId, fromPath: `/produkter/${slug}` } },
        select: { toPath: true },
      })
    );
    if (hit) redirect(hit.toPath);
    notFound();
  }
  if (!isProductAvailable(product)) notFound();

  const primaryCategory = product.categories[0];

  // Editor-pinned cross-sells take priority. Order is `score DESC` (newest pin
  // gets the highest score in the action). Falls back to category-based
  // auto-pick when no pins exist.
  const pinned = await withTenantRLS(tenantId, (tx) =>
    tx.productCrossSell.findMany({
      where: { sourceProductId: product.id },
      orderBy: { score: "desc" },
      select: {
        targetProduct: {
          include: { categories: { select: { name: true }, take: 1 } },
        },
      },
    })
  );
  const pinnedProducts = pinned
    .map((p) => p.targetProduct)
    .filter((p) => isProductAvailable(p));

  const related =
    pinnedProducts.length > 0
      ? pinnedProducts
      : primaryCategory
        ? await withTenantRLS((await currentTenant()).id, (tx) =>
            tx.product.findMany({
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
          )
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

  // Reviews — aggregate + recent. Aggregate counts feed the JSON-LD
  // AggregateRating block so Google can render ⭐ in search results.
  // Cap the list at 20 to keep the page lean; pagination is a follow-up
  // once any product crosses that count.
  const reviewGoalFilter = (await searchParams)?.recensioner?.trim() || null;
  const [rating, reviews, viewer, bundles, reviewGoalCounts, inRoutine] =
    await Promise.all([
      getProductRating(product.id),
      getProductReviews(product.id, 20, reviewGoalFilter),
      currentUser(),
      getBundlesForProduct(product.id),
      getReviewGoalCounts(product.id),
      isInRoutine(product.id),
    ]);

  // Pre-fetch the viewer's own review (if any) so the form can render its
  // "already submitted"-state without a round-trip on submit.
  const myReview = viewer
    ? await getMyReviewForProduct(viewer.id, product.id)
    : null;

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
          averageRating: rating.count > 0 ? rating.average : null,
          reviewCount: rating.count > 0 ? rating.count : null,
          dateModified: product.dateReviewed
            ? product.dateReviewed.toISOString()
            : product.updatedAt.toISOString(),
        })}
      />
      {(() => {
        const faq = buildProductFaq(product);
        return faq.length >= 2 ? <JsonLd data={faqLd(faq)} /> : null;
      })()}
      {/* Per-review JSON-LD (top 10 approved reviews) — Schema.org
          eligibility for the review snippet rich result. */}
      {reviews.slice(0, 10).map((r) => (
        <JsonLd
          key={`review-${r.id}`}
          data={reviewLd({
            productName: product.name,
            rating: r.rating,
            body: r.body,
            authorName: r.authorDisplay,
            datePublished: r.createdAt.toISOString(),
          })}
        />
      ))}
      <main>
        <div className="max-w-[1240px] mx-auto px-6 md:px-8 pt-8 pb-4">
          <Breadcrumb crumbs={crumbs} />
        </div>
        <div id="buy-panel">
          <ProductHero
            product={product}
            rating={rating}
            loggedIn={Boolean(viewer)}
            inRoutine={inRoutine}
          />
        </div>
        <StickyMobileBuyBar
          productName={product.name}
          productImageUrl={product.imageUrl}
          fromPriceSek={product.price.toString()}
          buyPanelTargetId="buy-panel"
        />
        {/* Recensioner now lives as the third tab inside ProductContent.
            Surfacing them again as a free-standing section was a duplicate
            entry point — the hero "läs recensionerna" link uses the
            `#recensioner` hash and ProductTabs activates the tab on mount. */}
        <ProductContent
          product={product}
          reviews={{
            count: rating.count,
            content: (
              <div className="max-w-[820px]">
                <ReviewList
                  reviews={reviews}
                  aggregate={rating}
                  goalCounts={reviewGoalCounts}
                  activeGoal={reviewGoalFilter}
                  baseHref={`/produkter/${product.slug}`}
                />
                <div className="mt-10">
                  <ReviewForm
                    productSlug={product.slug}
                    loggedIn={Boolean(viewer)}
                    existingReview={myReview}
                  />
                </div>
              </div>
            ),
          }}
        />

        <BundlesForProduct
          bundles={bundles}
          currentProductName={product.name}
        />

        <RelatedProducts
          products={related}
          categoryName={primaryCategory?.name}
        />
      </main>
      <Footer />
    </>
  );
}
