import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getAllIngredients } from "@/lib/knowledge/ingredients";
import { findProductsForIngredient } from "@/lib/knowledge/ingredient-products";
import { publicProductWhere } from "@/lib/products/availability";
import { getAllSymptoms } from "@/lib/symptoms/registry";

const SITE = "https://www.biomax.nu";

// Stable `lastmod` for static/editorial URLs. Previously these used
// `new Date()`, so with hourly revalidation every static page reported
// "modified" every hour — which trains crawlers to ignore our lastmod.
// Bump this when static/editorial content meaningfully changes.
// (Products & categories use their own `updatedAt`, not this.)
const SITE_CONTENT_UPDATED = new Date("2026-05-17T00:00:00Z");

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: publicProductWhere(),
      select: { slug: true, updatedAt: true },
    }),
    prisma.category.findMany({
      where: {
        slug: { not: "uncategorized" },
        products: { some: publicProductWhere() },
      },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  const now = SITE_CONTENT_UPDATED;

  return [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    {
      url: `${SITE}/produkter`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE}/kategorier`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE}/hjalp`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    ...getAllSymptoms().map((s) => ({
      url: `${SITE}/hjalp/${s.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    {
      url: `${SITE}/om-oss`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE}/butik`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE}/kontakt`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE}/faq`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE}/behandlingar`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${SITE}/frakt-och-retur`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${SITE}/villkor`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE}/integritet`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE}/gdpr`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE}/kunskap`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SITE}/kunskap/ingredienser`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...categories.map((c) => ({
      url: `${SITE}/kategorier/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...products.map((p) => ({
      url: `${SITE}/produkter/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
    ...getAllIngredients().map((ing) => ({
      url: `${SITE}/kunskap/ingredienser/${ing.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...(await buyRoutes(now)),
  ];
}

/**
 * Programmatic /kop/[slug] landing pages — emitted only for ingredients with
 * matching products so the sitemap doesn't claim 0-product surfaces.
 */
async function buyRoutes(now: Date): Promise<MetadataRoute.Sitemap> {
  const out: MetadataRoute.Sitemap = [];
  for (const ing of getAllIngredients()) {
    const products = await findProductsForIngredient(ing);
    if (products.length === 0) continue;
    out.push({
      url: `${SITE}/kop/${ing.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.75,
    });
  }
  return out;
}
