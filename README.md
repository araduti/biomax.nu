# Biomax.nu – Next.js 16 rebuild (Phase 1)

## Confirmed business priorities
1. **Marketing & Conversion first** (trust, upsell, social proof, email capture)
2. **SEO + AI SEO** (metadata, schema, indexability, content automation)
3. **Premium UX/UI** (clean, medical-grade trust, mobile first)
4. **Performance & scale** (edge-ready, fast navigation, maintainable architecture)

## Phase 1 deliverables implemented
- Next.js 16.2 + React 19.2 + TypeScript + App Router scaffold
- Tailwind CSS v4 setup (default in generated project)
- Prisma 7 schema for products, categories, blog, users, orders, reviews, wishlist, coupons, newsletter
- Homepage rebuild focused on Swedish health-brand conversion patterns
- Foundation dependencies: `clsx`, `tailwind-merge`, `zustand`, Prisma client

## Tech decisions (Phase 1)
- **Next.js 16 + Turbopack**: fastest iteration loop and production-grade App Router platform.
- **Tailwind v4**: simple design system evolution with low CSS overhead.
- **Prisma 7 + PostgreSQL**: type-safe schema and migrations for e-commerce + content data model.
- **Zustand**: lightweight cart state option (selected as preferred baseline).
- **Auth recommendation**: Auth.js v5 for full control over custom account + admin flows.

## Route map (App Router target structure)
Implemented now:
- `/` – homepage (hero, categories, bestsellers, trust + newsletter)

Planned next:
- `/produkter`
- `/produkter/[slug]`
- `/blogg`
- `/blogg/[slug]`
- `/konto`
- `/checkout`
- `/admin`
- `/api/ai-seo`
- `/immunforsvar` (marketing landing page pattern)

## Folder structure (Phase 1 baseline)
```txt
app/
  layout.tsx
  page.tsx
  globals.css
lib/
  utils.ts
prisma/
  schema.prisma
```

## Prisma models included
- Catalog: `Category`, `Product`, `ProductCrossSell`
- Content: `BlogCategory`, `BlogPost`
- Commerce: `Order`, `OrderItem`, `Coupon`
- Customer: `User`, `Address`, `Wishlist`, `WishlistProduct`, `Review`
- Marketing: `NewsletterSubscriber`

## Local setup
```bash
npm install
cp .env.example .env.local
npm run prisma:generate
npm run dev
```
