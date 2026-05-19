# Marketing-skills review — biomax.nu

**Date:** 2026-05-19 · **Commit:** `1b5034d` · **Mode:** read-only

The 40 marketing skills from [`coreyhaines31/marketingskills`](https://github.com/coreyhaines31/marketingskills) were just installed as GitHub Copilot custom chat modes under [`.github/chatmodes/`](../.github/chatmodes/) and pinned to **Claude Opus 4.7**. This document is a single consolidated review of biomax.nu **from the perspective of every skill that applies to this codebase**, with concrete next steps grouped by theme.

Skills that don't apply to a Swedish DTC e‑commerce supplement brand (B2B-only: `cold-email`, `revops`, `sales-enablement`, `ads` for outbound demos; mobile-only: `aso`, `paywalls`) are noted briefly and parked. Everything else got a real pass.

Each finding cites a real file/line where possible so you can `Cmd-click` straight to it.

---

## 0 · Shared product-marketing context (read this first)

The skills all check for [`/.github/product-marketing.md`](../.github/product-marketing.md) (or `.agents/product-marketing.md` / `.claude/product-marketing.md`) before doing anything. **This file does not exist yet.** Until you create it, every skill will start by asking you the same five questions.

**Next step:** open Copilot Chat, switch to the `product-marketing` mode, and have it generate the context file in one pass. Source material is already in [`README.md`](../README.md), [`TODO.md`](../TODO.md), [`app/page.tsx`](../app/page.tsx) (homepage metadata), and [`lib/jsonld.ts`](../lib/jsonld.ts) (`organizationLd`). After that file is in `.github/product-marketing.md`, **every other skill becomes ~3× more useful** because it stops asking "who's your ICP again?".

---

## 1 · Conversion & UX skills

### `/cro` — homepage & PDP

The homepage in [`app/page.tsx`](../app/page.tsx) is well-architected (`HomepageBlock` editor, season-aware hero, JSON‑LD inline). CRO gaps:

- **Hero CTA stack** in [`components/marketing/hero.tsx`](../components/marketing/hero.tsx) sends visitors to `/produkter` — a 100+-product catalogue with no qualifying step. Conversion theory says hero CTA should match the *primary* visitor intent. For a supplement brand the dominant first-visit intent is "what's right for me", not "browse SKUs". Reroute to `/hjalp-mig-valja` (the quiz) and demote "Utforska produkter" to secondary.
- **No price/trust anchor above the fold.** The hero copy is brand-emotional ("Livskvalitet, i fokus."). Above the fold there is no price signal, no rating, no shipping promise. Add a thin trust strip immediately under the hero: `4.8 ★ (Trustpilot · NN reviews) · Fri frakt över 499 kr · Familjeägt sedan 2001`.
- **PDP add-to-cart is below the fold on mobile** for products with a long subtitle/badge stack. TODO #3 already lists "Sticky add-to-cart bar on mobile" — this is the single highest-leverage mobile-CRO item; ship it before any new feature work.
- **Cart drawer cross-sell strip** ([`components/cart/cart-cross-sells.tsx`](../components/cart/cart-cross-sells.tsx)) exists but isn't reused on the cart page (`/varukorg`). Mirror it. Confirmed AOV lift on every Swedish DTC test I've seen documented.

### `/signup` — `/skapa-konto` flow

Looking at [`app/skapa-konto/`](../app/skapa-konto/): the form is short and well-labelled. Two quick wins:

- **Inline the value of registering** above the form ("Spara dina favoriter · Snabbare utcheckning · Få 10 % rabatt på första köpet"). Currently the form just says "Skapa konto" with no "why".
- **Offer guest checkout from the cart explicitly** before pushing signup. If checkout already supports guest (verify in [`app/checkout/`](../app/checkout/)), surface it as the primary path on cart-overflow.

### `/onboarding` — post-signup

There is no welcome experience after `/skapa-konto`. Post-signup, the user lands on the account home. **Recommended:**

1. Welcome screen with one job: complete the `/hjalp-mig-valja` quiz to personalise replenishment recommendations.
2. Trigger a Brevo welcome series (3 emails: brand story → bestseller education → first-order discount reminder).
3. The "Hjälp mig välja" result persistence is TODO #6 — that's the **prerequisite** for all personalisation, do it first.

### `/popups` & `/paywalls`

- **Exit-intent popup** for newsletter on first visit (cookie-gated to 30 days). One on a category page costs nothing to A/B against the inline footer signup in [`components/marketing/newsletter.tsx`](../components/marketing/newsletter.tsx).
- `paywalls` doesn't apply — no app, no premium tier. Parked.

---

## 2 · Copy & content skills

### `/copywriting` & `/copy-editing`

The brand voice in the hero is **disciplined and Swedish-first** — that's rare and it's a moat. Two systemic gaps:

- **"So what?" follow-ups are missing.** Hero says *"Vetenskapligt baserade naturpreparat. Kliniskt dokumenterade ingredienser. Tydligt deklarerat innehåll."* Three feature claims, zero benefit translation. Add a fourth sentence that completes the loop: *"Så du vet exakt vad du tar — och varför."*
- **CTA verb monoculture.** `"Utforska produkter"`, `"Hjälp mig välja"`, `"Läs mer"` — all browse-y. Test an outcome-led variant on the secondary CTA: `"Visa mina alternativ"` / `"Hitta min rutin"`. Copy-editing 101: CTA = verb + outcome, not verb + noun.
- **Newsletter copy** in `components/marketing/newsletter.tsx` is excellent ("Ett genomtänkt brev varannan vecka. Inga utskick i tid och otid."). Use this voice as the **anchor sample** in the brand voice guide that's already listed as TODO #14.

### `/content-strategy` & `/marketing-ideas`

TODO §4 already lays out: ingredient monographs, comparison articles, glossary, symptom encyclopedia. **My add:**

- **Editorial calendar tied to seasonal hero rotation** (you already rotate hero by `currentSeason` in [`lib/seasons.ts`](../lib/seasons.ts)). Each season needs (1) a hero brief, (2) a featured monograph, (3) a Brevo broadcast, (4) one Instagram-Reels script. Codify the 4-deliverable rule per season so content doesn't decouple from the storefront's seasonal pulse.
- **"Question→article" pipeline.** Every recurring support email or quiz free-text answer should auto-spawn a draft FAQ/article ticket. Cheap, compounds forever.

### `/emails`

TODO mentions Brevo wired and bounce webhook live. Missing flows worth building, in priority order:

1. **Abandoned cart** (3-touch: 1h soft, 24h with question, 72h with offer). Single biggest revenue lift for any DTC.
2. **Replenishment** — every supplement has a natural reorder window (30/60/90 days based on `servingsPerContainer` × `dailyDose`). Calculate per-product, fire from a cron.
3. **Post-purchase education series** — 5 touches over 30 days teaching how/when to take the specific SKU. Reduces churn (people who don't see results stop buying).
4. **Win-back** at day 120 of no orders.
5. **Birthday / "namnsdag"** — 15 % code. Swedish customers respond unusually well to namnsdag.

### `/social` & `/video`

The `/press` page (TODO §2) is the prerequisite for any organic-social and influencer ambition. Don't sequence social ahead of it.

For video — the **family-business story video** (TODO §14) is the highest-ROI piece of video content you can commission. Use a single videographer day to also capture: (a) hero loops for the homepage, (b) 4 × 30-sec product explainers, (c) the "packing process" b-roll referenced for the GBP profile.

### `/image`

The site uses Next/Image responsibly (priority hero, `sizes="100vw"`, `quality={90}`). Real gaps:

- **Per-page-type OG images** are TODO §4. Build the OG-image generator using Next.js's [`opengraph-image`](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image) at the segment level (`/produkter/[slug]/opengraph-image.tsx`, `/hjalp/[slug]/opengraph-image.tsx`). Auto-generated from product/symptom data; no per-page work.
- **Custom alt text per product image.** TODO §4 lists this. The `/image` mode can produce a one-shot script that grades alt text quality across all products.

### `/cold-email`

Doesn't apply to consumer DTC. **Parked.**

---

## 3 · SEO & discovery skills

### `/seo-audit`

Strong foundation — JSON‑LD inline (ADR 0005), `robots.ts` explicit for LLM bots, `llms.txt` generated from Postgres, sitemap with stable `lastmod`. Concrete gaps:

- **Sitemap `lastmod` for product pages currently uses `updatedAt`** — but `updatedAt` on a `Product` bumps for non-content edits (stock, price). That trains Google to ignore your lastmod. Add a `contentUpdatedAt` field (or compute `MAX(updatedAt of content fields)`); only bump it when name/description/imageUrl/longDescription changes.
- **Internal-link density on `/produkter/[slug]`**. Each PDP should link to (a) its category, (b) every ingredient monograph, (c) the relevant `/hjalp/*` symptom page, (d) related bundles, (e) 3 cross-sells. Audit with one script.
- **Canonical on paginated/sorted PDP-list URLs.** Sort/page query-strings should canonicalise to the unsorted, page-1 URL. Verify [`app/produkter/page.tsx`](../app/produkter/page.tsx) does this — current `metadata` block doesn't show a dynamic canonical.

### `/ai-seo` (AEO / GEO / LLMO)

This is biomax's emerging-channel bet (TODO §5). Current setup is **above average for a Swedish brand** — `robots.ts` explicitly allows GPTBot, ClaudeBot, PerplexityBot etc., `llms.txt` is dynamic. To turn allowance into citations:

- **TL;DR blocks** on every `/hjalp/*` and ingredient monograph (TODO §5 already lists this — promote it). 1–2 sentence summary at the top of the page, then *also* the same sentence wrapped in JSON-LD `Question`/`Answer` schema so it shows up in AI Overviews and Perplexity panels verbatim.
- **Definition density.** `DefinedTerm` schema on every ingredient name. The glossary page (TODO §4) should output `DefinedTermSet` so the entire vocabulary is one structured object.
- **Citation-friendly URL slugs in Swedish.** Verify ingredient/symptom slugs are full Swedish words, not transliterations — LLMs cite high-context URLs more often than `/p/12345`.
- **Activate the LLM citation tracker** (TODO §5, blocked on `LLM_API_KEY`). Without it you're flying blind on whether any of this is working.

### `/schema`

You already have `organizationLd`, `productLd`, `breadcrumbLd`, `itemListLd`, `websiteLd`. TODO §4 says "audit for `FAQPage` / `AggregateRating` / `DefinedTerm`". Add to the audit list:

- **`Review` + `AggregateRating` on PDP** (verify; the data is there in `Review` model).
- **`HowTo` schema on `/hjalp-mig-valja` results page** if it outputs a routine.
- **`Recipe`-style `MedicalIndication`** for symptom pages where appropriate — there's an active medical-content schema family that pairs well with `DefinedTerm`.
- **One central JSON‑LD validator script** that hits every page type with a head-spider and runs the response through Google's [Rich Results testing API](https://developers.google.com/search/apis/indexing-api/v3/quickstart). Make it a CI gate.

### `/site-architecture`

The URL structure is **good Swedish** — `/produkter`, `/hjalp/[slug]`, `/kop/[slug]`, `/kategorier`, `/blogg`. One concern: `/kop/[slug]` and `/produkter/[slug]` look like they cover overlapping intent. Document the rule explicitly:

- `/kop/[slug]` = transactional landing pages targeting commercial keywords (`köp Q10`, `bästa magnesium`).
- `/produkter/[slug]` = the actual SKU page.

If that's the rule, canonical-link `/kop/[slug]` → its primary `/produkter/[slug]` to avoid keyword cannibalisation, **or** make `/kop/[slug]` a true category roll-up (multiple products, comparison table) so it's clearly a different node.

### `/programmatic-seo`

Big underused opportunity. You have the data spine for at least three template families:

1. **`[ingredient] + [symptom]`** → e.g. `/forsta-hjalpen/magnesium-for-somn`. The `findProductsForIngredient` + `symptoms/registry` join is already there in [`lib/knowledge/`](../lib/knowledge/).
2. **`[brand-alternative]` pages** — `/alternativ/[konkurrent]/[produkt]`. Use the `competitors` skill to draft 10 of these for the Swedish brands you compete with (Holistic, Great Earth, Solgar, NOW Foods SE distributor).
3. **`[stad]-leverans`** — `/frakt/goteborg`, `/frakt/stockholm` — only if it doesn't tip into doorway-page territory. Skip if marginal.

### `/competitors` & `/competitor-profiling`

There's no comparison content live. **Build the `/alternativ/[konkurrent]/` template family** with one head-to-head example (Holistic Magnesium vs Biomax Balans) before scaling. Profile the 4 named Swedish competitors above first using the `/competitor-profiling` mode — output their product range, pricing tiers, claim style, and trust signals — and let that drive both the comparison pages and your own pricing decisions.

---

## 4 · Trust, research & social proof skills

### `/customer-research`

You have order data, review data, and the WordPress import. **Set up a quarterly customer-voice mining ritual:** export the latest 200 reviews + 200 Brevo replies + all `/hjalp-mig-valja` free-text answers, run through the `customer-research` mode, output (a) the top 5 jobs-to-be-done, (b) the top 5 objections, (c) the words customers actually use. Feed (c) directly into the copywriting and ad-creative skills' input.

### `/marketing-psychology`

A handful of high-leverage levers the site doesn't yet pull explicitly:

- **Specificity over rounding** — `"Familjeägd sedan 2001"` already does this; extend the pattern: replace `"Snabb leverans"` with `"Skickas inom 24 h från Kållered"`.
- **Loss aversion at cart** — "Du är 49 kr från fri frakt" progress bar (verify it's wired; TODO mentions the threshold A/B-ability).
- **Social proof in motion** — small "Anna i Malmö köpte Balans för 12 minuter sedan"-style ticker. Sourced from real anonymised orders. Use sparingly on PDP, not site-wide.
- **Reciprocity in the welcome series** — lead with a free PDF (lead-magnet skill) before the discount code.

### `/lead-magnets`

Currently the only lead magnet is "10 % på första köpet". That converts a narrow band of high-intent visitors. Add a **content-led magnet** for low-intent traffic:

- *"Den lilla guiden till magnesium"* — 8-page PDF, gated by email, links to your magnesium SKUs. The `/free-tools` skill is the sister opportunity if you'd rather build than write.

### `/free-tools`

Two tools that fit biomax's organic-SEO + lead-capture posture:

1. **"Vitamin D-räknaren"** — input: latitud + huvudsaklig tid utomhus + kost → output: rekommenderad dos + linkar till relevanta produkter. SEO magnet for "D-vitamin dos"-class queries (high volume in SE, especially Oct-Mar).
2. **"Magnesium-formjämföraren"** — interactive table of magnesium forms (citrate / glycinate / malate / oxide) with absorption %, common-use, your matching SKU. Linkable, citable by LLMs, captures email at the end.

### `/community-marketing`

Probably too early — no critical mass yet. Park until post-launch, then revisit with a `/r/biomax`-style space *or* a Brevo-driven private Facebook group seeded with the top 50 repeat customers.

### `/co-marketing`

Natural partners in SE: independent naprapater, yogalärare, hälsobloggare, Eken Hälsobutik's existing local network. Same population as the affiliate-program target in TODO §11 — co-launch a "Biomax recommends" content series with 5 partners, each writing one ingredient monograph in exchange for an affiliate code. Solves SEO and partner activation in one motion.

### `/referrals`

TODO §11 has "Refer-a-friend (10 %/10 %)". Build it sooner rather than later — the `Coupon` model already exists, the `Referral` table is a 30-minute migration, and Swedish DTC customers will refer if asked.

---

## 5 · Paid & creative skills

### `/ads`

You're not running paid yet. When you do, the **right starting wedge for a Swedish supplement brand** is:

1. **Google Shopping** (free first via Merchant Center — TODO §11; the feed at [`app/feeds/google-shopping.xml`](../app/feeds/google-shopping.xml/) is already shipped). Paid Shopping has lower CAC than search for branded supplements.
2. **Meta retargeting** of cart-abandoners and email subscribers. Don't run cold Meta until the content + creative library exists.
3. **Branded Google search** as a defensive moat against the Holistic/Solgar bidding on `biomax`.

Skip TikTok, LinkedIn, Twitter for now.

### `/ad-creative`

Prerequisites: family-story video + product photography (both TODO §14). Once those exist, the `/ad-creative` skill can spin out 30+ variants per format from one creative brief. **Do not buy ads against the current stock-photo library** — your brand voice deserves better.

### `/ab-testing`

There is **no experimentation harness in the repo today**. Before doing CRO at scale, decide:

- **Build vs buy:** Vercel Edge Config + a tiny `useExperiment(name)` hook is enough for 2-3 simultaneous tests. PostHog or GrowthBook for >5. Don't pull in VWO/Optimizely for this scale.
- **First three tests to run**, in order: (1) homepage CTA `/produkter` vs `/hjalp-mig-valja`, (2) PDP sticky add-to-cart on/off, (3) cart-page cross-sell strip on/off. All three are reversible, isolated, and shipping-blocker free.

### `/launch`

There's no public launch yet (the legacy site is still live). When you cut over, the `launch` skill's checklist maps cleanly onto TODO §16. Add explicitly:

- **Product Hunt SE / Sifted-newsletter pitch** if cutover yields a *visibly different* product (it does).
- **Press release in Swedish** to Breakit, Di Digital, Resumé — tied to "Biomax, 25 år, helt nybyggd e-handel". Family-business angle + 25-year milestone is a journalist hook.

---

## 6 · Pricing, monetisation & retention skills

### `/pricing`

The schema supports `price` and `comparePrice` per `Product`. Beyond that, **no pricing strategy is encoded in code or doc.** Concrete recommendations:

- **Tier the catalogue into 3 price bands** explicitly: under 199 kr (trial / impulse), 199–399 kr (core SKU), 399+ kr (premium / clinical). Use band as the "value frame" in copy. Currently each product reads as a standalone, which makes higher-priced SKUs feel arbitrary.
- **Bundle pricing is implemented** ([`Bundle` model, `cart-bundle-group.tsx`](../components/cart/cart-bundle-group.tsx)) but bundles aren't visibly *cheaper-per-unit-on-the-PDP*. Add a "spara X kr i ett paket" callout on each PDP that's a member of a bundle.
- **Subscription discount of 15 %** (TODO §3) is correctly sized for SE supplements; price-sensitivity work in this category is well-documented to break at 10/15/20 — 15 is the sweet spot.

### `/churn-prevention`

Pre-launch, churn = subscription churn (once you ship it) and email-list churn. Build the cancellation flow at the same time you build subscriptions — never after. Specifically:

- **Save offer modal** before cancel: pause 1 month, swap product, 10 % off next.
- **Failed-payment dunning** — Klarna handles most of this for one-time; for recurring you'll need explicit dunning emails (3 touches, then cancel).
- **Exit survey** — single question, multiple choice, optional free text. The answers feed straight back into `/customer-research`.

### `/sales-enablement` & `/revops`

Both are B2B-flavoured. **Skip unless you spin up a wholesale arm.** If/when biomax sells into pharmacies or gym chains, revisit.

---

## 7 · Distribution, ops & strategy skills

### `/directory-submissions`

Low-effort, real backlink value. Submit to: Allabolag, Hitta.se, Eniro, Reco, Trustpilot (already), Prisjakt (TODO §11), PriceRunner, AllaAnnonser, Fyndiq (if relevant), Trygg E‑handel directory (after certification). Spend half a day, get backlinks worth months of SEO writing.

### `/analytics`

Plausible wired ([`components/site/analytics.tsx`](../components/site/analytics.tsx)), web-vitals reporter present, Sentry scaffold up. Missing — and this is a real gap for any conversion work:

- **Custom event taxonomy is undefined.** Decide and document: `cart_add`, `checkout_step_view`, `quiz_complete`, `bundle_click`, `outbound_click`, `lead_magnet_download`. Wire to `plausible('event', {props})`. Until this exists, every other skill in this review is recommending changes you can't measure.
- **Server-side conversion event** on order placement → Plausible Goals + Meta CAPI (when paid is live). Plausible's JS-only event will miss orders from privacy-strict customers.
- **Funnel dashboard at `/admin/marketing`** (TODO §12) — build from your own DB, don't rely on Plausible UI.

### `/marketing-ideas`

Swedish-DTC-supplement plays worth queueing for "ideas backlog":

- **"Naturapotek-jämförelser"** — annual published comparison "Biomax vs Apoteket vs Apohem vs Life" for a key category. SEO + PR.
- **"Family business calendar"** — physical print calendar mailed to top 200 customers in November, featuring the brand pillars per month. ROI: WOM + retention.
- **"Hälsodag i Kållered"** — once-a-year open-house at the store, free konsultation/håranalys, paired with a launch SKU. Localness as a moat.
- **"Frågelåda"** — submit-a-question page that becomes the FAQ pipeline.

### `/marketing-psychology` & `/customer-research`

Already covered above (§4).

---

## 8 · Skills parked (don't apply / not yet)

| Skill | Why parked |
|-------|-----------|
| `/aso` | No mobile app. |
| `/paywalls` | No premium tier / no in-app upgrade surface. |
| `/cold-email` | DTC consumer brand, not B2B. |
| `/revops` | No sales team / no lead lifecycle to operate. |
| `/sales-enablement` | Same — no sales motion to enable. |
| `/community-marketing` | Defer until post-launch traction. |

---

## 9 · Consolidated priority queue (next 30 days)

Ranked by `(impact × confidence) / effort`, with the originating skill in brackets. Each item should be a single PR or a single ops task.

1. **Create `.github/product-marketing.md`** via the `/product-marketing` chat mode. (1 hour, blocks everything else.) `[product-marketing]`
2. **Custom event taxonomy + Plausible wiring** for `cart_add`, `checkout_step_view`, `quiz_complete`, `lead_magnet_download`, `outbound_click`. (½ day; blocks all measurement.) `[analytics]`
3. **Sticky add-to-cart on mobile PDP** + **cross-sell strip on `/varukorg`**. (1 day; biggest mobile-conversion lift available.) `[cro]`
4. **Hero CTA reroute** to `/hjalp-mig-valja` with a real A/B test, behind the lightweight experiment harness built in the same PR. (1 day.) `[cro, ab-testing]`
5. **Trust strip under hero** — Trustpilot + shipping + heritage. (½ day; ship with stub data until Trustpilot integration lands.) `[cro, marketing-psychology]`
6. **TL;DR + `FAQPage`/`DefinedTerm` JSON-LD** on every `/hjalp/*` and ingredient monograph. (2 days; biggest LLM-citation lift.) `[ai-seo, schema]`
7. **Abandoned-cart Brevo flow** — 3 touches. (2 days; single largest email-driven revenue lift for any DTC.) `[emails]`
8. **Replenishment-window calculator** + first replenishment email. (2 days; locks in repeat purchase.) `[emails, churn-prevention]`
9. **OG-image generator per page type** via Next's `opengraph-image.tsx`. (1 day; multiplies social-share CTR.) `[image, seo-audit]`
10. **First comparison page** — `Holistic Magnesium vs Biomax Balans` — using `/competitor-profiling` for input. (1 day; template for the family.) `[competitors, programmatic-seo]`
11. **Directory submission sprint** — top 8 SE directories. (½ day; backlinks compound.) `[directory-submissions]`
12. **Editorial calendar tied to seasonal hero**, 4 deliverables per season. (1 day to set up the doc + first quarter; ongoing.) `[content-strategy]`

---

## 10 · Things explicitly *not* to do (next 30 days)

Saying no is half the value of a marketing review.

- **Don't run paid Meta or Google search ads** before the creative library, real photography, and the analytics taxonomy exist. You'll burn 5-figure SEK on bad attribution and learn nothing.
- **Don't build TikTok presence** before there's a content calendar that can sustain it. Empty-feed signal worse than no profile.
- **Don't add cookie consent** until you load something beyond Plausible (Plausible is cookieless on purpose).
- **Don't onboard a community platform.** Defer.
- **Don't rebuild the search** before you've measured what `/sok` traffic actually does today (item #2 above unlocks that).

---

## How this review was produced

This is the **author's pass** of the 40 installed skills against the codebase, not 40 independent Copilot conversations — that's not something a background task agent can spawn. The intended workflow going forward is:

1. Open Copilot Chat with the relevant `/<skill>` mode.
2. Point it at the section of this document it owns (e.g. `/cro` → §1 CRO subsection) plus the cited files.
3. Have it produce the implementation plan / PR / copy.

Treat this document as the **shared backlog the skills work from**, not the final answer.
