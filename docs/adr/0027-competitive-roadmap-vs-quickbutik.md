# ADR 0027 — Feature Matrix vs Quickbutik (status + go/no-go)

**Date:** 2026-05-18
**Status:** Proposed — decision matrix. Every "Go" row becomes its own
ADR when its GTM gate opens; nothing here is approved to build yet.
**Related:** ADR 0026 (Kine platform), `docs/strategi/kine-gtm-validering.md`
(gates this), `docs/varumarke/kine.md`, ADR 0019/0020/0021/0022/0023–0025
**Source:** Quickbutik published pricing matrix, captured 2026-05-18
(Startup 319 · Standard 795 · Pro 1 249 · Pro Advanced 3 995 kr/mo,
0 % transaktionsavgift, free migration).

## How to read this

- **Kine today:** ✅ have · ◐ partial · ❌ none
- **Decision:** **Have** (parity, no work) · **Upgrade→Px** ·
  **Build→Px** · **No-Go** (deliberate refusal, documented)
- **Tier:** P0 wedge (gate 1) · P1 parity-to-switch (gate 2) · P2 later
  · — n/a. "ADR" numbers in the table are **indicative placeholders**,
  not allocated — **0028 is now ADR 0028 (foundational architecture)**,
  so the roadmap items (Bokföring, Samtycke, …) get real numbers from
  0029+ when opened. None precedes ADR 0028's foundation.
- "Better than them" = win P0 outright, P1 only where absence blocks a
  switcher, refuse the rest. Build order follows GTM evidence, not this
  list (anti-Tictail).

## General / platform

| Feature | Quickbutik | Kine today | Decision | Tier·ADR |
|---|---|---|---|---|
| iOS/Android merchant app | All | ❌ | Build | P2·0036 |
| Physical products | All | ✅ | Have | — |
| Digital products | All | ◐ | Upgrade | P2·0040 |
| One-time + subscription products | All | ✅ (ADR 0019-adjacent) | Have | — |
| Mobile-optimised templates | All | ✅ | Have | — |
| Automatic updates | All | ✅ (SaaS deploys) | Have | — |
| GDPR / moms / svensk lag | All | ✅ (ADR 0023–0025, strong) | Have+ | — |
| Custom domain (store & checkout) | All | ◐ (single-tenant) | Upgrade | P0·ADR 0026 §2 |
| Multiple domains | All | ❌ | Build | P1·ADR 0026 §2 |
| Mentor AI | All | ❌ | Build | P2·0037 |
| Measurement & tracking | All | ◐ (Plausible/Sentry) | Upgrade | P1·0029 |
| Content AI | All | ❌ | Build (SV-native only) | P2·0037 |
| Import/export | All | ◐ (WP one-time) | Upgrade | P1·0033 |
| Sales & accounting reports | All | ◐ | Upgrade | P0·0028 |
| Pages & landing pages | All | ◐ (CMS blocks) | Upgrade | P2·0040 |
| Product & inventory system | All | ✅ (lager) | Have | — |
| Category & navigation | All | ✅ | Have | — |
| Free design templates | All | ❌ (bespoke single theme) | Build (token-bounded) | P1·ADR 0026 §6 |
| One-page checkout | All | ◐ (Kustom iframe) | Have | — |
| Complete order system | All | ✅ | Have | — |
| Unlimited product variants | All | ✅ | Have | — |

## In-store

| Feature | Quickbutik | Kine today | Decision | Tier·ADR |
|---|---|---|---|---|
| Loyalty points | All | ✅ (ADR 0019) | Have | — |
| Customer-specific pricing | All | ❌ | Build (light, not full B2B) | P2·0038 |
| Login-only purchase | All | ❌ | Build | P2·0038 |
| Login-only price visibility | All | ❌ | Build | P2·0038 |
| Customer login & portal | All | ✅ (/konto) | Have | — |
| Product reviews | All | ✅ | Have | — |
| Popups & notifications | All | ❌ | Build | P2·0040 |
| Custom product fields | All | ◐ | Upgrade | P2·0040 |
| Wishlist | All | ✅ | Have | — |
| Product filtering | All | ✅ | Have | — |
| Product monitoring (stock notify) | All | ✅ | Have | — |

## Sales-driving

| Feature | Quickbutik | Kine today | Decision | Tier·ADR |
|---|---|---|---|---|
| Gift cards (stored value) | All | ❌ | Build | P1·0034 |
| Advanced discounts | Standard+ | ◐ (flat coupons) | Upgrade | P1·0034 |
| Upselling in checkout | All | ◐ (cross-sell only) | Upgrade | P2·0040 |
| Blog system | All | ✅ (BlogPost) | Have | — |
| Buy-again | All | ◐ (order history) | Upgrade | P2·0040 |
| Free-shipping threshold | All | ✅ (site settings) | Have | — |
| Affiliates | All | ❌ | Build | P2·0039 |
| Abandoned-cart recovery | Standard+ | ✅ (cron) | Have+ | — |
| Checkout FAQ | All | ◐ (Kustom) | Have | — |
| Automatic feedback | All | ✅ (review-requests cron) | Have | — |
| Marketplaces channel | All | ❌ | **No-Go** | — |
| Comparison pages | All | ❌ | Build | P2·0040 |
| Social sales channels | All | ❌ | Build | P2·0039 |
| Newsletter | All | ✅ (Brevo lifecycle) | Have+ | — |

## Expansion

| Feature | Quickbutik | Kine today | Decision | Tier·ADR |
|---|---|---|---|---|
| Multiple languages | Standard+ | 🚫 | **No-Go** | sv-SE wedge, ADR 0026 §8 |
| Multiple currencies | Standard+ | 🚫 | **No-Go** | ADR 0026 §8 |
| Multiple stores / merchant | Standard+ | 🚫 | **No-Go** | incumbent complexity |
| Country-specific shipping | Standard+ | 🚫 | **No-Go** | SE-only by design |
| Country-specific payment | Standard+ | 🚫 | **No-Go** | SE-only by design |

## Payments

| Feature | Quickbutik | Kine today | Decision | Tier·ADR |
|---|---|---|---|---|
| Klarna Checkout | All | ✅ (Kustom, ADR 0020/21) | Have | — |
| Swish (e-com + Business) | All | ❌ | Build | **P1·0030** (hard objection) |
| Stripe + Apple/Google Pay | All | ❌ | Build | P1·0030 |
| Vipps MobilePay | All | ❌ | Build | P1·0030 |
| PayPal Express | All | ❌ | Build | P1·0030 |
| Nets Checkout | All | ❌ | Build | P2·0030 |
| Svea Ekonomi Checkout | All | ❌ | Build | P2·0030 |
| Custom payment methods | All | ◐ | Upgrade | P1·0030 |

## Shipping & logistics

| Feature | Quickbutik | Kine today | Decision | Tier·ADR |
|---|---|---|---|---|
| PostNord booking | All | ✅ (Kustom-managed, ADR 0020) | Have | — |
| Bring booking | All | ❌ | Build | P1·0031 |
| nShift booking | All | ❌ | Build | P2·0031 |
| Shipmondo booking | All | ❌ | Build | P2·0031 |
| Fraktjakt booking | All | ❌ | Build | P2·0031 |
| Packing slips & printing | All | ✅ (packlista, label PDF) | Have | — |
| Pick lists | All | ✅ (packlista) | Have | — |
| Automatic stock balance | All | ✅ | Have | — |
| Inventory monitoring | All | ✅ | Have | — |
| Warehouse system w/ receipts | All | ◐ | Upgrade | P2·0031 |
| Warehouse events | All | ❌ | Build | P2·0031 |
| WMS (Ongoing-class) | Pro | ❌ | **No-Go** | enterprise; segment is 0–3 staff |

## Additional / integrations

| Feature | Quickbutik | Kine today | Decision | Tier·ADR |
|---|---|---|---|---|
| **Fortnox automation** | **Pro only** | ❌ | **Build** | **P0·0028** (the wedge — native, all tiers) |
| **Visma automation** | **Pro (3rd-party AutomatiseraMera)** | ❌ | **Build** | **P0·0028** (native, not outsourced) |
| SIE export / verifikat | (implied via above) | ❌ | Build | **P0·0028** |
| Continuous CSV/Excel import | All | ◐ | Upgrade | P1·0033 |
| Store automation (Autopilot) | All | ❌ | Build | P2·0036 |
| API access | Pro | ❌ | Build | P1·0035 |
| Webhooks | Pro | ◐ (inbound Klarna only) | Build | P1·0035 |
| Isolated playground | Pro | ✅ (ADR 0022) | Have | — |
| Zettle POS (in-person) | Pro | ❌ | Build | **P1·0032** (our segment has a counter) |
| Printful dropshipping | Pro | ❌ | **No-Go** | not Swedish-wedge; revisit only on demand |

## Support (no fabrication — policy TBD)

Quickbutik: email/chat + community + **Swedish phone** all tiers;
personalised contact, priority, **99.99 % SLA**, dedicated env on Pro
Advanced. Kine has no support-policy decision yet. Per
`feedback_no_invented_sla`: **do not fabricate response windows or
staffed hours.** Support tiering + any SLA is an explicit open decision
(belongs with platform billing, ADR 0026 §7), not an assumed parity.

## Deliberate refusals (the "vi gör bara det svenska, på djupet" promise, literal)

Multi-language, multi-currency, multi-store, country-specific
shipping/payment, marketplaces channel, WMS, Printful dropshipping.
Matching these makes Kine a worse Quickbutik (ADR 0026 §8). Refusal is
a feature; revisit only with validated demand, never to chase a matrix.

## Net read

- **Where we already win/par:** catalog, variants, loyalty, reviews,
  subscriptions, PostNord, abandoned-cart, newsletter, GDPR/consent
  (stronger than Quickbutik here), playground.
- **Where we must be decisively better (P0):** 0028 bokföring — Quickbutik
  Pro-gates Fortnox (1 249 kr/mo) and *outsources* Visma. Native +
  all-tier + SIE is the wedge. Plus 0029 consent (vs Cookiebot, separate
  analysis).
- **Switching objections (P1):** Swish (0030) and migration tooling
  (0033) are the two most likely to block Segment B; POS (0032) is high
  wedge for physical mom-and-pops. Internal P1 order set by GTM Gate 2,
  not here.
- **Noise (P2) and refusals:** explicitly parked/declined so scope can't
  outrun validated demand.

## Consequences / open question

P0 must not be starved by the long P1/P2 parity tail. The defensible
product is 0028/0029, not feature-parity with Quickbutik (they ship
too). Internal P1 sequencing remains open until GTM Gate 2 evidence
shows which missing feature most blocks switchers.
