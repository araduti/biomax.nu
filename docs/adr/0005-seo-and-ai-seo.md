# ADR 0005 — SEO & AI SEO Strategy

**Date:** 2026-05-10  
**Status:** Accepted

## Context

Biomax.nu operates in the competitive Swedish health supplement market. Organic search is the highest-ROI acquisition channel. We need a strategy that covers:

1. Traditional SEO (structured data, metadata, Core Web Vitals, crawlability)
2. AI SEO — being surfaced in LLM-generated answers (ChatGPT, Perplexity, Google AI Overviews, Claude)
3. Multilingual (sv-SE primary, en secondary)

## Decision

### Traditional SEO

- **Metadata**: `generateMetadata()` per route with unique `title`, `description`, `canonical`, and `openGraph` per page.
- **Structured data**: JSON-LD via inline `<script type="application/ld+json">` in Server Components (not `next/script`) for:
  - `Organization` on root layout
  - `Product` + `Offer` + `AggregateRating` on product pages
  - `Article` + `BreadcrumbList` on blog posts
  - `FAQPage` on product pages (stored in `Product.seoFaqJson`)
  - `BreadcrumbList` on all pages
- **Sitemap**: auto-generated via `app/sitemap.ts` returning all products, categories, blog posts, and static pages with `lastmod` and `changefreq`.
- **robots.txt**: `app/robots.ts` — allow all, disallow `/admin`, `/api`, `/checkout`.
- **Core Web Vitals**: Server Components for product listings and blog (zero JS by default), streaming for above-the-fold content, `next/image` with explicit `width`/`height` everywhere, no layout shift.

### AI SEO (LLM Discoverability)

LLMs index the web and build knowledge graphs from authoritative, structured, well-cited content. To be surfaced in AI-generated answers:

- **Factual, citable product content**: `longDescription` and blog posts must be written in clear, authoritative prose — statements LLMs can directly cite (avoid marketing fluff).
- **AI keyword clustering**: `Product.aiKeywords` and `BlogPost.aiKeywordCluster` store the semantic keyword clusters we target for each piece of content. These feed into content briefs and are used to audit coverage gaps.
- **FAQ schema on every product page**: `Product.seoFaqJson` stores questions and answers that match real user queries. LLMs parse FAQ schema explicitly.
- **Internal linking strategy**: blog posts link to relevant products; product pages link to supporting blog content. This builds topical authority graphs that both Google and LLMs use.
- **`llms.txt`**: we will publish `/llms.txt` (the emerging standard for AI crawlers) listing our most authoritative content with structured summaries.
- **Citations and sourcing**: health claims link to PubMed or authoritative sources. LLMs heavily weight pages that cite real research.

### Locale

- **Single locale: `sv-SE`.** biomax.nu sells exclusively in the Swedish market. No English version, no `/en` routes, no `hreflang` for other languages, no language switcher in the UI.
- The `locale` field on `User`, `BlogPost`, and `NewsletterSubscriber` in the Prisma schema defaults to `sv-SE` and is treated as documentation, not an active multilingual feature.
- All metadata, JSON-LD, copy, product descriptions, and blog content are written natively in Swedish.

## Consequences

- Every new product page requires: `seoTitle`, `seoDescription`, `seoFaqJson` (min 3 Q&A pairs), `aiKeywords` (min 5 terms).
- Blog content strategy is tied to the AI keyword cluster map — no post is published without a cluster assignment.
- `app/sitemap.ts` must be kept in sync with all published content types.
- `sharp` is required (already a dep) for Next.js image optimization to serve WebP/AVIF.
