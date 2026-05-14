# Integration boundaries — flip-readiness checklist

Each external service has the same shape: a single `isXConfigured()` gate
that controls real vs stub behaviour. Call sites are identical either way;
they read through helper functions, never `process.env` directly.

When credentials arrive: paste them into `.env.local` (or the production
secrets store) and the integration starts firing real calls. No code change
needed unless explicitly noted below.

| Integration       | Gate                              | Env vars                                                                                                                       | Status      | Notes                                                                                                                              |
|-------------------|-----------------------------------|--------------------------------------------------------------------------------------------------------------------------------|-------------|------------------------------------------------------------------------------------------------------------------------------------|
| Klarna Checkout   | `isKlarnaConfigured()`            | `KLARNA_API_URL`, `KLARNA_USERNAME`, `KLARNA_PASSWORD`                                                                         | Flip-ready  | Stub mode auto-marks orders as PAID. Live mode creates a Klarna order and waits for the webhook. The webhook handler is idempotent. |
| Klarna messaging  | _PDP widget — env-gated inline_   | `NEXT_PUBLIC_KLARNA_CLIENT_ID`                                                                                                 | Flip-ready  | When unset we render our own hand-rolled monthly-amount line. When set, swap for `<klarna-placement>` — TODO marked in component.   |
| Brevo (email)     | `isBrevoConfigured()` in `client.ts` | `BREVO_API_KEY`, `BREVO_FROM_EMAIL`, `BREVO_FROM_NAME`, `BREVO_REPLY_TO_EMAIL`                                              | Flip-ready  | Stub logs every email to console. Live sends via Brevo API. Bounce webhook at `/api/webhooks/brevo` needs `BREVO_WEBHOOK_SECRET`.   |
| Brevo webhook     | shared-token query param          | `BREVO_WEBHOOK_SECRET`                                                                                                          | Flip-ready  | Receiver rate-limited + token-auth'd; idempotent upsert on `unsubscribedAt`.                                                       |
| PostNord SP lookup| `isPostNordConfigured()`          | `POSTNORD_API_KEY`                                                                                                              | Flip-ready  | Stub returns Kållered-area fixtures.                                                                                               |
| PostNord booking  | `isPostNordBookingConfigured()`   | `POSTNORD_API_KEY` + `POSTNORD_CUSTOMER_NUMBER` + `POSTNORD_PAYER_NUMBER`                                                       | **Partial** | `liveBookShipment()` is a TODO stub — falls back to deterministic synthetic id with a console warning. Wire real Shipping Server v3 call when creds land. |
| GSC (SEO)         | `isGscConfigured()`               | `GSC_SERVICE_ACCOUNT_KEY` (JSON), `GSC_PROPERTY`                                                                                | Flip-ready  | Admin SEO panel + per-product query history rely on this. Empty UI when unconfigured (no error).                                  |
| Plausible         | implicit on `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, `NEXT_PUBLIC_PLAUSIBLE_HOST`, `NEXT_PUBLIC_PLAUSIBLE_SCRIPT`                              | Flip-ready  | Component returns null when domain unset.                                                                                          |
| Sentry            | `isSentryConfigured()`            | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`              | Flip-ready  | Instrumentation files are conditionally a no-op when DSN unset. Source-map upload only runs when `SENTRY_AUTH_TOKEN` is present.   |
| LLM citation      | gated on `LLM_API_KEY`            | `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`                                                                                      | Flip-ready  | Cron + admin UI; results empty when creds absent.                                                                                  |
| Trustpilot        | `getTrustpilotSummary()` reads SiteSetting | Admin pastes `trustpilot_rating` / `trustpilot_review_count` / `trustpilot_profile_url` via `/admin/installningar`         | Flip-ready  | When rating is null the hero strip renders the CTA-only variant — never fabricates a score.                                       |
| 2FA               | always on (Better Auth plugin)    | _none_                                                                                                                          | Live        | TOTP enrollment available at `/konto/sakerhet`. Admins should enable before launch.                                                |
| Klarna refund     | _admin action_                    | Same as Klarna Checkout                                                                                                         | **Partial** | The `recordRefund` action persists the bookkeeping outcome but does NOT call Klarna's refund API yet. Wire when creds + flow are verified end-to-end. |

## What needs code changes before going fully live

1. **`liveBookShipment()`** in `lib/postnord/booking.ts` — currently a
   `console.warn` + stub-fallback. Replace with the real Shipping Server v3
   call once `POSTNORD_CUSTOMER_NUMBER` + `POSTNORD_PAYER_NUMBER` arrive.
2. **`<klarna-placement>` PDP widget** in
   `components/product/klarna-installment.tsx` — the live-mode swap is
   documented inline; the script tag also needs to load in `layout.tsx`
   when `NEXT_PUBLIC_KLARNA_CLIENT_ID` is set.
3. **Klarna refund API call** in
   `lib/orders/return-actions.ts → recordRefund()` — currently the action
   only persists the bookkeeping record. When credentials are verified,
   call `klarna.refundOrder(paymentReference, amount)` before the DB
   write so the funds actually move.

## What needs configuration only (no code changes)

Every other integration is a "paste-the-key-and-restart" deploy.

## Order of operations the day creds arrive

1. Rotate Brevo key + paste into production secret store.
2. Add Klarna prod credentials (`KLARNA_USERNAME` / `KLARNA_PASSWORD`).
   Verify a test checkout flips an order through PENDING → PAID via the
   webhook.
3. Add `NEXT_PUBLIC_KLARNA_CLIENT_ID` and swap the PDP messaging widget
   to live (one component edit).
4. Add `POSTNORD_API_KEY` first — service-point lookup goes live.
5. Add `POSTNORD_CUSTOMER_NUMBER` + `POSTNORD_PAYER_NUMBER`, then code
   the `liveBookShipment()` call (one function body).
6. Sentry DSN + auth token + project/org → next CI build uploads source
   maps.
7. Plausible domain registered → next deploy starts collecting events.
8. GSC service account JSON → admin SEO panel comes alive.
9. Trustpilot — admin pastes current numbers into
   `/admin/installningar` (UI still pending wiring).

The rest is operational, not code.
