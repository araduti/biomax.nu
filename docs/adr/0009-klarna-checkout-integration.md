# ADR 0009 — Klarna Checkout v3 Integration

**Date:** 2026-05-10
**Status:** Accepted (scaffold) · Pending real credentials
**Supersedes:** Working defaults in ADR 0008

## Context

ADR 0004 selected Klarna Checkout (direct integration, v3) as the primary payment provider for biomax.nu — Klarna has ~70 % checkout penetration in Sweden, the audience expects it, and the existing biomax.nu (WooCommerce) was already on Klarna. The current Phase 3C work introduces the integration. Sandbox credentials are not yet provisioned, so the implementation must:

1. Build the entire flow end-to-end (cart → checkout → confirmation → webhook) so we can test the UX and the Order/OrderItem persistence today.
2. Cleanly upgrade to live Klarna once `KLARNA_USERNAME` / `KLARNA_PASSWORD` arrive — no architectural rewrites.

## Decision

### Architecture

```
┌───────────────────┐       ┌──────────────────────┐       ┌──────────────┐
│ /varukorg (cart)  │ ───▶ │ /checkout            │ ───▶ │ Klarna iframe │
│ (Zustand store)   │       │ (server-validated    │       │ (real mode)   │
└───────────────────┘       │  cart + form)        │       └──────┬───────┘
                            └──────────┬───────────┘              │
                                       │ stub mode:               │
                                       │ direct placeOrder()      │
                                       ▼                          ▼
                            ┌──────────────────────┐   ┌─────────────────────┐
                            │ /checkout/bekraftelse│   │ Klarna confirmation │
                            │ (Order summary)      │   │ uri → same page     │
                            └──────────────────────┘   └──────────┬──────────┘
                                                                  │ S2S push:
                                                                  ▼
                                                        ┌─────────────────────┐
                                                        │ POST /api/webhooks/ │
                                                        │ klarna              │
                                                        └─────────────────────┘
```

### Mode boundary — single function

`lib/klarna/client.ts` exports `isKlarnaConfigured()`. Every Klarna-aware
component checks this once and renders one of two flows:

- **Real mode** (creds set): create order at Klarna, render their HTML snippet (iframe), customer pays in iframe, Klarna redirects to our confirmation URL with `klarna_order_id`. Confirmation page fetches Klarna order details, creates our `Order` row, calls `acknowledge`. Push webhook updates status.
- **Stub mode** (creds missing): the checkout form posts directly to our `placeOrder` server action which validates the cart server-side, creates the Order with status `PAID` and `paymentReference: stub-{orderNumber}`, redirects to confirmation. Webhook is a no-op.

### Server-side trust boundary

The cart is client-side (localStorage / Zustand). **Prices in localStorage are not trusted.** `placeOrder` (and the Klarna order builder) re-fetch products by ID from Postgres, validate availability, and recompute totals using the authoritative DB prices before any DB writes or Klarna API calls.

### VAT / tax

Swedish supplements are 25 % VAT. Hardcoded as `SUPPLEMENT_VAT_BP = 2500` in `lib/klarna/cart-to-order.ts`. If we ever add 12 % (food) or 6 % (books) products, this becomes a per-product `taxRateBp` column on `Product`.

Prices in the catalog are stored gross (VAT-included), per Swedish convention. Klarna receives gross prices with `tax_rate` so the customer sees correct line totals.

### Shipping

`lib/klarna/cart-to-order.ts`:
- Free shipping above 499 SEK
- Standard shipping below: 49 SEK
- Sent to Klarna as a `shipping_fee` order line (taxed identically to products)

### Order numbering

`BMX-YYYYMMDD-NNNN`, where NNNN is a 4-digit random number. Generated in `lib/checkout/order-actions.ts`. Collision risk is negligible at our volume; if it ever matters, switch to a Postgres sequence.

### URLs (relative to `BETTER_AUTH_URL` in dev / production domain in prod)

| Klarna term | Path |
|---|---|
| `terms` | `/villkor` |
| `checkout` | `/checkout` |
| `confirmation` | `/checkout/bekraftelse?klarna_order_id={checkout.order.id}` |
| `push` | `/api/webhooks/klarna?klarna_order_id={checkout.order.id}` |

### Required env vars (added to `.env.example`)

```
KLARNA_API_URL="https://api.playground.klarna.com"   # sandbox; api.klarna.com in prod
KLARNA_USERNAME=""
KLARNA_PASSWORD=""
```

When `KLARNA_USERNAME` is empty, the system runs in stub mode.

### Out of scope for this ADR (deferred)

- Push signature verification (Klarna v3 doesn't sign pushes; relies on URL secrecy + acknowledge call)
- Klarna's KCO Color customization (post-launch polish)
- Recurring / subscription orders (post-launch per ADR 0008)
- Manual order capture for fulfillment workflow (Phase 5 admin)

## Consequences

- **Today**: Full checkout flow works without Klarna creds. Orders persist with `status: PAID`, `paymentReference: stub-…`, `legacySource: stub-checkout`. Designed to be filtered out of real revenue reporting.
- **When creds arrive**: Set the env vars, restart, and Klarna's iframe renders. The confirmation page logic that creates Order in stub mode will need a small branch to handle the real-Klarna flow (look up by `klarna_order_id` instead of `order` query param). Acknowledge + webhook wiring is already in place.
- **Stub orders cleanup**: Before launch, delete rows where `legacySource = 'stub-checkout'` to clear test data. Filter into the migration runbook in ADR 0008 phase 9.
- **Tax compliance**: Inclusive-pricing convention matches Swedish e-commerce expectations; Klarna invoices/receipts will display VAT correctly.
