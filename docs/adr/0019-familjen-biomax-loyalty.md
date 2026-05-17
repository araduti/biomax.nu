# ADR 0019 — Familjen Biomax (Loyalty Program)

**Date:** 2026-05-13
**Status:** Accepted (Phase 1 + Phase 2 shipped)
**Related:** ADR 0008 (build roadmap), ADR 0009 (Klarna), ADR 0018 (marketing automation)

## Context

biomax.nu's repeat-purchase rate is the defining LTV lever in our category — supplements are bought monthly, often for years. Subscriptions exist (10 % discount, autorenewal), but cover only the customers willing to commit. The middle band — people who reorder every 6–8 weeks but never sign up to a sub — had no carrot from us.

Apotea / Bodystore / Apohem all run loyalty programs. Without one we leave repeat-frequency growth on the floor.

## Decision

Ship a single, unified loyalty program named **Familjen Biomax**, framed around the 25-year family heritage rather than corporate "points." Auto-enroll every signup; no opt-in. Single tier (no Bronze/Silver/Gold complexity in v1).

### Mechanics (constants in `lib/loyalty/constants.ts`)

| Field | Value | Note |
|---|---|---|
| Earn rate | 1 poäng / 1 kr | Gross, paid amount. Awarded on Order → PAID. |
| Burn rate | 100 poäng = 10 kr | 1 % effective return — clean math. |
| Min redemption | 100 poäng | Snap-to-multiples. |
| Welcome bonus | 50 poäng | On account create, via `databaseHooks.user.create.after`. |
| Inactivity expiry | 24 months rolling | Any earn or burn resets the clock. (Phase 3 cron.) |

### Architecture

- **Append-only ledger.** `LoyaltyTransaction` is the source of truth; `LoyaltyAccount.balance` + `lifetimeEarned` + `lastActivityAt` are denormalized caches kept coherent via `lib/loyalty/ledger.ts:postTransaction`. **No other code may write `LoyaltyAccount.balance` directly.**
- **8 transaction kinds:** `EARN_ORDER`, `BURN_REDEMPTION`, `BONUS_WELCOME`, `BONUS_BIRTHDAY`, `BONUS_REFERRAL`, `ADJUST_ADMIN`, `REVERSAL`, `EXPIRE`.
- **Idempotency** keyed on `(orderId, kind)` for everything order-linked. Re-running the awarder or the reverser for the same order is a no-op.
- **Reversal covers both sides.** When an order flips to CANCELLED or REFUNDED, both the earn (debit) and the burn (credit) are reversed. Customer wallet is restored to its pre-order state.
- **Server is the trust boundary.** `placeOrder` re-validates redemption against the live balance + subtotal in öre. The client value is a suggestion.

### What shipped (Phase 1 + Phase 2)

- Schema (`LoyaltyAccount`, `LoyaltyTransaction`, `Order.loyaltyPointsAwarded`, `Order.loyaltyPointsRedeemed`)
- Auto-enroll on signup via Better Auth `databaseHooks.user.create.after`
- Auto-earn on Order → PAID (Klarna webhook + stub checkout)
- Auto-reverse on Order → CANCELLED / REFUNDED
- Redemption at checkout (server-validated, applied to `discountAmount` + `loyaltyPointsRedeemed`)
- Klarna `type: "discount"` line emitted by `buildKlarnaPayload` (cap-bounded to product amount)
- Customer UI: balance card on `/konto`, full ledger at `/konto/familjen`
- Cart drawer + cart page earn-preview ("Du tjänar X poäng")
- Admin UI: balance + lifetime earned on `/admin/kunder/[id]`
- Backfill script: `scripts/backfill-loyalty-accounts.ts`

### What's NOT shipped (and why)

| Surface | Status | Rationale |
|---|---|---|
| **PDP "Du tjänar X poäng"-pill** | Deferred | Same `LoyaltyEarnPreview` component on each product detail page. Converts customers who haven't seen the loyalty surface yet. Low risk, high frequency. |
| **Order confirmation hero pill** | Deferred | `+285 poäng tjänade ✦` as the first thing post-purchase. Reinforces the program at the moment of highest emotional weight. |
| **Empty-state CTA on `/konto/familjen`** | Deferred | When `balance < MIN_REDEMPTION_POINTS`, nudge with "Det här räcker till nästa rabatt: …" rather than just "fram tills dess samlas poängen". |
| **Free shipping always for members** | Deferred (Phase 3) | UX-only change once redemption is live. Real revenue lever — eliminates the #1 cart-abandon cause for repeat buyers. |
| **Welcome / birthday / expiry emails** | Deferred (Phase 3) | Needs Brevo wiring (ADR 0010 / 0018). |
| **Birthday bonus** | Deferred (Phase 3) | Needs DOB on User + yearly cron. |
| **Member-only badging on PDP** | Deferred (Phase 3) | "Tillgängligt för Familjen Biomax-medlemmar" on new product launches. |
| **Marketing landing `/familjen`** | Deferred (Phase 3) | Public-facing program page for not-yet-signed-up visitors. |
| **Admin manual adjust UI** | Deferred (Phase 3) | Support needs to gift / claw back points. Ledger already supports it via `ADJUST_ADMIN`; just no form yet. |
| **Inactivity expiry cron** | Deferred (Phase 3) | Sweeps accounts inactive ≥ 24 mån. Daily cron, posts `EXPIRE` rows zeroing the balance. |
| **Account-portable points across email match** | Deferred | Today we credit only orders with a `userId`. Guest orders that later create an account with the same email don't retroactively credit. Out of scope for v1. |
| **Tiers** | Out of scope | Single tier is enough. Tier preview from `lifetimeEarned` if we ever go there. |

## Consequences

### Good

- LTV lever in place for the 50–60 % of customers who don't subscribe but reorder regularly.
- Ledger pattern means we can audit + report on every poäng movement. No mystery balances.
- Heritage framing ("Familjen Biomax") complements the broader brand pillar without inventing new ones.

### Trade-offs

- 1 % effective return is on the conservative side. Apotea / Apohem run ~1–2 %. We can lift the rate in `constants.ts` without retroactively re-pricing historical earnings (each EARN_ORDER row is immutable).
- Auto-enrolment means we count more "members" than actively-engaged users. Not a problem for v1 UX; will matter when we ship the inactivity cron — base it on lastActivityAt, not enrolledAt.
- Idempotency uses `(orderId, kind)` rather than a stricter event-id pattern. Sufficient for our linear order state machine; would need rethinking if order status could flip back and forth.

## Open questions

- Should subscription orders earn a higher rate (e.g. 2× points) to make the subscription path even more attractive? Defer until we have 6 months of data.
- Do we want a "refer a friend" mechanic (`BONUS_REFERRAL` exists in the enum)? Strong fit for the family framing, but referral programs in SE have legal nuances around incentive disclosure. Defer.
