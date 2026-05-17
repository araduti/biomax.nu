# Security Audit — biomax.nu

- **Agent:** security-auditor
- **Date:** 2026-05-18 · **Commit:** 2fb7538 · **Mode:** read-only (authorized owner review)

## Summary

Overall risk posture: **Moderate, trending strong.** Above-average maturity for a solo-operated shop: DB-re-validated admin role, mandatory admin 2FA, encrypted TOTP secrets, consistent Zod validation, parametric Prisma (no raw SQL in app code), deliberate CSP + full header set. Dominant residual risk is an **SSRF** in the admin hero "mirror remote URL" feature. Remaining items are hardening, not active breaches.

## Strengths

- `requireAdmin` (`lib/admin/guard.ts:31`) re-queries DB for role, enforces 2FA before any admin view/mutation, returns 404 to hide `/admin`.
- 2FA secrets encrypted at rest (Better Auth `symmetricEncrypt`, keyed off `BETTER_AUTH_SECRET`); `@@index([secret])` is on ciphertext.
- IDOR-resistant customer actions — owner-scoped `findFirst({ where:{ id, userId } })` (`lib/orders/self-service-actions.ts:42–47`).
- No raw SQL in app code (only in `test/integration/*`).
- Layered: DB-backed per-IP+per-email login limits, reset session revocation (`lib/auth.ts:110`), constant-time webhook compare (`app/api/webhooks/klarna/route.ts:30–35`), fail-closed cron auth.
- Strong transport/header posture (HSTS preload, frame-ancestors none, locked Permissions-Policy, base-uri/form-action self).

## Findings

### High
- **H1 — SSRF in `mirrorRemotePhoto`** (`lib/admin/hero-actions.ts:129–168`). `fetch()`es any attacker-influenced URL: no host allow-list, no private-IP/DNS filtering, follows redirects; content-type/size checked *after* the request → blind SSRF (cloud metadata `169.254.169.254`, internal services, localhost) viable. `images.remotePatterns` does NOT apply here (that's `next/image`). *Fix: host allow-list (images.unsplash.com), reject RFC1918/link-local/loopback/ULA pre-connect, re-validate per redirect (or `redirect:"manual"`), stream + abort on byte budget.*

### Medium
- **M1 — Rich-text XSS via regex sanitizer** (`lib/sanitize.ts:18`, rendered `dangerouslySetInnerHTML` in `product-content.tsx:80`, `product-hero.tsx:123`). Regex delete-list, not a parser; doesn't neutralise `javascript:`/`data:` hrefs, unquoted `onerror`, SVG/iframe/object, mutation-XSS. Owner-controlled today but admin-CMS-editable → stored XSS against every shopper if admin compromised/multi-author. *Fix: real sanitizer (sanitize-html / DOMPurify, strict allow-list).*
- **M2 — `script-src 'unsafe-inline' 'unsafe-eval'`** (`next.config.ts:45`) weakens CSP, compounds M1. *Fix: nonce-based script-src; at minimum drop `unsafe-eval` if unused, hash JSON-LD.*

### Low
- **L1** — `/api/web-vitals` unauthenticated + unthrottled `upsert` (shape-validated, truncated) → flood/storage abuse. Add IP rate-limit/sampling.
- **L2** — Dev-only `trustedOrigins` wildcards (`lib/auth.ts:84`) correctly `isDev`-gated; ensure prod `NODE_ENV` reliable.

*No SQLi, no IDOR, no broken admin-action authz, no plaintext-secret-at-rest found — each checked against concrete code.*

## Project Direction

Security maturity clearly upward (mandatory admin 2FA, reset session revocation, constant-time webhook auth, fail-closed cron; threat-model reasoning in comments). Principal gap: input-trust boundaries for *admin-authored* content (hero URL fetch, rich-text HTML) were designed for a single trusted operator and aren't hardened against admin-account compromise / multi-author expansion — the natural next maturity step.

## Top 3 Priorities

1. **Fix H1 (SSRF)** — host allow-list + private-IP/redirect guards in `mirrorRemotePhoto`.
2. **Fix M1 (rich-text XSS)** — replace regex sanitizer with a proper HTML sanitizer.
3. **Tighten CSP script-src (M2)** — remove `unsafe-eval` if unused; plan nonce-based inline handling.
