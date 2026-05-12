# ADR 0017 — PostNord Integration (Phased)

**Date:** 2026-05-11
**Status:** Phase A scaffold accepted; Phases B & C pending business credentials.
**Related:** ADR 0009 (Klarna), ADR 0010 (Brevo)

## Context

Biomax already ships every order with PostNord under an existing business agreement (`Företagsavtal`), but the fulfillment workflow is fully manual: warehouse staff log into the PostNord business portal, paste address details, click through to print a label, then email the tracking number to the customer by hand. This works for ~10 orders/day but doesn't scale and produces avoidable errors (wrong address copied, tracking-number typos, customers calling support to ask "where is my parcel").

PostNord exposes four developer APIs that can automate this:

1. **Service Points** (`/rest/businesslocation`) — locates nearest pickup ombud by postal code. Public catalog data; only requires a dev API key.
2. **Shipment Booking** (`/rest/shipment/v3`) — creates a shipment, returns tracking number + PDF label. Gated behind `kundnummer` + `betalarnummer` and tied to the active business contract; PostNord must enable the endpoint per-contract.
3. **Tracking** (`/rest/shipment/v5/trackandtrace`) — parcel status lookup by tracking number.
4. **Price** (`/rest/transport/businesslocation`) — real-time freight cost by weight/dimensions. Useful only if we move beyond flat-rate shipping.

The business account exists; the developer credentials do not. The dev API key (#1, #3, #4) is same-day from `developer.postnord.com`. The booking endpoint enablement (#2) is 1–2 weeks via Företagskundtjänst.

## Decision

### Phase the integration so UX work doesn't block on paperwork

**Phase A — Service Points (this PR; ships against a stub today)**

- `lib/postnord/` mode-boundary module following the Klarna/Brevo pattern: env-driven (`POSTNORD_API_KEY`) stub-vs-real switch. Stub returns realistic Kållered-area ombud so we can build and test the full flow before the dev key lands.
- Server route `app/api/postnord/service-points/route.ts` accepts a postal code, calls the boundary, returns a normalised JSON list. The API key never crosses the network to the browser.
- `<ServicePointPicker postalCode={...} onSelect={...} />` client component with postal-code input, list of 3–5 nearest ombud, and a radio-select. Selection lives in component state for now — it's persisted to the order in phase B.
- No checkout-flow changes yet. The picker can be dropped into the existing flow once we've validated the UX with the stub.

**Phase B — Shipment Booking (waits for `kundnummer`)**

- Order schema gains `servicePointId String?`, `trackingNumber String?`, `labelPdfUrl String?`.
- After Klarna posts `order_pushed`, a server action calls PostNord booking → stores tracking number + label URL on the Order → triggers the Brevo confirmation email with the tracking link.
- Admin Order page gets "Skriv ut fraktsedel" and "Spåra paket" affordances.

**Phase C — Tracking polish (after Phase B is in production)**

- Public `/spara/[trackingNumber]` page that calls the Tracking API server-side and renders the parcel timeline.
- Brevo confirmation email template updated to link directly to the parcel-tracking page.
- Optional: a webhook listener that updates Order status on delivery events (PostNord pushes JSON to a URL we register).

### Why service points first

Three reasons:

1. **Highest UX win, lowest risk.** Service-point selection is what Swedish customers already expect ("Vart vill du hämta paketet?"). Phase A delivers visible polish even before we touch the fulfillment workflow.
2. **No coupling to billable infrastructure.** The Service Points API queries public catalog data — there's no shipment created, no money moves, no contract risk. We can ship this against the stub today and flip to the real endpoint with a single env-var change when the key arrives.
3. **De-risks Phase B's hardest question.** Klarna's checkout owns address collection; service-point pickup *replaces* the address for some delivery options. Building the picker first forces us to answer "where in the flow does this go?" before we've committed booking-API work to a fragile design.

### Where the picker goes in Klarna checkout

This is the integration's main design question. Two patterns are in play in Swedish ecom:

- **Pre-Klarna** — show the picker before Klarna's hosted-page mounts. The customer picks an ombud (or "leverans hem"), then Klarna handles address + payment. The chosen ombud is passed to PostNord booking server-side.
- **Klarna delivery options** — Klarna can render shipping options inside its hosted page, but each option must be pre-priced and pre-named. Service-point selection still happens upstream; Klarna just shows the *result* ("PostNord ombud: Coop, Mölndal").

We pick **pre-Klarna**, because:
- Klarna's hosted-page delivery options are designed for fixed shipping methods, not dynamic per-postcode selection.
- Address still comes from Klarna (the customer types it once, in Klarna's UI). The ombud is selected by *postal code* upstream of Klarna; we don't need a full address to look up service points.
- Keeps the boundary between "biomax owns delivery method" and "Klarna owns payment + address."

The current single-step checkout in `app/checkout/checkout-flow.tsx` becomes two steps:
1. **Leverans** — postal code + delivery method (ombud picker or "leverans hem").
2. **Betalning** — Klarna hosted page.

We add a `DeliveryStep` component above the existing Klarna step. Free shipping is unaffected — the SiteSetting threshold still applies and shows in both steps.

## Consequences

**Positive**
- Customer-visible UX wins (ombud picker, tracking link) land in distinct increments rather than waiting for a single big-bang launch.
- The mode-boundary pattern lets us demo end-to-end checkout before any PostNord billing is involved.
- Phase B's tracking-number persistence simplifies the existing "where is my parcel?" support burden — customers self-serve via the tracking link.

**Negative / risk**
- Two-step checkout adds a click. We accept this because the alternative (auto-pick nearest ombud) is brittle and feels presumptuous.
- The stub will diverge from real PostNord data eventually (closed locations, holiday hours). Phase A treats this as acceptable for demos but we don't ship the stub to production — it's gated by `POSTNORD_API_KEY` being unset, which is a dev/CI condition only.
- Phase B couples our order-confirmation flow to PostNord's uptime. We retry once on transient failures, then queue the booking for manual retry from admin if PostNord is down. The customer still gets a confirmation email; the tracking link just shows up via a follow-up email once booking succeeds.
- Webhook receiver in Phase C requires a stable public URL — fine in prod, awkward in dev. We use the same env-gated pattern (`POSTNORD_WEBHOOK_SECRET` unset = stub).

**Out of scope**
- Real-time freight pricing (Phase D if we ever need it).
- International shipping — biomax sells Sweden-only per existing memory.
- Return labels — separate workflow, separate ADR if/when it matters.
- Multi-carrier (DHL, Bring, Instabox) — single-carrier is fine for v1.
