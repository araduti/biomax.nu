# ADR 0008 — Build Roadmap & V1 Launch Scope

**Date:** 2026-05-10
**Status:** Accepted

## Context

The decision to rebuild biomax.nu from scratch is anchored in a clear strategic ambition:

> *"Create the best e-commerce supplements platform in Sweden, build it right end to end."* — Adrian, 2026-05-10

This rules out MVP-style shortcuts (manual admin via Prisma Studio, deferred email automation, deferred SEO depth, etc.). The build must hit a launch bar that exceeds existing competitors (Greatlife, Svensk Hälsokost, Apotea, Apohem) on every dimension that matters: conversion, discovery, trust, content, performance, accessibility, and operational tooling.

The 2026-05-10 WordPress export grounds the rebuild in real data: 14 products, 2,778 customers, 6,227 orders, 2.67M SEK lifetime revenue, ~95% of unit sales concentrated in four products (Balans, Björkglukos, Beta Glucan, Easy Way) across two dominant categories (*Sömn & Oro*, *Urinvägsinfektion*).

## Decision

### V1 launch bar (must-haves before DNS cutover)

**Catalog & Content**
- All 14 products migrated with real Swedish copy, prices, SKUs, ratings, Yoast SEO data preserved
- Real categories from sales data (drop fictional "Energi"; lead with *Sömn & Oro* and *Urinvägsinfektion*)
- Product detail pages with full schema.org markup (`Product`, `Offer`, `AggregateRating`, `FAQPage`)
- Category landing pages with botanical signature monograph for each
- Blog/Kunskap with at least 6 launch articles (one botanical monograph per category)
- Founder/about page anchored to Constantin's real story
- Sitemap, robots.txt, `llms.txt`, comprehensive structured data

**Commerce**
- Klarna Checkout v3 (per ADR 0004)
- Cart with persistence
- Customer accounts (Better Auth, ADR 0003)
- Order history (including imported historical orders)
- Inventory tracking, low-stock signals
- Order confirmation, shipping notification, abandoned-cart, post-purchase review-request emails

**Customer base preservation**
- 2,778 customer accounts migrated (forced password reset on first login)
- 6,227 historical orders migrated as read-only records linked to customer accounts
- 53 Trustpilot reviews referenced via live integration
- Newsletter subscriber list migrated with prior consent honored

**Operations**
- Admin dashboard for products, orders, customers, content
- Search (full-text on products + blog)
- Order export to fulfillment workflow
- Returns / refund workflow

**Quality & launch readiness**
- Mobile-first, Lighthouse Performance ≥ 90 on all routes
- WCAG 2.1 AA across the board, AAA on body text where feasible (per ADR 0007)
- Sentry error tracking
- Plausible analytics (GDPR-clean)
- Production Docker deployment to own infra (per ADR 0002)
- DNS cutover plan with 301 redirect map for all old WordPress URLs
- Re-export WordPress immediately before cutover to capture late orders/customers

### Phased delivery plan

Each phase is a coherent unit of work. Phases overlap where dependencies allow.

| Phase | Description | Sessions (rough) |
|---|---|---|
| **1A** | Data migration: WordPress XML → Postgres (products, categories, customers, orders, attachments) | 1 |
| **1B** | Foundation port: design tokens to Tailwind v4 `@theme`, component primitives, real homepage with real data | 1–2 |
| **2** | Catalog read paths: product listing, product detail, category landing, sitemap, structured data, `llms.txt` | 2 |
| **3** | Auth + commerce: Better Auth wired, cart, Klarna checkout, order placement, transactional email | 2–3 |
| **4** | Customer accounts: order history, addresses, profile, reorder, password reset | 1 |
| **5** | Admin dashboard: product / order / customer / content management | 2 |
| **6** | Content authoring: 6 launch monographs + blog index | 2 (writing-heavy) |
| **7** | Marketing automation: welcome series, abandoned-cart, post-purchase, win-back, newsletter | 1–2 |
| **8** | Search, reviews collection, performance/accessibility audit, monitoring | 2 |
| **9** | Launch: re-export WordPress, delta migration, DNS cutover, redirects, customer reactivation campaign | 1 |

**Estimated total:** 15–18 focused sessions to launch.

### Open decisions (with defaults if not specified)

These are deferred to forthcoming ADRs but receive working defaults so build can begin:

| Topic | Default | Pending ADR |
|---|---|---|
| Email transactional | **Postmark** (best deliverability for Swedish market, simple API) | 0009 |
| Email marketing automation | **Postmark Broadcasts** or **Brevo** (decide before Phase 7) | 0009 |
| Image storage | `public/products/` committed (≤ 100 images) until exceeds 50MB; then move to Cloudflare R2 | 0010 |
| Search | **Postgres `tsvector`** full-text for v1; revisit Meilisearch if relevance fails | 0011 |
| Analytics | **Plausible** (GDPR-clean, no cookie banner, Swedish-friendly) | 0012 |
| Error tracking | **Sentry** (industry standard, generous free tier) | 0012 |
| Reviews | **Trustpilot widget** (live integration) for site-wide; **on-site reviews** stored in our `Review` model for product-level | 0013 |
| Live chat | Out of scope for V1; revisit post-launch | 0014 |
| Subscriptions | Out of scope for V1 (revisit post-launch for Balans / Björkglukos auto-reorder) | 0015 |
| Customer password handling on migration | Force password reset on first login (industry standard, no WP password hashes carry over) | covered here |

### What's explicitly out of scope for V1

- Subscriptions / auto-reorder
- Quiz / personalized recommendation engine
- Live chat / Crisp
- Loyalty or referral program
- A/B testing framework
- Multi-warehouse fulfillment (single Kållered fulfillment)
- Mobile app
- B2B / wholesale portal
- Affiliate program

These remain on the post-launch roadmap and may earn their own ADRs when prioritized.

## Consequences

- This is a 15–18 session project. Adrian and Claude will work through it iteratively. Each phase produces a working, deployable increment.
- The 2,778 existing customers represent both an asset (reactivation) and a responsibility (GDPR, password reset, careful comms). The migration script must be auditable.
- "Build it right" means we **don't** ship partial pages with placeholder copy at launch. Either a route is production-quality or it isn't published.
- Some ADRs (0009–0015) will be written just-in-time when their phase begins. Defaults above let work proceed.
- The `/design` preview page will be retired or hidden once the real homepage is live in Phase 1B. It served its purpose.
