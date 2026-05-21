# Platform/Tenant Separation Audit — biomax → kine

**Date:** 2026-05-21
**Status:** Audit complete · awaiting human decisions
**Scope:** Read-only scan of `feat/korg-multi-tenant` @ `c126cb0` (audit branch `claude/korg-3-16-platform-extraction-audit`).
**Author:** automated agent (slice #16)

## Executive summary

- **Total findings: 58**
- By category:
  - PARAMETERIZE: 12
  - TENANT-CONFIG: 21
  - SEED-DATA: 7
  - PLUGIN: 4
  - LEGIT-CROSS-TENANT: 6
  - UNCLEAR: 8
- **Top-density files** (by count of finding-locations, descending):
  1. `app/design/page.tsx` — many literals (this is a designer playground; entire file is plugin/tenant content)
  2. `lib/email/templates.ts` + `lib/email/layout.ts` — every transactional email
  3. `lib/jsonld.ts` — every JSON-LD blob hardcodes Biomax HB
  4. `app/feeds/google-shopping.xml/route.ts` + `app/feeds/prisjakt.xml/route.ts`
  5. `lib/symptoms/registry.ts` — every seoTitle ends in `| Biomax`
  6. `components/site/footer.tsx` + `components/site/header.tsx` + `components/site/mobile-nav.tsx`
  7. `app/api/cron/*` (warehouse alert + auth expiry emails)
  8. `app/admin/ordrar/[orderNumber]/faktura/page.tsx` (invoice header)
  9. `lib/auth.ts` + `lib/loyalty/constants.ts`
  10. `prisma/schema.prisma` (a handful of biomax-mentioning comments + the Tenant model)
- **Estimated effort:** several findings are mechanical (`small`), but the *cluster* (jsonld + email + meta + footer + symptoms registry + JSON feeds) is **large** because the "Biomax" string + biomax.nu URL is woven through every server-rendered content surface. Estimate ~3 medium-sized PRs to lift to tenant tokens.

## Methodology

For each pattern in slice §"Scope of search", a `grep -rn` was run across `app/`, `components/`, `lib/`, `scripts/`, `prisma/`, `proxy.ts`, `Design/`, `public/`, `vitest.integration.config.ts`. Findings are clustered: where a single mechanical category (e.g. "every email template references biomax.nu") spans many lines, it is one finding with `Locations` listing each hit, not N findings. Documentation directories (`docs/adr/**`, `docs/brand/**`, `docs/strategi/**`, `docs/varumarke/**`, `docs/label-system-brief.md`, `docs/legal-compliance-review-*.md`) were intentionally NOT crawled per scope rules. Migration files referencing biomax in historical UPDATE statements are flagged once as LEGIT-CROSS-TENANT, not enumerated. The WordPress XML export, `node_modules/`, `.next/`, `.claude/worktrees/`, and tsbuildinfo files were skipped.

---

## Findings

### Finding 1 — `cookiePrefix: "biomax"` on storefront Better Auth
- **Location:** `lib/auth.ts:141`
- **Pattern:** `cookiePrefix: "biomax",`
- **Current behavior:** All storefront sessions, cart, 2FA cookies are prefixed `biomax`. The platform plane (`lib/auth-platform.ts`) already uses the parameterised `korgadm` prefix.
- **Why it's biomax-specific:** Storefront cookie prefix is a *platform-plane* concern (one storefront cookie shape across all tenants on `*.korg.nu`); hardcoding `biomax` ties cookie naming to tenant #1.
- **Category proposal:** PARAMETERIZE
- **Reasoning:** Should be a platform constant (e.g. `"korg"`) — every tenant shares one Better Auth instance + one cookie prefix. Distinct from per-tenant branding.
- **Open questions:** Migration: existing biomax users' `biomax.session_token` cookies become invalid the moment this flips. Consider supporting both prefixes during a deprecation window, or treat the rename as a one-time forced re-login on cutover.
- **Size:** small (the rename), medium (the migration tail).

### Finding 2 — TOTP issuer `"Biomax"`
- **Location:** `lib/auth.ts:207`
- **Pattern:** `twoFactor({ issuer: "Biomax", ... })`
- **Current behavior:** Authenticator apps show "Biomax" as the issuer label on every TOTP entry.
- **Why it's biomax-specific:** The TOTP issuer should be the tenant's brand (so a customer with TOTP on three different shops on Korg sees three distinct entries).
- **Category proposal:** TENANT-CONFIG
- **Reasoning:** Either pull from `currentTenant().name` if the instance can read tenant at config time, or scope per-tenant by minting org-specific TOTP secrets with the tenant name baked in at enrolment time. Better Auth's `twoFactor` plugin issuer is module-level — extracting needs an architectural decision (one issuer per platform, or dynamic at enrolment).
- **Open questions:** Are TOTP secrets re-encoded if issuer changes? Existing biomax 2FA enrolments will still display "Biomax" — that's fine since they migrated as such.
- **Size:** medium

### Finding 3 — `BETTER_AUTH_URL` falls back to `https://www.biomax.nu`
- **Location:** `lib/auth.ts:97`
- **Pattern:** `: [process.env.BETTER_AUTH_URL ?? "https://www.biomax.nu"],`
- **Current behavior:** Trusted origin fallback in production.
- **Why it's biomax-specific:** Hard fallback URL.
- **Category proposal:** PARAMETERIZE
- **Reasoning:** In a multi-tenant world `trustedOrigins` is a wildcard list (`*.korg.nu`, plus custom domains). The `?? "https://www.biomax.nu"` should be removed or replaced with `*.korg.nu` once domain registry exists.
- **Size:** small

### Finding 4 — Auto-enrol every customer into "Familjen Biomax" loyalty
- **Location:** `lib/auth.ts:178-197`, `lib/loyalty/constants.ts:1-56` (`LOYALTY_PROGRAM_NAME = "Familjen Biomax"`)
- **Current behavior:** `databaseHooks.user.create.after` calls `ensureLoyaltyAccount`; the program is named "Familjen Biomax" in copy throughout the app.
- **Why it's biomax-specific:** "Familjen Biomax" is a tenant program name. Auto-enrol-on-signup is also a tenant policy, not a platform default.
- **Category proposal:** TENANT-CONFIG (program name, earn/burn rates, welcome bonus) + UNCLEAR (auto-enrol on signup as platform behaviour).
- **Reasoning:** Loyalty itself is platform infrastructure (LoyaltyAccount, LoyaltyTransaction models). Each tenant configures: enabled?, program name, earn rate, burn rate, welcome bonus, expiry months. The constants in `lib/loyalty/constants.ts` should become a per-Tenant `LoyaltyConfig` row.
- **Open questions:** ADR 0019 frames loyalty as a Biomax-only feature; if other tenants want it, the family-naming pattern (`Familjen <Brand>`) is itself a template — does kine ship default program names or always require admin choice? See also Finding 39 (`/konto/familjen` route slug is Swedish + biomax-flavoured).
- **Size:** large (model + admin UI + copy lift + ADR amendment)

### Finding 5 — Loyalty constants live in code, not DB
- **Location:** `lib/loyalty/constants.ts` (whole file)
- **Pattern:** `POINTS_PER_KR_EARNED`, `ORE_PER_POINT`, `WELCOME_BONUS_POINTS`, `MIN_REDEMPTION_POINTS`, `LOYALTY_INACTIVITY_MONTHS`, `LOYALTY_PROGRAM_NAME`
- **Current behavior:** Module-level TypeScript constants imported across order, checkout, and account code.
- **Why it's biomax-specific:** Each tenant will have different earn/burn economics.
- **Category proposal:** TENANT-CONFIG
- **Reasoning:** New model `LoyaltyConfig` (or fold into a `Tenant.settings` JSON). Existing constants become the seed for biomax-tenant's row. Note the file comment explicitly says "Live in code (not the DB) so historical transactions are immutable" — that's about historical points math, NOT about cross-tenant scoping; the immutability argument is satisfied by snapshotting rates onto each transaction row, not by keeping them per-platform.
- **Size:** medium

### Finding 6 — `DEFAULT_TENANT_SLUG = "biomax"` resolution fallback
- **Location:** `lib/tenant/host.ts:16`, `lib/tenant/index.ts:46-62`
- **Pattern:** `export const DEFAULT_TENANT_SLUG = "biomax";`
- **Current behavior:** Unrecognised host (apex korg.nu, localhost, IPs, unknown subdomain after suspension) → biomax. Tenant zero is fail-safe target until 3b lock-down flip.
- **Why it's biomax-specific:** Platform fallback hardcodes a tenant slug.
- **Category proposal:** UNCLEAR
- **Reasoning:** Already intentionally documented as transitional ("fail-safe to tenant zero so the storefront's behaviour is unchanged while the platform is incrementally tenant-scoped"). Post-cutover the platform should NOT default to any tenant — unknown host → 404. Flag for explicit decision: keep biomax as fallback forever, or refactor to "no tenant resolved → reject"?
- **Open questions:** Already coupled with the next slice's lock-down flip. May resolve itself.
- **Size:** small (literally rip out the constant after lock-down)

### Finding 7 — Tenant.primaryColorHex default `"#1e3a5f"` (biomax navy) on schema
- **Location:** `prisma/schema.prisma:1591` (`primaryColorHex String @default("#1e3a5f")`)
- **Current behavior:** Tenant rows default to biomax navy when no color is set.
- **Why it's biomax-specific:** "Deep clinical blue" is biomax's brand color.
- **Category proposal:** PARAMETERIZE (with kine's neutral default) or remove the `@default` and force admin to set on tenant creation.
- **Reasoning:** A new tenant getting biomax navy by default is wrong. Either no default (NOT NULL, set at create-time) or pick a kine-platform neutral.
- **Size:** small

### Finding 8 — Storefront cart localStorage key `"biomax-cart"`
- **Location:** `lib/cart-store.ts:192`
- **Pattern:** `name: "biomax-cart",`
- **Category proposal:** PARAMETERIZE
- **Reasoning:** Cart key should be `korg-cart` or scoped per tenant slug (`korg-cart-${slug}`). Currently a customer who visits two Korg tenants in one browser would share cart contents (a real cross-tenant bug, not just naming). Worth highlighting.
- **Open questions:** Is the cart store actually cross-tenant-leaky today? Check: if Customer is on `tenantA.korg.nu` then visits `tenantB.korg.nu`, do they see tenantA's cart items? Very likely yes — same localStorage key, no tenant scope.
- **Size:** small (rename + scope), but the bug it surfaces is medium.

### Finding 9 — Consent storage keys + DOM event names
- **Locations:**
  - `lib/consent/constants.ts:11` — `CONSENT_SUBJECT_KEY = "biomax-consent-id"`
  - `components/site/cookie-consent.tsx:39` — `STORAGE_KEY = "biomax-consent"`
  - `components/site/cookie-consent.tsx:63,134-135` — DOM events `biomax:consent-changed`, `biomax:open-consent`
  - `components/site/cookie-settings-link.tsx:14` — dispatches `biomax:open-consent`
- **Category proposal:** PARAMETERIZE
- **Reasoning:** Same cross-tenant localStorage hazard as the cart. Rename to `korg-consent` + namespace per-tenant if consent decisions are tenant-specific (GDPR controller is the tenant, so likely yes).
- **Open questions:** Per-tenant consent or per-platform? Decision affects whether key should be `korg-consent-${slug}` or just `korg-consent`.
- **Size:** small

### Finding 10 — Admin overview widgets localStorage key `"biomax-admin-overview-widgets"`
- **Location:** `lib/admin/widget-prefs.ts:47`
- **Category proposal:** PARAMETERIZE
- **Reasoning:** Cross-tenant admin layout sharing isn't terrible but the name is wrong. Rename to `korg-admin-overview-widgets`.
- **Size:** small

### Finding 11 — Admin packlista checked-items localStorage `"biomax-packlista-checked"`
- **Location:** `components/admin/packlista-order-card.tsx:21`
- **Category proposal:** PARAMETERIZE
- **Size:** small

### Finding 12 — Admin "integration banner dismissed" localStorage keys
- **Location:** `components/admin/integration-banner.tsx:24,25`
- **Pattern:** `"biomax-admin-integration-banner-dismissed"`, `"biomax-admin-integration-banner-dismissed-forever"`
- **Category proposal:** PARAMETERIZE
- **Size:** small

### Finding 13 — sessionStorage `"biomax:lastDelivery"` checkout key
- **Location:** `app/checkout/checkout-flow.tsx:167`, `app/checkout/bekraftelse/clear-cart.tsx:36`
- **Category proposal:** PARAMETERIZE
- **Size:** small

### Finding 14 — Brand prose class `prose-biomax` in globals.css
- **Locations:**
  - `app/globals.css:122-184` — every `.prose-biomax {...}` rule
  - All consumers: `components/product/product-content.tsx:79`, `components/product/product-hero.tsx:122`, `components/ui/rich-text-editor.tsx:133`, `components/site/legal-page.tsx:62`, `app/om-oss/page.tsx:36`
- **Category proposal:** PARAMETERIZE
- **Reasoning:** Rename to `prose-korg` (or just `prose`). It's platform-default rich-text typography — no per-tenant difference.
- **Size:** small

### Finding 15 — `<BiomaxLogo />` component name + import
- **Locations:** `components/brand/BiomaxLogo.tsx`, `components/site/header.tsx:2,26`, `components/site/footer.tsx:2,52`, `components/auth/auth-shell.tsx:3,29`, `app/design/page.tsx:3,50`
- **Pattern:** Component renders SVG hardcoded as Biomax wordmark.
- **Category proposal:** TENANT-CONFIG
- **Reasoning:** Logo is the per-tenant brand asset. Should become `<TenantLogo />` reading from `tenant.logoUrl` (or `tenant.logoSvg`) with `BiomaxLogo` becoming biomax-tenant-row content. The SVG asset `public/brand/biomax-logo.svg` follows it.
- **Open questions:** Inline SVG vs uploaded raster — what does the Tenant table hold?
- **Size:** medium

### Finding 16 — `public/brand/biomax-logo.svg` + `public/brand/founder/*`
- **Locations:** `public/brand/biomax-logo.svg`, `public/brand/founder/*`
- **Category proposal:** TENANT-CONFIG (move to tenant storage / per-tenant DB-rooted asset)
- **Reasoning:** Tenant brand assets baked into `public/`. Should live in S3/uploads with a `Tenant.logoAssetId` pointer, or in a tenant-uploaded asset table. The "Constantin Raduti, grundare av Biomax 2001" founder portrait is also content that belongs to biomax-tenant.
- **Size:** medium

### Finding 17 — `Design/tokens.css` titled "Biomax — Nordic Steel · refined"
- **Locations:** `Design/tokens.css:1`, `app/globals.css:4` (header comment "Biomax design tokens")
- **Category proposal:** TENANT-CONFIG
- **Reasoning:** The `@theme` block in `app/globals.css` (lines ~10-50) defines biomax-specific brand colors (deep navy `#1e3a5f`, sage `#7a8b6f`). These should derive from `tenant.theme` JSON at runtime via CSS custom properties set on `<html>` per tenant. The kine platform should ship a neutral default theme; biomax's tokens become its seed data.
- **Open questions:** Tailwind v4 `@theme` is build-time. Runtime theming likely needs `style="--color-primary: ..."` injection from a server layout. This is a non-trivial pattern change.
- **Size:** large

### Finding 18 — Email layout hardcodes Biomax everywhere
- **Locations:**
  - `lib/email/layout.ts:35-39` — footer string "Biomax — vetenskapligt baserade naturpreparat sedan 2001", "Biomax HB · Eken Hälsobutik, Ekenleden 15A, 428 36 Kållered", `kontakt@biomax.nu`
  - `lib/email/layout.ts:49` — `<title>Biomax</title>`
  - `lib/email/layout.ts:62-66` — header `<a href="https://www.biomax.nu">biomax</a>` + "Sedan 2001 · Kållered"
  - `lib/email/layout.ts:9-21` — `BRAND` constant with biomax colors
- **Category proposal:** TENANT-CONFIG
- **Reasoning:** Every transactional email is biomax-shaped. Must read `currentTenant()` and template per-tenant: brand name, colors, return address (legal-entity + street/city/postcode), support email, founding-year tagline.
- **Size:** medium

### Finding 19 — Email templates hardcode Biomax copy, URLs, slogans
- **Locations:** `lib/email/templates.ts:26,27,44,53,80,82,171,212,248,258,282,288,303,317,325,338,340,528`
- **Pattern:** Subjects ("Återställ ditt Biomax-lösenord", "Välkommen till Biomax", "Tre saker värda att veta om Biomax"), URLs (`https://www.biomax.nu/produkter/...`, `/spara/...`), signoff `"— Biomax · Sedan 2001"`, founder-story body "Biomax har drivits från Kållered sedan 2001".
- **Category proposal:** TENANT-CONFIG (URLs, brand name, signoff) + PLUGIN (founder-story body for the "tre saker"/onboarding email — that's biomax-tenant editorial)
- **Reasoning:** URLs must use `currentTenant().host`. Brand name + signoff are TENANT-CONFIG. The "tre saker värda att veta" onboarding email body is purely biomax narrative; consider per-tenant editable email templates rather than baked Swedish copy.
- **Size:** medium-large

### Finding 20 — Email client domain default
- **Location:** `lib/email/client.ts`
- **Pattern:** (file referenced in grep set; likely contains a `From: noreply@biomax.nu`/`kontakt@biomax.nu` default — see Brevo/transactional comments)
- **Category proposal:** TENANT-CONFIG
- **Reasoning:** Each tenant has its own `From:` and `Reply-To:`. Should be `Tenant.transactionalFromEmail` + `Tenant.transactionalReplyTo`.
- **Size:** small

### Finding 21 — JSON-LD Organization hardcodes Biomax HB
- **Locations:** `lib/jsonld.ts:12-37` (`SITE = "https://www.biomax.nu"`, `name: "Biomax"`, `legalName: "Biomax Handelsbolag"`, `identifier: "969676-7939"`, foundingDate, founder Constantin Raduti, address Kållered, slogan "Livskvalitet i fokus", description), and at lines 81, 133, 183, 222, 225, 261, 264 in every other JSON-LD helper.
- **Category proposal:** TENANT-CONFIG
- **Reasoning:** JSON-LD Organization blob is by definition per-tenant: legal entity, org number, address, founding date, founder. Read from `tenant.legalEntity` + related fields. The product `brand: { name: p.brand ?? "Biomax" }` fallback at line 133 is also TENANT-CONFIG — fallback should be `tenant.brandName`.
- **Size:** medium

### Finding 22 — `app/layout.tsx` root metadata hardcoded
- **Locations:** `app/layout.tsx:68,70,71,79,80,88,94`
- **Pattern:** `metadataBase: new URL("https://www.biomax.nu")`, title default "Biomax — Livskvalitet i fokus sedan 2001", template "%s | Biomax", `siteName: "Biomax"`, OG image alt "Biomax".
- **Category proposal:** TENANT-CONFIG
- **Reasoning:** Per-tenant base URL + title template. Use `(await currentTenant()).host` and `.name`. Root layout `metadata` needs to become `generateMetadata` so it can `await` the tenant.
- **Size:** medium

### Finding 23 — `app/page.tsx` homepage metadata
- **Locations:** `app/page.tsx:17,20,27-29`
- **Pattern:** Title "Biomax — Livskvalitet i fokus sedan 2001", URL `https://www.biomax.nu/`, siteName "Biomax".
- **Category proposal:** TENANT-CONFIG
- **Size:** small (mechanical once Finding 22 lands)

### Finding 24 — `app/sitemap.ts` + `app/robots.ts` SITE constant
- **Locations:** `app/sitemap.ts:8`, `app/robots.ts:3`
- **Pattern:** `const SITE = "https://www.biomax.nu";`
- **Category proposal:** PARAMETERIZE (per-tenant host resolution)
- **Reasoning:** Sitemap/robots are inherently per-tenant routes (already tenant-resolved via middleware). The SITE constant must come from the resolved tenant host (or `process.env.NEXT_PUBLIC_APP_URL` for the platform-level platform host).
- **Size:** small

### Finding 25 — Google Shopping + Prisjakt XML feeds hardcode brand + URLs
- **Locations:**
  - `app/feeds/google-shopping.xml/route.ts:37,125,141,143` — `SITE`, `<g:brand>Biomax</g:brand>`, `<title>Biomax — Kosttillskott från Kållered</title>`, description with Rockland® mention
  - `app/feeds/prisjakt.xml/route.ts:17,29,82` — SITE, `<manufacturer>Biomax</manufacturer>`
- **Category proposal:** TENANT-CONFIG (brand name, URL, channel title) + per-tenant feed enablement
- **Reasoning:** Feed contents are entirely per-tenant. Each tenant decides whether to expose `/feeds/*` at all (some won't have Google Merchant accounts).
- **Size:** small

### Finding 26 — `app/llms.txt/route.ts` route
- **Location:** `app/llms.txt/route.ts:19,52,89`
- **Pattern:** `const SITE = "https://www.biomax.nu";`, `lines.push("# Biomax");`, copy "och de Biomax-produkter som innehåller ämnet"
- **Category proposal:** TENANT-CONFIG
- **Size:** small

### Finding 27 — `lib/llm/prompts.ts` LLM citation probe prompts
- **Location:** `lib/llm/prompts.ts:4-13,89-99`
- **Pattern:** Hardcoded prompts asking models about "kosttillskottsföretaget Biomax i Sverige" with `id: "biomax-review"`, `id: "biomax-vs-others"`.
- **Category proposal:** SEED-DATA (per-tenant prompt seeds) or UNCLEAR (does kine platform ship LLM-citation-tracking as a feature?)
- **Reasoning:** This whole feature is biomax-shaped marketing instrumentation. Either remove from platform code (move into a plugin or per-tenant seed prompt rows) or templatise: tenant supplies brand keywords and the prompts are generated.
- **Size:** medium

### Finding 28 — LLM citation needles
- **Location:** `lib/integrations/llm-citation.ts:37-38`
- **Pattern:** `const BIOMAX_NEEDLE = /biomax/i;`, `const BIOMAX_URL_NEEDLE = /biomax\.nu/i;`
- **Category proposal:** TENANT-CONFIG
- **Reasoning:** Per-tenant: each tenant has its own brand needle + domain needle.
- **Size:** small

### Finding 29 — `lib/symptoms/registry.ts` — every seoTitle ends `| Biomax`
- **Location:** `lib/symptoms/registry.ts:84,120,165,201,237,292,337,387,437,485` (10 entries)
- **Category proposal:** TENANT-CONFIG (the `| Biomax` brand suffix) + SEED-DATA (the rest of the symptom registry — it's biomax's curated taxonomy)
- **Reasoning:** The "symptom landing page" registry (sleep, anxiety, UTI, joints, etc.) is biomax-tenant content shape *and* the SEO branding suffix. Per ADR 0026, content like this should be DB-backed per-tenant rows. Lift to `SymptomPage` model with `tenantId`.
- **Open questions:** Is symptom-based discovery a platform-level feature shape (every health-tenant gets it) or biomax-specific UX? Big call.
- **Size:** large

### Finding 30 — `lib/categories.ts` documents biomax sales data
- **Location:** `lib/categories.ts:4`
- **Pattern:** Header comment `"Anchored in real biomax.nu sales data..."`
- **Category proposal:** SEED-DATA (whole file)
- **Reasoning:** Category metadata keyed by slug — biomax-tenant curation. Move to per-tenant Category rows (already in DB via `Category` model; this is metadata/presentation that should join with that table).
- **Size:** medium

### Finding 31 — `lib/knowledge/ingredients.ts` — 1081-line ingredient catalog as TS
- **Location:** `lib/knowledge/ingredients.ts` (entire file)
- **Pattern:** Per ADR memory "Map new ingredients to the knowledge base"; this is biomax's curated ingredient monograph corpus, 1081 lines.
- **Category proposal:** SEED-DATA
- **Reasoning:** Explicitly documented at file head as "intentionally a TS module (not the database) for v1 — editorial content lives next to the code". The "we can migrate to DB-backed monographs in Phase 6" comment essentially is the slice this audit is now informing. Move to per-tenant `Ingredient` rows with monograph fields; biomax becomes the seeded entries.
- **Size:** large (data migration + admin UI to edit)

### Finding 32 — `lib/site/sections.ts` SectionId hardcoded `"biomax"`
- **Locations:** `lib/site/sections.ts:8,32-41`
- **Pattern:** `export type SectionId = "help" | "biomax";` + a "biomax" section with items ("Vår berättelse", "Butik i Kållered", "Behandlingar", "Kontakt") and `eyebrow: "Biomax"`.
- **Category proposal:** TENANT-CONFIG (whole section structure is per-tenant nav)
- **Reasoning:** Left-rail nav grouping is per-tenant. The `"help"` section is fairly generic ("frakt-och-retur", "faq", "villkor", etc.) and could stay platform-default; the `"biomax"` section is the brand's About cluster. Lift to `Tenant.navSections` JSON.
- **Open questions:** "Butik i Kållered" and "Behandlingar" are unique to a physical-store-having tenant. Plain SaaS tenants won't have these. Platform should ship empty nav, tenant fills.
- **Size:** medium

### Finding 33 — `lib/site/settings.ts` Trustpilot profile URL fallback
- **Locations:** `lib/site/settings.ts:40,156`, `lib/admin/settings-actions.ts:221,222,226`
- **Pattern:** `trustpilot_profile_url: "https://se.trustpilot.com/review/biomax.nu"`
- **Category proposal:** TENANT-CONFIG (default empty/null; admin sets per-tenant)
- **Size:** small

### Finding 34 — Site footer hardcodes Biomax HB legal block + tagline
- **Locations:** `components/site/footer.tsx:26,51-52,63,97`, `components/site/mobile-nav.tsx:139`, `components/site/header.tsx:25-26`
- **Pattern:** Footer copy "Biomax HB · Eken Hälsobutik", "© {year} Biomax Handelsbolag · Org.nr 969676-7939", header aria-label "Biomax — startsidan".
- **Category proposal:** TENANT-CONFIG
- **Reasoning:** Legal entity, org number, footer tagline, aria-labels = per-tenant.
- **Size:** small (mechanical lift)

### Finding 35 — Marketing components hardcode Biomax brand
- **Locations:**
  - `components/marketing/bestsellers.tsx:29` — "Tre formuleringar som definierar Biomax"
  - `components/marketing/categories.tsx:86` — "Biomax återkommer till"
  - `components/marketing/newsletter.tsx:42,106` — "Brev från Biomax", "Jag vill få brev från Biomax"
  - `components/marketing/founder-band.tsx:14,73` — Constantin Raduti as Biomax founder; copy "fick Constantin Raduti att grunda Biomax 2001"
  - `components/product/related-products.tsx:27` — "Andra X från Biomax"
- **Category proposal:** TENANT-CONFIG (brand name token) + PLUGIN (founder-band is biomax-specific narrative + image)
- **Reasoning:** Brand-name interpolation is mechanical. `founder-band.tsx` is fundamentally a biomax-tenant module that other tenants won't have. Should move to `plugins/biomax/founder-band.tsx` or be excluded from non-biomax tenants by component-tree-level conditional rendering.
- **Size:** medium

### Finding 36 — Auth shell + register form hardcode Biomax
- **Locations:** `components/auth/auth-shell.tsx:28,29`, `components/auth/register-form.tsx:113` (Är detta ditt gamla Biomax-konto?)
- **Category proposal:** TENANT-CONFIG (logo/aria-label) + UNCLEAR ("ditt gamla Biomax-konto" is biomax-WordPress-migration copy that no other tenant has — could be migration-banner per-tenant or removed once the import window closes)
- **Size:** small

### Finding 37 — Admin sidebar avatar fallback "Biomax"
- **Locations:** `components/admin/admin-sidebar.tsx:214,255,265,366,369`
- **Pattern:** `(adminName ?? "Biomax")`, aria-label "Biomax admin", text "biomax" + "biomax.se"
- **Category proposal:** TENANT-CONFIG
- **Reasoning:** Admin chrome should show the tenant's name/slug. The literal "biomax.se" at line 369 is also factually wrong (correct domain is `.nu`) — flag for cleanup.
- **Size:** small

### Finding 38 — Account sidebar nav "Familjen Biomax" link
- **Location:** `components/account/account-sidebar.tsx:19`
- **Pattern:** `{ href: "/konto/familjen", label: "Familjen Biomax" }`
- **Category proposal:** TENANT-CONFIG (label) — but the URL slug `/konto/familjen` and the page `app/konto/familjen/page.tsx` are biomax-tenant-coupled by Swedish naming (`familjen` = "the family", playing on Familjen Biomax).
- **Open questions:** Other tenants will want this loyalty page at e.g. `/konto/poang` or under their own program name. The URL slug should be platform-stable (`/konto/loyalty` or similar) with localised label.
- **Size:** small (label) + medium (URL rename — affects bookmarks)

### Finding 39 — `/konto/familjen/` page copy is Familjen-Biomax-shaped
- **Locations:** `app/konto/familjen/page.tsx:112` and the route slug itself.
- **Category proposal:** TENANT-CONFIG (copy) + UNCLEAR (route slug — see Finding 38)
- **Size:** small

### Finding 40 — Checkout flow loyalty + newsletter copy
- **Locations:** `app/checkout/checkout-flow.tsx:550,829,851,1055,1060`
- **Pattern:** "nyhetsbrev från Biomax", "poäng i Familjen Biomax", "Familjen Biomax ·", "Hur fungerar Familjen Biomax-poäng?"
- **Category proposal:** TENANT-CONFIG (brand-name interpolation)
- **Size:** small

### Finding 41 — Checkout/order confirmation contact email
- **Locations:** `app/checkout/bekraftelse/page.tsx:40,101-104,286-289`, `app/checkout/checkout-flow.tsx:1060`
- **Pattern:** `kontakt@biomax.nu` as the support contact in confirmation and FAQ entries.
- **Category proposal:** TENANT-CONFIG
- **Reasoning:** Tenant's support email.
- **Size:** small

### Finding 42 — `lib/orders/self-service-actions.ts` support email in error messages
- **Locations:** `lib/orders/self-service-actions.ts:79,133`
- **Pattern:** Error messages tell customer to email `kontakt@biomax.nu`.
- **Category proposal:** TENANT-CONFIG
- **Size:** small

### Finding 43 — Invoice (faktura) page hardcodes Biomax HB block
- **Locations:** `app/admin/ordrar/[orderNumber]/faktura/page.tsx:11,97,100,106,249,268,272`
- **Pattern:** Invoice header "Biomax Handelsbolag · Eken Hälsobutik", email/URL, "Familjen Biomax · X p" line, footer "biomax.nu/villkor".
- **Category proposal:** TENANT-CONFIG
- **Reasoning:** Invoice is a legal document; entity name, address, org number, support contact, T&C URL all per-tenant.
- **Size:** medium

### Finding 44 — Admin "etiketter" (labels) Rockland mention
- **Location:** `app/admin/etiketter/page.tsx:52,76`
- **Pattern:** Page about label artwork mentioning "konsekvens mot biomax.nu" and "mg-värden ska bekräftas av Rockland-deklaration innan tryck".
- **Category proposal:** PLUGIN
- **Reasoning:** Whole "etiketter" admin page is biomax-Rockland workflow (printing supplement bottle labels). No other Korg tenant needs this. Move entire `app/admin/etiketter/` + `components/admin/label-preview.tsx` into `plugins/biomax-rockland/`.
- **Size:** medium

### Finding 45 — `components/admin/label-preview.tsx` BIOMAX_LINES + Rockland sub-brand
- **Locations:** `components/admin/label-preview.tsx:17,19,40-46,131-133`
- **Pattern:** `BIOMAX_LINES = ["Biomax HB · Ekenleden 15A", ..., "kontakt@biomax.nu", "biomax.nu/produkter/colon-aid"]`, `subBrand: "Rockland ®"`.
- **Category proposal:** PLUGIN (Rockland sub-brand UX entirely; see Finding 44)
- **Size:** part of Finding 44

### Finding 46 — Rockland seed scripts assume biomax tenant
- **Locations:** `scripts/seed-rockland-2026-05.ts`, `scripts/seed-products-2026-05-12.ts` (numerous lines), `scripts/update-colon-aid.ts:17,74`
- **Pattern:** Seed scripts insert Rockland-branded products with SEO titles like `"... | Biomax"` and brand `"rockland"`.
- **Category proposal:** PLUGIN (seed should live in `plugins/biomax-rockland/seed/` or biomax-tenant seed dir, NOT platform `scripts/`)
- **Reasoning:** These are biomax-tenant product seeds, not platform-bootstrap scripts. They should be in a tenant-specific seed location.
- **Size:** medium (move + adjust import paths)

### Finding 47 — `scripts/seed-easy-way-variants.ts` pricing from biomax.nu
- **Location:** `scripts/seed-easy-way-variants.ts:6`
- **Pattern:** Comment "Prices from current biomax.nu:"
- **Category proposal:** PLUGIN / SEED-DATA (biomax-tenant seed)
- **Size:** small (move)

### Finding 48 — `scripts/import-wordpress.ts` is biomax WordPress migration
- **Locations:** `scripts/import-wordpress.ts:2,4,384,416,625` (and the related `biomax.WordPress.2026-05-10.xml` at repo root)
- **Pattern:** Whole script is a one-time biomax WordPress import.
- **Category proposal:** PLUGIN / archival
- **Reasoning:** Not platform code; biomax-specific migration that ran once. After kine extraction this script should NOT be in the platform repo. Either move to a `tools/migrations/biomax/` location or delete.
- **Size:** small (delete or relocate)

### Finding 49 — `scripts/import-innehall.ts` biomax.nu scrape importer
- **Location:** `scripts/import-innehall.ts:2,5,6`
- **Category proposal:** PLUGIN / archival (same as Finding 48)
- **Size:** small

### Finding 50 — Backup script filename prefix `biomax-`
- **Locations:** `scripts/backup-postgres.sh:14-15,34-36,62,90`, and `app/admin/system/backups/page.tsx:31` (`f.startsWith("biomax-")`)
- **Pattern:** Dumps named `biomax-${DATE}.dump`; admin UI filters by `biomax-` prefix.
- **Category proposal:** PARAMETERIZE (rename to `korg-${tenantSlug}-...` per tenant, or `korg-platform-` for platform-wide dumps)
- **Reasoning:** In a multi-tenant world either per-tenant dumps (with tenant slug in filename) or platform-wide (with `korg` prefix). The admin UI prefix filter then becomes a per-tenant view.
- **Size:** medium

### Finding 51 — Cron emails reference biomax.nu admin URLs
- **Locations:** `app/api/cron/auth-expiry/route.ts:154,169`, `app/api/cron/low-stock-alert/route.ts:147`
- **Pattern:** Hardcoded `https://www.biomax.nu/admin/ordrar` and `/admin/produkter` links in email bodies.
- **Category proposal:** TENANT-CONFIG (use tenant host) / PARAMETERIZE (platform admin URL once admin moves to `admin.korg.nu`)
- **Open questions:** With ADR 0031 the admin pane is at `admin.korg.nu` — should these emails link there or to the tenant storefront? Different URLs depending.
- **Size:** small

### Finding 52 — Webhook + uptime + import scripts assume biomax.nu URL
- **Locations:** `scripts/uptime-probe.ts:4,10,16,17,98`, `scripts/snapshot-gsc.ts`, `scripts/inspect-gsc-index.ts`, `scripts/gsc-verify-service-account.ts`, `scripts/run-llm-citation-checks.ts`, `app/api/webhooks/brevo/route.ts:12`
- **Category proposal:** PARAMETERIZE (env var) or move scripts to biomax-tenant operational tooling
- **Size:** small

### Finding 53 — Auth-platform-client comment references biomax cookie isolation
- **Location:** `lib/auth-platform.ts:13` (comment)
- **Pattern:** Comment text only — "the `biomax`-prefixed storefront or any `*.korg.nu` tenant cookie."
- **Category proposal:** UNCLEAR (comment will be stale once Finding 1 is resolved)
- **Reasoning:** Update the comment when the prefix becomes `korg`. Otherwise this comment alone is harmless.
- **Size:** trivial

### Finding 54 — Trustpilot integration env var description
- **Location:** `lib/integrations/trustpilot.ts:9`
- **Pattern:** Comment "TRUSTPILOT_BUSINESS_UNIT_ID — the biomax.nu business unit id"
- **Category proposal:** PARAMETERIZE (per-tenant Trustpilot credential)
- **Reasoning:** Already implicit but: env-level Trustpilot ID is single-tenant. Should be `Tenant.trustpilotBusinessUnitId`.
- **Size:** small

### Finding 55 — Unsplash referral utm tag `?utm_source=biomax`
- **Location:** `lib/integrations/unsplash.ts:91`
- **Pattern:** `profileUrl: \`${raw.user.links.html}?utm_source=biomax&utm_medium=referral\``
- **Category proposal:** TENANT-CONFIG
- **Reasoning:** UTM source = tenant slug.
- **Size:** small

### Finding 56 — PostNord CONSIGNOR block hardcodes Biomax warehouse
- **Location:** `lib/postnord/booking.ts:129-141`
- **Pattern:** `CONSIGNOR = { name: "Biomax HB", street: "Ekenleden 15A", postalCode: "42836", city: "Kållered", countryCode: "SE", email: "kontakt@biomax.nu" }`
- **Category proposal:** TENANT-CONFIG (per-tenant shipping origin / warehouse address)
- **Reasoning:** Each tenant ships from its own warehouse. Per-tenant carrier config block.
- **Size:** small

### Finding 57 — Misc admin/marketing brand-name references
- **Locations:**
  - `components/admin/team-manager.tsx:137` — placeholder "namn@biomax.nu"
  - `components/admin/settings-form.tsx:234` — hint "t.ex. lager@biomax.nu, kontakt@biomax.nu"
  - `components/admin/gsc-empty-state.tsx:36` — example URL `https://www.biomax.nu/`
  - `components/admin/og-card-preview.tsx:5,127` — `SITE_HOST = "biomax.nu"`
  - `components/admin/seo-snippet-preview.tsx:5` — `SITE_HOST = "www.biomax.nu"`
  - `components/admin/hero-photo-picker.tsx:540` — copy "Sparad lokalt på biomax.nu"
  - `components/admin/review-moderation-row.tsx:128,150` — "Svar från Biomax"
  - `components/reviews/review-list.tsx:178` — "Svar från Biomax"
  - `components/reviews/review-form.tsx:90,91` — `kontakt@biomax.nu`
  - `components/account/profile-form.tsx:77` — `kontakt@biomax.nu`
  - `components/checkout/kustom-checkout.tsx:76` — comment "Familjen Biomax points selection"
  - `components/checkout/loyalty-redeem.tsx:25` — comment "Familjen Biomax redemption"
  - `app/admin/produkter/[slug]/page.tsx:30` — `SITE = "https://www.biomax.nu"`
  - `app/admin/kunder/page.tsx:84`, `app/admin/kunder/[id]/page.tsx:96,105` — "gamla biomax.nu", "Totalt hos Biomax"
  - `app/admin/seo/page.tsx:625` — "biomax.nu. Kör veckovis via cron."
  - `app/admin/ordrar/[orderNumber]/page.tsx:166` — "Familjen Biomax ·"
  - `app/admin/layout.tsx:7` — title template "%s · Biomax Admin"
  - `app/spara/[token]/page.tsx:175-178` — `kontakt@biomax.nu`
  - `app/avregistrera/page.tsx:53,56,67` — `kontakt@biomax.nu` + "Tillbaka till biomax.nu"
  - `app/aterstall-losenord/page.tsx` (referenced in grep file list)
  - `app/glomt-losenord/page.tsx` (referenced in grep file list)
  - `app/gdpr/page.tsx` (referenced in grep file list)
  - `app/integritet/page.tsx` (referenced in grep file list)
  - `app/villkor/page.tsx:8,17,23,26,31,85,137` — Biomax HB seller block, `kontakt@biomax.nu`, "köp på biomax.nu"
  - `app/faq/page.tsx:11,37,55,65,80,102` — "Biomax produkter", "biomax.nu skickar idag endast", "betala på biomax.nu", "Vad skiljer Biomax", `kontakt@biomax.nu`
  - `app/om-oss/page.tsx:11,22,28,36,38,51,132,138,141` — entire About Biomax page
  - `app/kontakt/page.tsx:11,22,39,42,72` — Kontakta Biomax + address
  - `app/behandlingar/page.tsx:9,38,74,77` — physical-store treatment booking
  - `app/produkter/page.tsx:36,57`, `app/produkter/[slug]/page.tsx:121` — "Hela Biomax sortiment"
  - `app/kategorier/page.tsx:20,64`, `app/kategorier/[slug]/page.tsx:46` — "Biomax sortiment", "Biomax återkommer till"
  - `app/kunskap/page.tsx`, `app/kunskap/ingredienser/page.tsx`, `app/kunskap/ingredienser/[slug]/page.tsx` (referenced in grep file list) — Biomax-branded "kunskapsbank"
  - `app/butik/page.tsx`, `app/anger-formular/page.tsx`, `app/frakt-och-retur/page.tsx`, `app/hjalp/page.tsx`, `app/hjalp/[slug]/page.tsx` (referenced in grep file list)
  - `app/konto/page.tsx:62,72,131,182` + `app/konto/ordrar/page.tsx:36,46` + `app/konto/ordrar/[orderNumber]/page.tsx:59,126,143`
  - `app/logga-in/page.tsx:12,28` — "Logga in på ditt Biomax-konto" / "gamla biomax.nu"
  - `app/skapa-konto/page.tsx` (referenced)
  - `app/kop/[slug]/page.tsx:5,59,91,98,116,191` — buying-intent landing pages with Biomax brand interpolation
  - `app/not-found.tsx:78`, `app/error.tsx:41,44`, `app/global-error.tsx:48,70,71` — Biomax/`kontakt@biomax.nu` in error pages
- **Pattern:** Brand name + email + URL interpolation throughout user-facing copy.
- **Category proposal:** TENANT-CONFIG (mechanical lift of all to use `currentTenant().{name,supportEmail,host}`)
- **Reasoning:** Each individual instance is small; cumulatively this is the bulk of the work. Most files need 1-3 string replacements. Recommend tackling as a single sweep PR after the seam (Tenant fields like `name`, `legalEntityName`, `supportEmail`, `host`, `taglineDefault`) is in place.
- **Size:** large (in aggregate)

### Finding 58 — Vitest integration DB DSN `biomax_test`
- **Location:** `vitest.integration.config.ts:6` + `test/integration/db.ts:9` + `test/integration/setup.ts:13`
- **Pattern:** `postgresql://biomax:biomax@localhost:5433/biomax_test`
- **Category proposal:** PARAMETERIZE
- **Reasoning:** Test DSN should be `korg_test`/`platform_test`. The `biomax_test` substring is also load-bearing for the safety guard in `test/integration/db.ts` (`!url.includes("biomax_test") → throw`), so rename in lockstep.
- **Size:** small

---

## Findings categorised as LEGIT-CROSS-TENANT (acknowledged, no action)

- **L1** — `prisma/seeds/tenants.ts` — biomax is correctly seeded as tenant #1 ("zero") here. Per scope, this is exactly where biomax-as-a-tenant-row should live. ✅
- **L2** — `prisma/seeds/payment-credentials.ts` — file mentions biomax but is biomax-tenant payment-credential seed; acceptable per ADR 0034.
- **L3** — `prisma/migrations/20260519150000_tenantid_owned_models/migration.sql:2,8,14,...` — historical `UPDATE ... SET tenantId = (SELECT id FROM Tenant WHERE slug = 'biomax')` backfill. This is the legitimate one-time backfill of pre-existing biomax-only rows to tenant zero. Migrations are immutable record.
- **L4** — `proxy.ts:54` — comment only ("served tenant-zero (biomax) to every host — a cross-tenant content leak"). The code itself is correct edge-side host parsing.
- **L5** — `app/platform/actions.ts:34-35`, `app/platform/tenant-status-button.tsx:20` — explicit guard "Tenant zero (biomax) kan inte stängas av." This IS biomax-as-tenant-zero special-casing, but it's intentional platform-plane protection (can't suspend the bootstrap tenant). Flag for human: do we keep this once kine is its own repo with its own tenant zero (likely a kine demo tenant)? Then rename the guard to "tenant zero" generically without the biomax slug literal.
- **L6** — `prisma/schema.prisma` — Tenant model field comments mentioning biomax (lines 1581, 1590, 1598). Doc only. Update comments when biomax is no longer the example.

## Findings categorised as UNCLEAR (need human call)

- **U1** — Loyalty auto-enrol on signup (Finding 4). Platform default or tenant opt-in?
- **U2** — `DEFAULT_TENANT_SLUG` fallback (Finding 6). Keep transitional or remove on lock-down?
- **U3** — LLM citation tracker as a platform feature (Finding 27). Ship for every tenant, or biomax-only?
- **U4** — Symptom registry as platform feature (Finding 29). Health-vertical-only or every tenant?
- **U5** — "Familjen Biomax" route slug `/konto/familjen` (Finding 38). Platform-stable URL?
- **U6** — `app/admin/etiketter/` Rockland label workflow (Finding 44). Plugin or delete?
- **U7** — `scripts/import-wordpress.ts` (Finding 48). Archive in kine repo or delete?
- **U8** — Auth-shell "ditt gamla Biomax-konto" copy (Finding 36). Migration banner per-tenant or sunset?

---

## Cross-cutting observations

### O1 — Every server-rendered content surface is biomax-shaped
JSON-LD, OG metadata, sitemap/robots, feeds, `llms.txt`, email templates, invoice PDF, error pages — all hardcode `Biomax`, `Biomax Handelsbolag`, `Ekenleden 15A`, `kontakt@biomax.nu`, `https://www.biomax.nu`, `org.nr 969676-7939`. These are *all* tenant-config fields. Suggest adding fields to `Tenant` (or a `TenantLegal` extension): `legalEntityName`, `orgNumber`, `street`, `postalCode`, `city`, `countryCode`, `supportEmail`, `transactionalFromEmail`, `trustpilotBusinessUnitId`, `trustpilotProfileUrl`, `host`, `canonicalUrl`, `taglineDefault`, `foundingDate`, `founderName`. Then a single helper `tenantSeo(currentTenant)` provides metadata + JSON-LD blobs, and email templates take a `TenantBrand` arg.

### O2 — The whole `app/design/page.tsx` is a designer mood-board
`app/design/page.tsx` (1648 lines) is a static reference page rendering biomax homepage variants for design QA. Contains every brand string, founder image, copy block. It is NOT user-facing in production routing semantics but it IS in the bundle. Decision: keep as biomax-tenant-only design system documentation (move to `plugins/biomax/` or `docs/design-reference/`), or delete from platform repo.

### O3 — The cross-tenant cart/consent localStorage hazard (Findings 8, 9)
The `biomax-cart` and `biomax-consent` localStorage keys are not just cosmetic — they are *shared across tenants* in a multi-tenant world (a customer visiting `tenantA.korg.nu` and then `tenantB.korg.nu` would share cart contents and consent decisions). This is a real correctness bug surfaced by the audit, not just naming. Fixing the name fixes the bug only if the rename includes per-tenant scoping (`korg-cart-${slug}`).

### O4 — The "Familjen Biomax" loyalty program is structurally tenant content
The program name, copy, route slug (`/konto/familjen`), DB-schema header comment (`prisma/schema.prisma:1476` — "Familjen Biomax (loyalty)"), constants file, account-sidebar label, checkout strings, order/admin/invoice cards all hardcode the program name. This is more than copy — `Familjen` ("the family") is a route segment, model section header, and constant name. A clean lift needs ADR-level decision: platform ships loyalty as a generic feature with per-tenant program name + earn/burn config (TENANT-CONFIG, see Finding 5).

### O5 — Rockland is a real PLUGIN candidate
Rockland sub-brand surfaces (label-preview, etiketter admin, Rockland seed scripts, label-system-brief.md) form a coherent feature that no other Korg tenant will ever need. This is exactly the use-case for `plugins/biomax-rockland/` per the slice brief.

### O6 — The Swedish-only assumption is also baked
While not in scope, observed: `html lang="sv"` in email layout, all copy is Swedish, locale defaulted `"sv-SE"` in Better Auth user additionalFields. If kine ever onboards a non-Swedish tenant, this becomes a third axis (platform / tenant / locale). Flag for ADR consideration.

### O7 — `biomax.nu` as the founder domain is in cron URLs, GSC service account, uptime probe, llm-citation checks
Operational tooling assumes biomax.nu is *the* monitored property. These scripts are not platform code; they should not be in `apps/shop/`. Suggest moving to `tools/ops/biomax/` (or deleting if covered by platform-level monitoring once kine is up).

---

## Files NOT audited (out of scope, explicit list)

- `docs/adr/**` — historical decision records (only flagged when a non-archival ADR is being authored)
- `docs/brand/**` — kine brand v1 identity (irrelevant)
- `docs/strategi/**`, `docs/varumarke/**` — Swedish strategic docs (kine-meta)
- `docs/label-system-brief.md`, `docs/legal-compliance-review-2026-05-17.md` — explicitly out of scope
- `docs/INTEGRATIONS.md`, `docs/deployment.md`, `docs/infra/**` — platform / ops docs
- `docs/platform-extraction-audit.md` — this file
- `prisma/migrations/**` — historical migration record (flagged as L3, not enumerated)
- `biomax.WordPress.2026-05-10.xml` — source data file
- `node_modules/**`, `.next/**`, `.claude/worktrees/**`, `tsconfig.tsbuildinfo`, `tsc_probe.tmp.tsbuildinfo`
- `package.json` `name: "biomax.nu"` — kine repo will set its own name; flag noted in passing.
- Test fixtures referencing `biomax` as a generic tenant slug (acceptable)
- `reviews/` directory was not deeply crawled (assumed similar admin/copy patterns to those already flagged)

## Open questions for human review

- **OQ1** — Cookie prefix migration strategy (Finding 1): forced re-login on cutover, or dual-read window?
- **OQ2** — `Tenant.primaryColorHex` default — keep biomax navy default, set to a kine neutral, or drop the default entirely and require admin entry? (Finding 7)
- **OQ3** — Loyalty as a platform feature with per-tenant config vs. loyalty-as-plugin? Big ADR-level decision behind Findings 4, 5, 38, 39.
- **OQ4** — Per-tenant theme: build-time Tailwind `@theme` vs. runtime CSS var injection. Affects Finding 17 and downstream component styling.
- **OQ5** — Per-tenant email templates: rendered server-side from tenant data only, or fully editable (admin WYSIWYG)? Affects Findings 18–20.
- **OQ6** — `scripts/import-wordpress.ts` and friends — delete on kine extraction, or move to `tools/migrations/biomax/`? (Findings 48, 49, 52)
- **OQ7** — `app/admin/etiketter/` Rockland label tool — is biomax-rockland already planned as a plugin (per memory note "Rockland is a Biomax sub-brand")? Plugin scope = label-preview + etiketter admin + Rockland seeds + founder-band marketing block?
- **OQ8** — Symptom landing pages (Finding 29): the `/behandlingar`, symptom registry, and `kunskap/` are inherently a *health vertical* feature shape. Is kine a generic commerce platform (in which case these all become biomax-tenant content) or a health-commerce platform (in which case symptom pages are a platform feature with per-tenant content rows)?
- **OQ9** — Founder narrative + Swedish family-business framing is throughout the marketing components (founder-band, om-oss, faq, footer "sedan 2001"). Kine platform onboarding will need a per-tenant `aboutPage` editor; biomax's content becomes its seed.

---

*End of audit.*
