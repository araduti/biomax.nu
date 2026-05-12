/**
 * Server-side SEO analysis routines used by /admin/seo. None of these touch
 * external APIs — they're computed from our own DB + the in-code monograph
 * registry, so the dashboard is fast, free, and works offline.
 *
 * Pieces:
 *   - validateSchema(): structural JSON-LD validation per page
 *   - detectCannibalisation(): products targeting the same keyword
 *   - getKeywordCoverage(): which pages own which aiKeyword
 *   - getContentDepth(): per-page editorial depth signals
 */
import { prisma } from "@/lib/prisma";
import { stripHtml } from "@/lib/sanitize";
import { parseIngredientList } from "@/lib/products/ingredient-list";
import { buildProductFaq } from "@/lib/products/faq";
import { getAllIngredients } from "@/lib/knowledge/ingredients";

// ── Schema validation ────────────────────────────────────────────────

export type SchemaIssue = {
  severity: "error" | "warning";
  field: string;
  message: string;
};

export type SchemaReport = {
  page: string; // human label: "Q10 100 kapslar" or "Koenzym Q10 (monograph)"
  url: string;
  type: string; // schema.org @type
  issues: SchemaIssue[];
};

export async function validateSchema(): Promise<SchemaReport[]> {
  const products = await prisma.product.findMany({
    where: { status: "PUBLISHED" },
    select: {
      slug: true,
      name: true,
      sku: true,
      shortDescription: true,
      longDescription: true,
      imageUrl: true,
      price: true,
      seoTitle: true,
      seoDescription: true,
      ingredientList: true,
      usage: true,
      warnings: true,
      seoFaqJson: true,
    },
  });

  const reports: SchemaReport[] = [];

  for (const p of products) {
    // Product schema
    const productIssues: SchemaIssue[] = [];
    if (!p.name?.trim()) productIssues.push({ severity: "error", field: "name", message: "Produktnamn saknas" });
    if (!p.sku?.trim()) productIssues.push({ severity: "error", field: "sku", message: "SKU saknas" });
    if (!p.imageUrl?.trim()) productIssues.push({ severity: "error", field: "image", message: "Produktbild saknas" });
    const desc = p.seoDescription?.trim() || stripHtml(p.shortDescription, 500);
    if (!desc) productIssues.push({ severity: "error", field: "description", message: "Beskrivning saknas (varken seoDescription eller shortDescription)" });
    if (parseFloat(p.price.toString()) <= 0)
      productIssues.push({ severity: "error", field: "offers.price", message: "Pris ≤ 0" });

    reports.push({
      page: p.name,
      url: `/produkter/${p.slug}`,
      type: "Product",
      issues: productIssues,
    });

    // FAQPage (only when ≥2 Q&As)
    const faq = buildProductFaq(p);
    const faqIssues: SchemaIssue[] = [];
    if (faq.length < 2) {
      faqIssues.push({
        severity: "warning",
        field: "mainEntity",
        message: `Endast ${faq.length} FAQ — Google kräver minst 2 för rich-result`,
      });
    }
    if (faq.length >= 2 || faqIssues.length > 0) {
      reports.push({
        page: p.name,
        url: `/produkter/${p.slug}`,
        type: "FAQPage",
        issues: faqIssues,
      });
    }
  }

  // Ingredient monographs (DefinedTerm)
  for (const ing of getAllIngredients()) {
    const issues: SchemaIssue[] = [];
    if (!ing.summary || ing.summary.length < 30) {
      issues.push({
        severity: "warning",
        field: "description",
        message: "Sammanfattning för kort (<30 tecken) — påverkar tooltip + meta",
      });
    }
    if (ing.body.length === 0) {
      issues.push({
        severity: "error",
        field: "body",
        message: "Inga brödtext-stycken",
      });
    }
    if ((ing.references?.length ?? 0) === 0) {
      issues.push({
        severity: "warning",
        field: "citation",
        message: "Inga curaterade källor — minskar LLM-trovärdighet",
      });
    }
    reports.push({
      page: `${ing.name} (monografi)`,
      url: `/kunskap/ingredienser/${ing.slug}`,
      type: "DefinedTerm",
      issues,
    });
  }

  return reports;
}

// ── Cannibalisation detection ────────────────────────────────────────

export type Cannibalisation = {
  keyword: string;
  source: "seoFocusKw" | "aiKeywords";
  pages: { url: string; name: string }[];
};

export async function detectCannibalisation(): Promise<Cannibalisation[]> {
  const products = await prisma.product.findMany({
    where: { status: "PUBLISHED" },
    select: {
      slug: true,
      name: true,
      seoFocusKw: true,
      aiKeywords: true,
    },
  });

  const focusBuckets = new Map<string, { url: string; name: string }[]>();
  const aiBuckets = new Map<string, { url: string; name: string }[]>();

  for (const p of products) {
    const ref = { url: `/produkter/${p.slug}`, name: p.name };
    if (p.seoFocusKw?.trim()) {
      const key = p.seoFocusKw.trim().toLowerCase();
      const bucket = focusBuckets.get(key) ?? [];
      bucket.push(ref);
      focusBuckets.set(key, bucket);
    }
    for (const kw of p.aiKeywords ?? []) {
      const key = kw.trim().toLowerCase();
      if (!key) continue;
      const bucket = aiBuckets.get(key) ?? [];
      bucket.push(ref);
      aiBuckets.set(key, bucket);
    }
  }

  const out: Cannibalisation[] = [];
  for (const [keyword, pages] of focusBuckets) {
    if (pages.length > 1) {
      out.push({ keyword, source: "seoFocusKw", pages });
    }
  }
  for (const [keyword, pages] of aiBuckets) {
    // For aiKeywords we accept up to 2 pages targeting the same intent
    // (broad clusters like "magnesium" are fine across products) — flag 3+.
    if (pages.length > 2) {
      out.push({ keyword, source: "aiKeywords", pages });
    }
  }
  out.sort((a, b) => b.pages.length - a.pages.length);
  return out;
}

// ── Keyword coverage matrix ─────────────────────────────────────────

export type KeywordCoverage = {
  totalKeywords: number;
  productsWithKeywords: number;
  productsTotal: number;
  /** Top keywords by product count, capped. */
  topKeywords: { keyword: string; pages: { url: string; name: string }[] }[];
  /** Products that have NO aiKeywords assigned. */
  orphans: { url: string; name: string }[];
};

export async function getKeywordCoverage(): Promise<KeywordCoverage> {
  const products = await prisma.product.findMany({
    where: { status: "PUBLISHED" },
    select: {
      slug: true,
      name: true,
      aiKeywords: true,
    },
  });

  const buckets = new Map<string, { url: string; name: string }[]>();
  let productsWithKeywords = 0;
  const orphans: { url: string; name: string }[] = [];

  for (const p of products) {
    const ref = { url: `/produkter/${p.slug}`, name: p.name };
    const kws = (p.aiKeywords ?? [])
      .map((k) => k.trim())
      .filter(Boolean);
    if (kws.length === 0) {
      orphans.push(ref);
      continue;
    }
    productsWithKeywords++;
    for (const kw of kws) {
      const key = kw.toLowerCase();
      const bucket = buckets.get(key) ?? [];
      bucket.push(ref);
      buckets.set(key, bucket);
    }
  }

  const topKeywords = [...buckets.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .map(([keyword, pages]) => ({ keyword, pages }));

  return {
    totalKeywords: buckets.size,
    productsWithKeywords,
    productsTotal: products.length,
    topKeywords,
    orphans,
  };
}

// ── Content depth scorecard ─────────────────────────────────────────

export type ContentDepthRow = {
  url: string;
  name: string;
  wordCount: number;
  headingCount: number;
  imageCount: number;
  hasIngredientList: boolean;
  hasFaq: boolean;
  ingredientLinks: number;
  /** 0–100 composite score for sorting. */
  score: number;
};

export async function getContentDepth(): Promise<ContentDepthRow[]> {
  const products = await prisma.product.findMany({
    where: { status: "PUBLISHED" },
    select: {
      slug: true,
      name: true,
      shortDescription: true,
      longDescription: true,
      ingredientList: true,
      usage: true,
      warnings: true,
      seoFaqJson: true,
      galleryUrls: true,
    },
  });

  const rows: ContentDepthRow[] = [];

  for (const p of products) {
    const html = (p.shortDescription ?? "") + " " + (p.longDescription ?? "");
    const text = stripHtml(html, 100_000);
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const headingCount = (html.match(/<h[1-6]/gi) ?? []).length;
    const imageCount = 1 + (p.galleryUrls?.length ?? 0);
    const list = parseIngredientList(p.ingredientList);
    const hasIngredientList = !!list && list.rows.length > 0;
    const faq = buildProductFaq(p);
    const hasFaq = faq.length >= 2;
    const ingredientLinks = list?.rows.length ?? 0;

    // Score weights — chosen so a fully-fleshed-out product hits ~95+
    // and a barely-filled product sits around 30–50.
    let score = 0;
    score += Math.min(wordCount / 500, 1) * 30; // 0–30 from depth
    score += Math.min(headingCount / 4, 1) * 10; // 0–10 from structure
    score += Math.min(imageCount / 3, 1) * 10; // 0–10 from imagery
    score += hasIngredientList ? 20 : 0;
    score += hasFaq ? 15 : 0;
    score += Math.min(ingredientLinks / 5, 1) * 15; // 0–15 from ingredient breadth

    rows.push({
      url: `/produkter/${p.slug}`,
      name: p.name,
      wordCount,
      headingCount,
      imageCount,
      hasIngredientList,
      hasFaq,
      ingredientLinks,
      score: Math.round(score),
    });
  }

  rows.sort((a, b) => a.score - b.score); // weakest first — that's the work queue
  return rows;
}
