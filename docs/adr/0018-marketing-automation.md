# ADR 0018 — Marketing Automation (Phase 7)

**Date:** 2026-05-12
**Status:** Accepted; flows shipping incrementally.
**Related:** ADR 0010 (Brevo transactional), ADR 0016 (editorial surfaces — coupons), ADR 0017 (PostNord — order lifecycle hooks).

## Context

Transactional email (order confirmation, password reset, the review-request cron from earlier today) is wired and works. The next compounding revenue lever is the four lifecycle flows that every Swedish ecom of biomax's size runs:

1. **Welcome series** — newsletter signup → 3 emails → first-order discount.
2. **Abandoned cart** — visitor fills cart, leaves → reminder → recovery.
3. **Replenishment reminder** — supplements are consumed at a predictable rate; we can predict when a customer's bottle is running out and remind them.
4. **Stock notification** — out-of-stock product → "notifiera mig" → email when restocked.

These four flows share infrastructure: a subscriber list, suppression rules, double-opt-in compliance, segment definitions, and per-flow state tracking on individual records. Before building four flows we decide how that infrastructure lives.

## Decision

### Own the orchestration; use Brevo as the delivery layer

Brevo offers a visual flow builder. We don't use it. Instead, every flow is **our own cron job + state in Postgres**, calling Brevo only as a transactional-send API (the same pattern as the review-request cron). Reasoning:

- Single source of truth lives in our DB. Debugging, querying "what state is this customer in" works with `SELECT`.
- Deterministic: we know exactly what's been sent, when, and why. Brevo flows are opaque-box; debugging "why didn't this customer get the email" means logging into a vendor UI.
- Easier to swap vendors. The Klarna/PostNord/GSC pattern proves this works — if we move from Brevo to Lettermint (or anything else) one boundary file changes.
- Brevo's free tier has flow-count limits; cron jobs we build are unlimited.

Brevo's role is reduced to: deliverable transactional email, a verified sending domain, suppression of bounces, and unsubscribe link infrastructure.

### Single subscriber model, multiple flow states

`NewsletterSubscriber` already exists. We extend it rather than create per-flow tables. Adding:

- `welcomeSeriesStage Int @default(0)` — 0 = not started, 1–3 = email N sent, 4 = completed.
- `welcomeSeriesStartedAt DateTime?` — first-email timestamp (drives delays).
- `unsubscribedAt DateTime?` — explicit unsubscribe. NULL = active.
- `unsubscribeToken String @unique` — random token for one-click unsubscribe links.
- `source String?` — how we got them (already exists per current schema). Drives segmentation.

Suppression is global: any flow checks `unsubscribedAt IS NULL` before sending. A single one-click unsubscribe link works across every flow.

### One model per flow that needs its own state

Flows that operate on something other than the subscriber get their own table:

- **`CartSnapshot`** — for abandoned cart. `{id, email, userId?, items: Json, subtotalSek, createdAt, recoveryToken, firstEmailSentAt, secondEmailSentAt, recoveredAt}`. Written on add-to-cart events (debounced); deleted after recovery or 30-day expiry.
- **`StockNotificationRequest`** — for back-in-stock. `{id, productId, email, createdAt, fulfilledAt}`. Triggered by stock going from 0 to >0.
- **Replenishment uses no new table.** Computes from existing `Order` + `OrderItem` + `Product`. Tracks state per OrderItem via a new `replenishmentSentAt DateTime?` column.

### GDPR + SE compliance — single opt-in for newsletter, but explicit checkbox

Swedish marketing law allows **single opt-in** for newsletter signup (no double-confirmation email required), but the **opt-in must be explicit** — pre-checked boxes are illegal under GDPR Art. 7. Our newsletter form already has an unchecked checkbox; we keep it that way.

For order-completion implicit consent: Swedish law allows soft-opt-in (existing customer → similar-products marketing) but we don't use it. Every order completion includes an explicit `marketingConsent` checkbox (already in the schema). Only customers who checked it become marketing subscribers.

**Suppression on bounce or complaint:** Brevo's webhook posts hard-bounces and spam-complaints. We listen at `/api/webhooks/brevo` and mark the subscriber `unsubscribedAt = now()`. (Web­hook receiver lands in Phase 7.5 — not blocking the four core flows.)

### Cron schedule

Each flow has its own daily cron route under `/api/cron/`:

| Flow | Path | Schedule | Batch limit |
|---|---|---|---|
| Welcome series | `/api/cron/welcome-series` | every 6 hours | 200 / run |
| Abandoned cart | `/api/cron/abandoned-cart` | every 2 hours | 200 / run |
| Replenishment | `/api/cron/replenishment` | daily 08:00 | 200 / run |
| Stock notification | (event-driven, not cron) | n/a | n/a |
| Review request | `/api/cron/review-requests` | daily 09:00 (already exists) | 100 / run |

All gated on `Authorization: Bearer $CRON_SECRET`. [vercel.json](../../vercel.json) holds the schedule.

### Per-flow behaviour

#### Welcome series

- Day 0 (within an hour of signup): "Välkommen — här är din 10% kupongkod"
- Day 3: "Tre saker värt att veta om Biomax" (founder story + Kållered + brand pillar)
- Day 7: "Hitta rätt produkt — symptomguider och bestsellers" (drives traffic to /hjalp)
- Day 14: subscriber graduates to general newsletter.

Stage column advances each send. If user unsubscribes between stages, suppression rule stops further sends; row stays for analytics.

#### Abandoned cart

- Trigger: cart with ≥1 item, no checkout completion within 1 hour, email present (logged-in user OR email collected via newsletter / checkout-start).
- Email 1: 24h after abandonment — "Du glömde något i din varukorg".
- Email 2: 72h after abandonment — "Sista chansen — 10% rabatt med koden COMEBACK10" (optional discount; configurable per send).
- If `recoveredAt` is set (order completed), suppress.

Cart capture: every add-to-cart on a logged-in session OR a session where we have a known email writes to `CartSnapshot` with debouncing (replace existing snapshot for same email rather than append).

#### Replenishment

- Heuristic: for each OrderItem with `status FULFILLED`, compute `expectedRunOutAt` as `fulfilledAt + (count / suggestedDailyDose * days)`. Default `suggestedDailyDose = 1` per kapsel/tablett unless `Product.replenishmentDays` overrides.
- Send 7 days before `expectedRunOutAt`.
- Set `replenishmentSentAt` on the OrderItem so we don't re-send.

This is a deliberately simple heuristic. We don't model multi-bottle stockpiling, sharing within households, or sporadic use. The cost of mis-sending is one extra email; the value of catching the well-behaved case is high.

#### Stock notification

- Out-of-stock product page → "Notifiera mig när tillbaka i lager" button → email input → server action writes `StockNotificationRequest`.
- When `Product.stock` transitions from 0 to >0 (via admin save or order cancellation), the update hook fans out emails to pending requests in batches of 50, marks each `fulfilledAt`.
- No timing logic, no cron. Pure event-driven.

### What lives in Brevo

- Verified sender domain (`noreply@biomax.nu` with SPF + DKIM).
- Suppression list (bounces, complaints, manual unsubscribes synced from our DB).
- Possibly: a template-id-based send for the welcome stage 0 email if we want visual editing in Brevo. **Default position: keep HTML templates in our code** (existing pattern). Switch only if marketing team needs WYSIWYG.

## Consequences

**Positive**
- All four flows share one subscriber list and one unsubscribe path. A customer who unsubscribes is silenced everywhere automatically.
- Easy to add new flows later — they all follow the same shape: cron route + state column or table + template.
- Easy to add a new email provider — boundary file is one file.
- Easy to query: "how many customers got the day-7 welcome email last week?" → `SELECT COUNT(*) WHERE welcomeSeriesStage = 3 AND welcomeSeriesStartedAt > now() - interval '7 days'`.

**Negative / risk**
- We don't get Brevo's flow analytics dashboard for free. We build our own admin reporting in `/admin/marketing` (deferred from this ADR).
- Time-zone handling for Swedish customers: cron runs in UTC. We translate to Europe/Stockholm in the email logic where it matters (no emails between 22:00 and 07:00 local — soft rule, easy to add).
- Webhook receiver for Brevo bounces is Phase 7.5. Until then, bounces silently re-send. Acceptable for v1 launch volume.

**Out of scope (Phase 7.5 or later)**
- SMS or WhatsApp reminders.
- A/B testing of subject lines.
- Per-segment send timing optimization.
- "Predicted next-best-product" recommendation engine.
- Loyalty points / VIP tier.
- Brevo webhook receiver for bounce + complaint suppression.
- Admin marketing analytics dashboard.
