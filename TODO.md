# Biomax v2 — Pre-Launch TODO

Single canonical list of everything we should ship **before** going live. The
existing biomax.nu is operational and selling, so there's no rush — we use
this window to build the things that compound competitive edge after launch.

**Nothing in this file is post-launch.** If something genuinely belongs after
launch, we either drop it or fold it into a section here.

Last rewritten: 2026-05-13

---

## 1 · Close half-built features (finish what we started)

These are things in the codebase that work in part but aren't wired
end-to-end. Customer-visible polish gaps.

- [x] **Wire homepage to render from `HomepageBlock`.** ([2026-05-13]) `app/page.tsx` now resolves blocks via `getHomepageBlocks()` → `<BlockRenderer>`. Editor changes at `/admin/startsida` move pixels. Data is fetched conditionally per active kind so disabling a block also drops its query.
- [x] **Bundle pricing applied in cart.** ([2026-05-13]) Schema: `OrderItem.bundleId/bundleSlug/bundleName/bundleDiscountPercent` snapshot fields. Cart store v3: `addBundle`/`removeBundle`, bundle-aware line keys, discount-applied subtotal selector, `selectBundleSavings`. UI: `<CartBundleGroup>` in drawer + page, "Paketrabatt" line in summary. Server: `placeOrder` re-fetches every referenced Bundle, validates membership, recomputes discount from live `discountPercent`, persists snapshot on each OrderItem.
- [x] **Bundles shown on individual product pages.** ([2026-05-13]) `<BundlesForProduct>` renders between content and related-products, hidden when no bundles include this product.
- [x] **Brevo bounce + complaint webhook** (`/api/webhooks/brevo`). ([2026-05-13]) Token-auth'd receiver upserts `NewsletterSubscriber.unsubscribedAt` on hard_bounce/blocked/spam/unsubscribed/invalid_email. Idempotent. `BREVO_WEBHOOK_SECRET` in `.env.example`.
- [x] **Klarna webhook idempotency.** ([2026-05-13]) Audited and hardened: short-circuit re-ack when order is already past PENDING; one-way transition guard (`where: { status: "PENDING" }`) so delayed pushes can't pull FULFILLED back to PAID.
- [x] **Soft-delete review-form for already-purchased products.** ([2026-05-13]) New `getMyReviewForProduct` helper; form renders a soft "Tack — vi har din recension" confirmation for PENDING/APPROVED instead of letting the user submit and hit the server-side "redan lämnat" error.
- [x] **Stock-notify on order placement.** ([2026-05-13]) Audited: existing path is correct (admin save hook fires fanout when stock comes back from 0). Real gap was variants — fanout now considers variant stock, and `setProductVariants` calls fanout on 0 → positive variant transitions.

---

## 2 · Trust & social proof (Swedish ecom is trust-driven)

Swedish customers convert when they trust the seller. These are the levers
specific to that.

- [ ] **Live Trustpilot integration.** Wire `<TrustpilotBar>` to Trustpilot's free public API. Pull real review count + average score, render in footer + top-bar. ~2 hrs once Trustpilot business account is registered.
- [ ] **Sustainability statement / `/hallbarhet` page.** One page covering packaging materials, sourcing principles, certifications. Even one honest paragraph beats nothing. Cross-link from `/om-oss` and footer.
- [ ] **Sociala kanaler in footer.** Instagram + Facebook + (maybe) TikTok icons + last 4 Instagram posts via Instagram Basic Display API or static embed. If accounts don't exist yet, create them first.
- [ ] **Press / media kit at `/press`.** Downloadable founder photo, brand logo (SVG + PNG), brand colours card, founder bio, brand-story PDF. Required before any PR pitch — journalists need it in one click.
- [ ] **Customer testimonial wall on `/om-oss`.** Curate 4–6 longer-form quotes from real customers (NOT product reviews — story-level). Adds personal credibility on top of star ratings.
- [ ] **"Som setts i" press-mention strip** — once we have any press coverage, a footer-strip with logos of mentioning publications. Build the component now (empty until real mentions exist).
- [ ] **Family story video.** Short (60–90s) video on `/om-oss` of Constantin Raduti or another family member talking about the heritage. Needs a videographer; flag now so it can be commissioned in parallel.
- [ ] **Founder bio expanded** on `/om-oss`. Currently the founder text leans on framing rules; expand with verifiable specifics (years in business, Kållered roots, what changed when the next generation took over). Per memory: no fabricated credentials.
- [ ] **Trust badges in checkout.** Klarna, PostNord, Trygg E-handel, "Familjeägd sedan 2001" — small grid above the submit button. Documented to lift conversion in SE specifically.

---

## 3 · Conversion (every interaction is a chance)

- [ ] **Static-content shipping threshold** — `/villkor`, `/faq`, `/frakt-och-retur`, `/kop/[slug]` and `app/design/page.tsx` still hardcode 499 kr in body copy. Migrate to `getShippingRules()` if you expect the threshold to change; otherwise leave as-is (these are legal/info pages that rarely shift).
- [ ] **Subscription / prenumeration option.** "Få Balans varje månad, 15% rabatt, ångra när du vill." Schema: `Subscription` + `SubscriptionLine` models, recurring order generation cron. Stripe-backed or Klarna-recurring depending on what's supported. *Large item — see notes.*
- [ ] **Bulk-purchase discount tier.** "Köp 3, spara 10 %" automatically applied. Schema lives next to `Bundle` or as a `QuantityDiscount` model.
- [ ] **Sticky add-to-cart bar on mobile** for product pages. Appears once you scroll past the hero. Massive mobile-conversion lift.
- [ ] **Recently viewed products.** Client-side localStorage list, surfaces a strip on the homepage + cart page.
- [ ] **Wishlist UI** — `WishlistProduct` model exists, no UI. "Lägg till i favoriter" button on product cards + a `/konto/favoriter` page. Drives return visits and email-capture.
- [ ] **Quick-view modal from product grid.** Click "Snabbtitt" → modal with image + price + key info + add-to-cart without leaving the listing. CTR lift for browsing-heavy users.
- [ ] **Cross-sell strip in cart** — "Andra kunder lade också till…" using `ProductCrossSell`. Increases AOV.
- [ ] **Free-shipping threshold tweak A/B-able from settings.** Already in SiteSetting; just verify it's wired into the cart progress bar.
- [ ] **Gift-card / presentkort.** New `GiftCard` model with code, balance, expiry. Surface on `/presentkort`. Especially relevant ahead of jul.
- [ ] **"Första gången-garanti".** "Inte nöjd? 30 dagars öppet köp, fri retur, säg bara till." Prominent on checkout + product pages. Many customers won't try without it.
- [ ] **Klarna installment widget — switch from stub to live** once `KLARNA_CLIENT_ID` is set. Code at [components/product/klarna-installment.tsx](components/product/klarna-installment.tsx) is ready.

---

## 4 · SEO + content depth (compounds for months)

- [ ] **Long-form ingredient monographs.** Top 10 ingredients (Q10, alfa-liponsyra, NAC, magnesium, beta-glucan, djävulsklo, bjorkglukos, slemalm, lakritsrot, probiotika) expanded to 1500–2000 words each with PubMed citations. Phase 6 work.
- [ ] **Blog with monthly cadence.** Editorial post per month tied to the seasonal brand pillar (mars: ljuset, november: D-vitamin, etc.). 12-post content calendar planned now, first 3 written before launch.
- [ ] **Comparison articles.** "Skillnaden mellan Q10 och CoQ10", "Vilken probiotika passar mig?", "Magnesium-formerna — vad gör skillnad?". Long-tail SEO + LLM citation magnets.
- [ ] **Glossary / ordlista at `/ordlista`.** A–Ö of supplement/medical terms with short Swedish-first definitions and links to relevant monographs. Compounds internal-linking depth.
- [ ] **Symptom encyclopedia expansion.** Current 10 `/hjalp/[slug]` pages cover the bestseller categories. Add: hud, hår, kvinnors hälsa (PMS/menopaus), kondition, vätskebalans, allergier, energi-i-träning.
- [ ] **Internal-linking density audit.** Each monograph should link to: relevant `/hjalp/*`, relevant `/kop/*`, all products containing the ingredient. Each symptom page should link back to its ingredients. Build a graph check.
- [ ] **Schema markup completeness.** Audit every page for `Organization` / `LocalBusiness` / `Product` / `Review` / `AggregateRating` / `FAQPage` / `BreadcrumbList` / `WebSite` (with `SearchAction`) / `DefinedTerm` (for ingredients). Most are in; verify nothing missing.
- [ ] **Image alt text audit.** Every product image, hero image, ingredient illustration. Helps SEO + accessibility + LLM citation.
- [ ] **Open Graph + Twitter Card per page type.** Custom OG images for product, symptom, knowledge, /kop pages (not just the site default).
- [ ] **Hreflang + canonical audit.** sv-SE only per memory, but verify canonicals are correct on paginated and sort-variant pages.
- [ ] **`/sok` site search.** Currently no real search. Use Postgres full-text or Algolia/Typesense — search across products, monographs, blog, FAQ. Header search input goes live.
- [ ] **FAQ depth.** Audit `/faq` against real customer support emails — every recurring question should be there.

---

## 5 · AI search / LLM citation (emerging channel)

- [ ] **llms.txt completeness check.** Already exists; verify product/symptom/monograph coverage is current after this build cycle.
- [ ] **Citation-ready answer blocks** — for each `/hjalp/*` and monograph, ensure there's a 1–2 sentence "TL;DR" that ChatGPT/Claude/Perplexity can lift verbatim. Format consistency = more citations.
- [ ] **LLM citation tracker running with real key.** Code is in; needs `LLM_API_KEY`. Then the cron starts logging "did Biomax appear in answer for X query" trends.
- [ ] **Connector listings / robots.txt for new crawlers.** GPTBot, ClaudeBot, PerplexityBot — explicit allow rules. Confirm none accidentally blocked.

---

## 6 · Personalisation

- [ ] **"Hjälp mig välja" results persisted as profile preferences** for logged-in users. Drives second-visit recommendations and the welcome series's relevance.
- [ ] **Recommended products on `/konto`** — based on past orders. Replenishment is one cron; visible "Vi tror att du också gillar X" is its visible cousin.
- [ ] **Personalised homepage block** when user is logged in. Override the hero with "Välkommen tillbaka, X — här är något nytt sedan ditt senaste besök."

---

## 7 · Customer service & post-purchase

- [ ] **Order tracking page `/spara/[ref]`.** PostNord Phase C scaffolding. Public, no auth required (token-protected via order number + email).
- [ ] **Self-service order management.** "Ändra leveransadress innan paketet skickas", "Ångra köp", "Begär retur" — buttons on `/konto/ordrar/[orderNumber]`.
- [ ] **Returns / RMA workflow.** New `Return` model (`orderId`, `productIds[]`, `reason`, `status`, `refundAmount`, `refundedAt`). Admin moderation at `/admin/returer`. Customer self-service initiation in `/konto`.
- [ ] **Refund via Klarna admin button.** "Återbetala order" in `/admin/ordrar/[orderNumber]` calling Klarna's refund API. Avoids the round-trip to Klarna's portal.
- [ ] **SMS order confirmation (46elks).** Same mode-boundary pattern as Brevo. Swedish customers expect it.
- [ ] **Live chat / contact widget.** Crisp or Tawk.to embed, or build minimal own widget. Even a "kontakta oss"-FAB with email fallback lifts conversion.
- [ ] **Customer-service inbox / ticketing.** Helpscout or Freshdesk if volume warrants; otherwise structured email rules in Brevo. Per-customer thread history.

---

## 8 · Operational systems (the family business actually running this)

- [ ] **Fortnox accounting export.** SIE-format or Fortnox CSV at `/api/exports/fortnox?from=X&to=Y`. Single biggest day-2 pain saver.
- [ ] **VAT/moms reporting helper.** Pull sales-by-VAT-rate CSV for the bookkeeper's monthly/quarterly VAT return.
- [ ] **Inventory low-stock alerts.** Daily cron checks every product against its `lowStockThreshold` (or site default). If below, email the warehouse contact. Today: nobody knows until orders fail.
- [ ] **Purchase-order tracking.** Light `PurchaseOrder` model — supplier, products, qty, ETA, status. Even a basic "incoming stock" view helps.
- [ ] **Supplier price + COGS.** Add `costPriceSek` to Product so we know margin per item. Compounds for any future pricing analysis.
- [ ] **Multi-channel inventory sync.** Eken Hälsobutik has its own POS — when it sells a Balans in-store, does our online stock decrement? Decision: full sync, manual reconciliation, or "treat as separate inventories"? Document the choice.
- [ ] **Order export for warehouse / packing.** A `/admin/packlista` page showing today's orders in packing-friendly format (one row per item, with SKU + product image thumbnail + qty). Printable.

---

## 9 · Compliance (the legal floor)

- [ ] **GDPR data export workflow.** `/admin/kunder/[id]` button "Exportera all data" → ZIP with order history, addresses, reviews, newsletter consent log. Required by Article 15, 30 days.
- [ ] **GDPR data deletion.** "Anonymisera kund" button — null PII on orders (can't delete order rows), delete subscriber row, delete reviews-by-user. Logs the action. Required by Article 17.
- [ ] **Cookie consent banner.** Plausible is cookieless so we *technically* don't need one today. But the moment we add Meta Pixel / Google Ads, we do. Build now, suppress when only Plausible is loaded.
- [ ] **Allergen declarations audit.** EU 1169/2011 Annex II — declared allergens (gluten, soja, mjölk, ägg, jordnötter, etc.) must be bold/highlighted in the public ingredient list. Add `allergens String[]` to Product, render bold.
- [ ] **Livsmedelsverket notification check** for new SKUs. Existing products are presumably notified; NAC and Super Probiotika (seeded recently) — confirm registration. Anything new before launch must be notified per LIVSFS 2003:9.
- [ ] **Trygg E-handel application submitted.** 17/18 items compliant per memory. Lawyer signoff on `/villkor` + `/anger-formular` is the last gate. Pick a lawyer.
- [ ] **Konsumentverket alignment audit.** Review `/villkor`, `/anger-formular`, `/integritet`, `/gdpr` once more against current Konsumentverket guidance.

---

## 10 · Security & resilience

- [ ] **Admin 2FA (TOTP).** Better Auth supports it. Single biggest security move you can make in 30 minutes.
- [ ] **CSP + security headers.** `Content-Security-Policy`, `X-Frame-Options`, `Permissions-Policy`, `Strict-Transport-Security`, `Referrer-Policy`. Configure in `next.config.ts` or middleware. Required for Trygg E-handel.
- [ ] **Rate limiting on public APIs.** Newsletter signup, stock-notify, review submission, search — Upstash Redis-backed token bucket or similar.
- [ ] **Disaster recovery rehearsal.** Restore from a 7-day-old DB snapshot into a staging environment. Verify the site boots and orders display correctly. Document the runbook.
- [ ] **Idempotency keys on every webhook.** Klarna, PostNord (Phase B), Brevo — every webhook receiver must handle duplicate deliveries.
- [ ] **Secrets rotation policy.** Document quarterly rotation of `KLARNA_PASSWORD`, `BREVO_API_KEY`, `POSTNORD_API_KEY`, `CRON_SECRET`, GSC service account.
- [ ] **Audit log for admin actions.** `AdminAuditEntry` model (`userId`, `action`, `entityType`, `entityId`, `diff`, `at`). Every product update, refund, customer deletion logged.
- [ ] **Sentry source-map upload verified.** Stack traces in Sentry should resolve to source lines, not minified bundles.

---

## 11 · Growth channels (free or low-cost acquisition)

- [ ] **Google Merchant Center setup** ([feed already shipped](app/feeds/google-shopping.xml/route.ts)). One-time human steps:
  1. Register at merchants.google.com using the same Google account that manages the GBP.
  2. Verify + claim biomax.nu (TXT record or HTML tag).
  3. Products → Feeds → "Scheduled fetch" pointing at `https://www.biomax.nu/feeds/google-shopping.xml`. Daily cadence.
  4. Settings → Linked accounts → link the GBP for Eken Hälsobutik.
  5. Result: all 20 published products auto-flow into the GBP "Products" section + appear in free Google Shopping listings.
- [ ] **Prisjakt merchant application.** [Feed shipped](app/feeds/prisjakt.xml/route.ts). Apply at https://www.prisjakt.nu/info/become-a-merchant, point them at `https://www.biomax.nu/feeds/prisjakt.xml`.
- [ ] **Meta product catalog feed.** XML for Facebook/Instagram dynamic-ad retargeting. Same Product data, different wrapper. ~30 min to build.
- [ ] **GBP Reviews API puller** — fetch GBP review count + average rating via the Google My Business API and surface alongside Trustpilot in the trust strip. Requires OAuth with the GBP-owner Google account.
- [ ] **GBP Posts auto-publisher** — push weekly updates (new product, seasonal tip, sale) via the Business Profile Performance API. Same OAuth. GBP Posts have a 7-day visibility window, so manual cadence is also fine — automate when volume warrants.
- [ ] **GBP profile polish** (manual one-time in the GBP UI):
  - Add 10–15 photos: storefront, interior, founder, packing process, product close-ups
  - Fill the Description (750-char max) with the family-business story
  - Add the full service list (konsultation, håranalys, laserbehandling)
  - Enable Messages so customers can chat from the profile
  - Add `kontakt@biomax.nu` as the contact email
- [ ] **Refer-a-friend system.** "Tipsa en vän, ni får båda 10% rabatt." Plugs into the existing Coupon model + a `Referral` model. Friction-light growth lever.
- [ ] **Affiliate program for hälsobloggare / naprapater / yogalärare.** `Affiliate` model with referral code + 10% commission tracking. Promotes word-of-mouth in the natural network.
- [ ] **Influencer-partnership tracking.** UTM-tagged short links from `/r/[code]`. Conversion attribution baked in.

---

## 12 · Analytics & observability

- [ ] **Sentry connected** with prod DSN.
- [ ] **Plausible domain registered** + snippet env var.
- [ ] **GSC verified** + service account JSON in env.
- [ ] **LLM citation tracker** running with `LLM_API_KEY`.
- [ ] **Web Vitals dashboard** reviewed; budgets enforced via Lighthouse CI.
- [ ] **Custom event tracking** for cart-add, checkout-step-N, search, quiz-completion, bundle-click. Wire to Plausible custom events.
- [ ] **Funnel analysis dashboard at `/admin/marketing`.** Per-flow stats: welcome-series open rates, abandoned-cart recovery rate, replenishment click-through. Built from our own DB, not Brevo's UI.
- [ ] **Axe-core accessibility audit** in CI. WCAG AA pass.
- [ ] **Lighthouse CI** with performance + accessibility + SEO + best-practices budgets.

---

## 13 · PostNord completion

- [ ] **Phase B — shipment booking + label PDF.** Code-side: add `servicePointId`/`trackingNumber`/`labelPdfUrl` to Order; wire booking call into order-confirmation server action; admin "Skriv ut fraktsedel" button. Blocked on `kundnummer` + `betalarnummer`. Build the code in advance.
- [ ] **Phase C — tracking page + Brevo template update.** Public `/spara/[ref]` page calling PostNord Tracking API. Brevo confirmation email gets the tracking link.
- [ ] **Phase C — webhook listener.** PostNord pushes delivery events; map to Order status changes.
- [ ] **Service-point picker UX polish.** Currently functional but spare; add map preview, expandable hours, "alla dagar" / "idag" toggle.

---

## 14 · Brand polish

- [ ] **Real product photography.** Seasonal brand pillar (per memory) calls for it. 4–6 week lead time. Decide: commission a custom shoot vs license from a Swedish stock library.
- [ ] **Label artwork from the brief.** [docs/label-system-brief.md](docs/label-system-brief.md) is designer-ready. Commission a designer. 8 SKU mocks needed.
- [ ] **Brand voice guide.** Codify the editorial-but-warm, traditional-use-not-medical voice into a short reference designers and future copywriters can read. Lock in the "no Swenglish" rule from [feedback memory](.claude/projects/-Users-adrian-raduti-biomax-nu/memory/feedback_swenglish_self_review.md).
- [ ] **Final om-oss / kontakt / behandlingar copy review.** One full editorial pass with the Swenglish lens.
- [ ] **404 + 500 pages branded.** Currently fall back to Next defaults. Custom branded pages with helpful navigation.
- [ ] **Loading skeletons.** Replace plain spinners with skeleton placeholders matching the actual layout. Perception of speed.

---

## 15 · Credentials & external accounts you need to provide

(From the previous TODO.md; nothing has changed.)

- [ ] **Klarna production credentials** — `KLARNA_USERNAME`, `KLARNA_PASSWORD`, `KLARNA_BASE_URL`
- [ ] **Klarna client ID** — `KLARNA_CLIENT_ID` for the live on-site messaging script (different from API creds)
- [ ] **PostNord developer API key** — `POSTNORD_API_KEY`
- [ ] **PostNord booking enablement** — `POSTNORD_CUSTOMER_NUMBER`, `POSTNORD_PAYER_NUMBER`, endpoint activation
- [ ] **PostNord webhook secret** — `POSTNORD_WEBHOOK_SECRET` for Phase C
- [ ] **Brevo API key + verified sender domain** — `BREVO_API_KEY`, SPF/DKIM on biomax.nu
- [ ] **Brevo webhook secret** — for bounce/complaint receiver
- [ ] **46elks API key** — for SMS order confirmation
- [ ] **Sentry DSN** — `SENTRY_DSN`
- [ ] **GSC service account JSON** — `GSC_SERVICE_ACCOUNT_KEY`
- [ ] **LLM API key** — `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`
- [ ] **Plausible domain registration**
- [ ] **Trustpilot business account** — for the live review-API integration
- [ ] **Fortnox API key** — for the accounting export
- [ ] **Production `DATABASE_URL`** — managed Postgres
- [ ] **`CRON_SECRET`** — random string for the four cron routes

---

## 16 · Pre-launch checklist (Phase 9)

Sequencing the day-of cutover.

- [ ] **Pick a target launch date.** Everything else dates back from this.
- [ ] **Domain & DNS** — point biomax.nu at the production deployment.
- [ ] **Provision production Postgres**, run `npx prisma migrate deploy`.
- [ ] **Final WordPress export** the day of cutover. Run `scripts/import-wordpress.ts` against it.
- [ ] **Populate `Redirect` table** with legacy WP permalinks → new slugs. Import script handles most; spot-check the top 20 traffic sources.
- [ ] **Flip env vars to production** for all the integrations.
- [ ] **Robots / sitemap** verified against the live domain.
- [ ] **Backups verified.** PITR enabled if available.
- [ ] **Uptime probe target updated** to the prod URLs.
- [ ] **Trygg E-handel application submitted.**
- [ ] **End-to-end smoke test in production** from a fresh device with cleared cookies. Cart → checkout → real Klarna payment → confirmation → tracking link arrives by email → review-request email arrives 14 days later (test via cron manual trigger).

---

## 17 · Codebase health — recurring practice

Goal: stay sharp. Don't become WordPress (heavy, full of workarounds, untouchable). The fixes are mechanical; the discipline is to actually run the audit on a cadence rather than waiting for the codebase to get bad.

### Run an audit pair after every meaningful feature

When a non-trivial feature lands (variants, bundles, marketing automation, a new admin surface, an integration), spawn two agents in parallel before declaring done:

- **Performance**: DB queries (N+1, over-fetching, missing indexes), caching/revalidation, RSC vs client boundary, image sizes, bundle bloat, cron fan-out.
- **Code health**: workarounds (TODO/FIXME/`as any`/`@ts-ignore`), duplication, dead code, leaky abstractions (Decimal → client, server modules in client bundles, mode-boundary leaks), oversized files, type-safety gaps at trust boundaries, schema smells.

Capture the surviving findings as TODO items here, in the section that fits. The audit is cheap; the cost of skipping it is the codebase you spend a year apologising for.

Audit log:

- 2026-05-13 — first pair audit after variants shipped. Outcomes:
  - **Fixed (urgent batch)**: Brevo key scrubbed, shipping calculator unified (sync version removed — admin-edited SiteSettings now actually apply at checkout), cart-snapshot trust boundary hardened (server-side price recompute, qty/line caps, auth-free callers can no longer inject items), PDP back on ISR with tag-based invalidation (`lib/cache/tags.ts` is now the single namespace), `revalidatePath("/")` removed from product/image/variant saves (was busting the homepage on every PDP edit), explicit `select` on grid queries (`app/produkter/page.tsx`, `app/kategorier/[slug]/page.tsx`), `findProductsForIngredient` memoised via React `cache()` + `unstable_cache` (40× DB hits per sitemap regen → 1), TipTap rich-text editor dynamic-imported (~150KB off admin first load), `gsc-history.snapshotDay` now `deleteMany` + `createMany` instead of per-row upsert.
  - **Fixed (follow-up batch)**: admin PDP route is now properly dynamic (route-level `revalidate = 1800` removed; the heavy `getQueriesForPage` is cached internally via `unstable_cache`). PDP hero image `sizes` tightened (was fetching ~2× the bytes needed on mobile). `stripHtml` deduplicated 4 → 1 (canonical in `lib/sanitize.ts`). `slugify` deduplicated 3 → 1 Swedish-aware util in `lib/text/slug.ts`. Cron auth duplicated 4× → single `cronAuthorized()` in `lib/api/cron-auth.ts`. `.env.example` created (every `process.env.*` the codebase reads is documented). `/design` page now admin-only via `requireAdmin()` (1700-LOC playground no longer in the public bundle). `Order.taxRateBp` schema default dropped — callers must supply the rate explicitly (WP import passes 2500 bp = historical 25 %; live checkout passes `CURRENT_VAT_BP`). `<CartDrawer />` lazy-loaded via `next/dynamic({ ssr: false })` so legal/info pages no longer ship the Zustand persist middleware. Schema migration `20260513082742_post_audit_cleanup`: dropped legacy `NewsletterSubscriber.unsubscribed` Boolean (with backfill into `unsubscribedAt`); added `Address.@@index([userId])`; added `Product.seoHealthLevel` enum column + `ProductIngredient` join model. New `lib/admin/post-save-sync.ts` recomputes both surfaces on every product save; admin product list reads from the persisted column instead of pulling `longDescription`/`ingredientList` JSON per row; `findProductsForIngredient` now queries the join (O(1)) instead of scanning the full product table. Backfilled all 20 products (44 ingredient links resolved, 11 COMPLETE + 9 PARTIAL).

### WordPress-smell watchlist (act before any of these grow another 50%)

Each of these is the seed of the kind of debt that turned the legacy site into a hairball. They get tracked here permanently — every audit revisits them.

1. **Two sources of truth for taxonomy.** `lib/categories.ts` hardcodes 8 categories with photo + copy alongside the `Category` DB table. The DB has unread `description` / `imageUrl` columns. Pick one before the next category lands.
2. **No `zod` (or equivalent) at trust boundaries.** Every `"use server"` action and API route hand-rolls validation. With ~40 server actions, this is the single highest-leverage debt-reducer left. Adopt zod incrementally — start with cart/order/checkout actions where the cost of malformed input is highest.
3. **Loose `Json?` columns growing without type-guards.** `seoFaqJson`, `dosing`, `ingredientList`, `HomepageBlock.payload`, `CartSnapshot.items`, `SiteSetting.value`. Only `dosing` and `ingredientList` have type-guards today. Add a `lib/json/*.ts` per column with a zod schema and a matching write guard — anything that doesn't get one is a future `wp_options` waiting to bite.
4. **Stub-mode parallel implementations.** Klarna / Postnord / Brevo / GSC each maintain two code paths (real + stub) kept in sync by hand. The audit caught one already drifting (shipping calculator). One more integration without a unifying pattern and the divergence becomes intractable.
5. **Hardcoded label / tag maps living next to UI.** `TAG_BY_SLUG` (product-card), `PHASE_LABEL` (dose), `BY_NAME` (categories), `ALERT_LABEL`, `LLM_PROMPTS`. Each is 5–10 lines today; collectively they're content-in-code that editors can't touch. Move to DB or `lib/site/settings.ts` on the next reason to edit one.

### Outstanding from prior audits

Security (also tracked in section 10):
- [ ] **Rotate the previously-committed Brevo API key in the Brevo dashboard** (it was only ever in untracked `.env*` files, not git, but rotate anyway). Then paste the new key into `.env.local` only.

(Everything else from the 2026-05-13 audit landed — see the audit log above.)

---

## 18 · Things I deliberately did NOT include

For my own future reference — these came up and I decided they don't belong pre-launch:

- **A/B testing infrastructure.** Premature at v1 launch volume.
- **Multi-region / multi-currency.** Sweden-only per memory.
- **POS hardware in Eken Hälsobutik.** Out of scope.
- **Customer-support volume scaling (Helpscout etc.).** Pick the tool now if you want, but operationally you can wait until 50+ tickets/month.
- **TikTok Shop integration.** Too early for the demo.
- **iOS / Android app.** PWA-ready code base; app is a year-2 conversation.

If any of these flip from "later" to "before launch", move them into the relevant section above.

---

## How to use this doc

- Tick the boxes as you go.
- Sections are roughly ordered by impact-for-effort, but pick freely within a section.
- I (Claude) work top-down within whichever section you point me at.
- New items go in the relevant section, not at the bottom — keep the structure.
- Items get *removed* (not crossed out) once shipped, so the doc stays scannable.
