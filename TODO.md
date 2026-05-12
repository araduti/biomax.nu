# Biomax v2 — Outstanding Items

Curated list of things that still need your input, decision, or external action before the new site can fully replace biomax.nu. Code-side follow-ups are listed at the bottom so you can see what I'd build once you green-light them.

Last updated: 2026-05-11

---

## 1 · Credentials & external accounts

These unblock real integrations. Until they're set, the relevant module runs against a stub (the site works, but the integration is dev-only). Each item shows the env var(s) that turn the stub off.

- [ ] **Klarna production credentials** — `KLARNA_USERNAME`, `KLARNA_PASSWORD`, `KLARNA_BASE_URL` (https://api.klarna.com)
- [ ] **PostNord developer API key** — `POSTNORD_API_KEY` from developer.postnord.com. Unlocks live Service Points lookup in checkout. Same-day issuance.
- [ ] **PostNord business booking enablement** — `POSTNORD_CUSTOMER_NUMBER`, `POSTNORD_PAYER_NUMBER`, endpoint activation. Requires a call/email to Företagskundtjänst (010-436 03 00). 1–2 week lead time. Unblocks Phase B (auto-label + tracking).
- [ ] **Brevo (Sendinblue) API key + verified sender domain** — `BREVO_API_KEY`. Required for order-confirmation emails to actually leave the building. Domain verification (SPF/DKIM on biomax.nu) takes 24–48h with the registrar.
- [ ] **Sentry DSN** — `SENTRY_DSN`. Production error monitoring. Free tier is fine for our volume.
- [ ] **Google Search Console service account JSON** — `GSC_SERVICE_ACCOUNT_KEY` (or path). Needed for the SEO analytics blocks on product/admin pages to show real data instead of "GSC ej konfigurerad."
- [ ] **LLM citation tracker keys** (optional but cheap) — `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`. Without these the LLM citation table sits empty. Any OpenAI-compatible endpoint works (Anthropic, OpenAI, local Ollama).
- [ ] **Plausible domain registration** — biomax.nu added to your Plausible account, snippet env var set. Already wired in code.
- [ ] **Production `DATABASE_URL`** — managed Postgres (Neon, Supabase, RDS — your call).

---

## 2 · Content & assets

- [ ] **Seasonal product photography** — the hero/seasonal pillar (per [project memory](.claude/projects/-Users-adrian-raduti-biomax-nu/memory/project_seasonal_brand_pillar.md)) currently leans on existing product shots. Decide: commission a custom shoot, license from a Swedish nature/lifestyle library, or stay on product-only photography for v1.
- [ ] **Founder framing review** — om-oss page uses "family heritage" language per the [no-credentials feedback](.claude/projects/-Users-adrian-raduti-biomax-nu/memory/feedback_no_unverified_credentials.md). Read it through once more before launch and confirm.
- [ ] **Product copy spot-check** — long descriptions are mostly imported from the old WP shop and lightly cleaned. Walk the bestsellers (Balans, Björkglukos, Beta Glucan, Easy Way) and confirm tone + claims.
- [ ] **Final WordPress export** — re-export biomax.WordPress.\<latest-date\>.xml the day of cutover so the last few weeks of orders/products land in the new DB. Run `scripts/import-wordpress.ts` against it.
- [ ] **Label artwork** — designer-ready brief at [docs/label-system-brief.md](docs/label-system-brief.md) covers brand architecture (Biomax master → Rockland® product line), regulatory floor, typography, colour system, per-category strip mapping, and a worked Colon Aid example. Hand to a designer; produce Figma master + 8 SKU mocks.

---

## 3 · Decisions to confirm

- [ ] **Trygg E-handel application** — 17 of 18 checklist items are implemented. The remaining one is a legal/lawyer sign-off on the updated villkor + ångerformulär before you submit. Pick a lawyer or signal that the current text is good enough.
- [ ] **Wave-3 priorities** (ADR 0016) — which of these matters most for launch?
  - Cross-sells on `/kop/[ingredient]` (editorial pin list per ingredient)
  - Homepage curation (block-list editor; hero, featured products, knowledge teasers all editor-controlled)
  - Klarna order-payload discount line (so created coupons actually show up inside Klarna's hosted checkout, not just our order math)
- [ ] **Photography sourcing** — see content section. Custom shoot has a 4–6 week lead time; this is the longest-pole item if you want it for launch.
- [ ] **Real SLA / support window** — if/when you want to publish "vi svarar inom X" anywhere, tell me the real number. Per the [no-fabricated-SLA feedback](.claude/projects/-Users-adrian-raduti-biomax-nu/memory/feedback_no_invented_sla.md) I'm leaving current copy untouched.

---

## 4 · Pre-launch (Phase 9) checklist

In rough order, the day-of cutover steps:

- [ ] **Domain & DNS** — point biomax.nu at the production deployment (Vercel / your host).
- [ ] **Provision production Postgres**, run `npx prisma migrate deploy`.
- [ ] **Run WordPress import** against the final export (Section 2).
- [ ] **Populate `Redirect` table** — legacy WP permalinks → new slugs. Most products are 1:1 by slug; the import script should generate the rest. Spot-check the top 20 traffic sources first.
- [ ] **Flip env vars to production** — Klarna, PostNord, Brevo, Sentry, GSC, Plausible.
- [ ] **Robots / sitemap** — currently allowing everything; confirm production `app/robots.ts` and `app/sitemap.ts` look right against the live domain.
- [ ] **Backups verified** — confirm the managed Postgres provider's snapshot policy. PITR turned on if available.
- [ ] **Uptime probe target updated** — point `UptimeProbe` rows at the prod URLs.
- [ ] **Submit Trygg E-handel application.**
- [ ] **End-to-end smoke test in production** — add to cart → checkout → real Klarna payment → confirmation → tracking link arrives by email. Test from a fresh device with cleared cookies.

---

## 5 · Deferred technical work (waiting on your green light)

I won't start any of these without confirmation. Listed in roughly highest-value-first order:

### From ADR 0016 (editorial control surfaces)
- **Cross-sells on `/kop/[ingredient]`** — `IngredientPin` model + same UX as the product-page related-products editor.
- **Homepage block-list curator** — `HomepageBlock` model with `slot`, `kind`, `payload`, `position`, `active`. Editors compose the homepage rather than asking a developer.
- **Klarna coupon discount line** — wire redeemed coupons into Klarna's order payload so the discount shows inside their hosted page, not just in our order math.

### From ADR 0017 (PostNord)
- **Phase B — booking + label PDF** — needs the booking endpoint enabled on your contract first. Adds `servicePointId`/`trackingNumber`/`labelPdfUrl` to `Order`, hooks into the order-confirmation server action.
- **Phase C — tracking polish** — public `/spara/[ref]` page, Brevo template gets the tracking link, optional webhook listener for delivery events.

### From earlier roadmap
- **Phase 6 follow-up — botanical monographs** — long-form ingredient pages for post-launch SEO. Reuses the existing `lib/knowledge/ingredients.ts` registry.
- **Phase 7 — Marketing automation** — dedicated ADR for Brevo automation flows (welcome series, abandoned cart, post-purchase, win-back).

---

## How to use this doc

- Tick items as you finish them.
- Hand me a credential and I'll wire the relevant env var + verify end-to-end.
- Pick a deferred item from §5 and I'll build it.
- Add new TODOs at the bottom of the relevant section as they come up.
