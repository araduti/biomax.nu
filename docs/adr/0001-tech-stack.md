# ADR 0001 — Tech Stack

**Date:** 2026-05-10  
**Status:** Accepted

## Context

Biomax.nu is a Swedish e-commerce store for health supplements. We are rebuilding the platform from scratch with a focus on performance, SEO (including AI-driven SEO), long-term maintainability, and developer experience. The stack must support server-side rendering for SEO, type safety end-to-end, and a lean dependency surface.

## Decision

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js App Router | 16.x |
| UI Runtime | React | 19.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| ORM | Prisma | 7.x |
| Database | PostgreSQL | 17.x |
| Client state | Zustand | 5.x |
| Package manager | npm | (lockfile v3) |

## Consequences

- **Next.js 16 App Router** gives us React Server Components, streaming SSR, and granular caching — all critical for SEO and Core Web Vitals.
- **Tailwind v4** uses a new CSS-first config (no `tailwind.config.js`). Utility classes are generated from CSS `@theme` blocks. Build times are faster; some v3 patterns do not apply.
- **Prisma 7** ships a new config file (`prisma.config.ts`) separate from the schema. The `datasource.url` is resolved there, not hardcoded in `schema.prisma`.
- **Zustand 5** is used exclusively for lightweight client-side cart/UI state. Server state lives in React Server Components or route handlers — no client-side data-fetching library needed.
- No UI component library is chosen yet — see ADR 0006.
