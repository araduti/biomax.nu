# ADR 0004 — Payment Provider

**Date:** 2026-05-10  
**Status:** Accepted

## Context

Biomax.nu sells health supplements to Swedish consumers. The previous version of the site used Klarna. We evaluated whether to continue with Klarna or switch to an alternative.

### Swedish market context

- Klarna has ~70% checkout penetration in Sweden
- "Köp nu, betala senare" (buy now pay later) is a cultural norm
- Consumers expect Klarna as the default; its absence increases checkout abandonment
- Klarna Checkout handles VAT, invoicing, and GDPR data processing agreements

### Alternatives considered

| Provider | Pros | Cons |
|---|---|---|
| **Stripe** | Lower fees (~1.5% + €0.25 vs Klarna's higher merchant fees), excellent DX, global | No native BNPL in SE; lower conversion for Swedish consumers |
| **Adyen** | Enterprise-grade, multi-method | Complex integration; overkill for current scale |
| **Svea Ekonomi** | Swedish, BNPL | Smaller developer ecosystem, fewer integrations |
| **Stripe + Klarna via Stripe** | Best of both — Stripe's DX, Klarna as a payment method via Stripe's Payment Element | Slightly higher fees than direct Klarna; Klarna features may lag direct integration |

## Decision

Use **Klarna Checkout (direct)** as the primary payment provider.

If and when Stripe's Klarna integration reaches feature parity with direct Klarna Checkout (particularly around installment plan display and BNPL UX), we will revisit migrating to Stripe as the unified payment orchestration layer — which would also unlock Stripe's superior invoicing, subscription billing, and dispute tooling.

The `PaymentProvider` enum in the Prisma schema already includes `KLARNA | STRIPE | MANUAL`, keeping the migration path open.

## Consequences

- Integration will use the Klarna Checkout API (v3) with a server-side session created via a Next.js route handler.
- Klarna handles PCI compliance for card data.
- Order confirmation and fulfillment hooks are received via Klarna push webhooks — we must expose a verified webhook endpoint.
- Test environment: Klarna provides a sandbox that can be accessed with test credentials.
- Klarna API credentials are stored as environment variables, never in code.
