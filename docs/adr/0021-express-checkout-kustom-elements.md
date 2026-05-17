# ADR 0021 — Express Checkout via Kustom Elements (TABLED)

**Date:** 2026-05-16
**Status:** **Tabled / deferred.** Scaffold landed env-gated (inert by
default). Not on the launch path. Resume only when the blockers below
clear.
**Related:** ADR 0020 (Kustom-managed checkout), checkout redesign
brief (`Design/Biomax Checkout - Implementation Plan.html` §6)

## Context

The checkout redesign brief makes an Express-pay strip (Apple Pay /
Google Pay / Klarna Express above the iframe) its "P0 / #1 conversion
lever". Kustom provides this as an **On-site Element**
(`<kustom-express-buttons>`) loaded via a portal Installation script —
not a custom PSP integration on our side.

We scaffolded it. It does **not** work end-to-end, for reasons that
are mostly outside our codebase.

## Decision

Adopt Kustom Elements as the Express mechanism (not a hand-built
Apple/Google Pay integration), **but table the feature** until it can
actually function. It is **not** a launch dependency.

### What is built (env-gated, inert by default)

- `app/layout.tsx`: the Kustom Elements `<head>` loader, gated on
  `NEXT_PUBLIC_KUSTOM_ELEMENTS_SRC` + `NEXT_PUBLIC_KUSTOM_ELEMENTS_KEY`.
  Unset → not loaded.
- `kustom-elements.d.ts`: typings for `<kustom-express-buttons>` +
  `window.kustomElements`.
- `app/checkout/checkout-flow.tsx`: the Express strip (mockup parity),
  rendered only when the key env is set.
- `.env.example`: both public vars documented.

**Tabling = leave the env vars unset.** With them unset the loader,
the element, and the strip do not render — zero runtime/UX impact on
`/checkout`.

### Blockers (why it's tabled)

1. **EXPRESS_CHECKOUT placement not provisioned for the client.**
   Portal "Setup → Save" returns "An error occurred"; the element
   then fails with `409 …/v1/express → "Placement configuration for
   EXPRESS_CHECKOUT is missing for client playground_e97d7228…"` and
   `403 …/clients/<key>/express-config`. No code or portal field fixes
   an un-entitled placement — needs Kustom to enable Express Checkout
   for that client (Portal "Get Playground Access" / Kustom support).
2. **Setup save failing.** Push/Validation/Confirmation URLs. Validation
   appears required; URL-templating token for Express is unconfirmed
   (checkout uses `{checkout.order.id}`). Resolve once #1 is unblocked.
3. **Cart-handoff JS API undocumented to us.** Kustom docs state
   Express Buttons "require a JavaScript API call to configure the
   order and handle callbacks" (`window.kustomElements(...)`). The
   dedicated Express Buttons reference page is gated/404 for us — the
   exact order-config + callback contract is unknown. The element
   renders but won't carry the Biomax cart without it.
4. **React #418 hydration crash (ours).** Rendering
   `<kustom-express-buttons>` through SSR while the Elements runtime
   mutates its DOM client-side → hydration mismatch. Must be made
   client-only **before** the feature is re-enabled. Known, not yet
   fixed (no point until 1–3 clear; harmless while env-gated off).

### Conditions to resume

All of: (a) Kustom confirms EXPRESS_CHECKOUT is provisioned for the
production client; (b) portal Setup saves with our push/confirmation
URLs; (c) we have the Express Buttons `window.kustomElements(...)`
order-config + callback contract; (d) the #418 client-only fix is
applied. Express success must flow through the existing idempotent
`/api/webhooks/klarna` + `/checkout/bekraftelse`
(`ensureOrderFromKustomOrder`) — verify one Express order → one Order
row.

## Consequences

- **Positive:** scaffold + portal URL guidance are captured; turning
  it on later is config + the documented JS call, not a rebuild. Zero
  impact while tabled.
- **Negative:** the brief's headline conversion lever is deferred. The
  rest of the redesign (loyalty, cart panel, trust) ships without it.
- **Out of scope while tabled:** the minimal Validation endpoint, the
  client-only hydration fix, and the JS cart handoff — all gated on
  the Kustom-side entitlement.
