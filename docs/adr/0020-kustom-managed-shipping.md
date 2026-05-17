# ADR 0020 — Kustom-Managed Shipping (supersedes ADR 0017 picker/booking)

**Date:** 2026-05-15
**Status:** Accepted (scaffold) · Pending Kustom test-ground verification
**Supersedes:** ADR 0017 §"Where the picker goes in Klarna checkout" and Phase B
booking ownership. ADR 0017 Phase A (service-point UX exploration) and Phase C
(tracking polish) are subsumed here.
**Related:** ADR 0009 (Klarna/Kustom checkout), ADR 0017 (PostNord), ADR 0010 (Brevo)

## Context

ADR 0017 chose a **pre-Klarna upstream picker**: our own
`<ServicePointPicker>` selecting a PostNord ombud by postal code before the
payment step, plus our own `lib/postnord/booking.ts` calling PostNord's REST
Shipment v3 API to create the parcel and pull the label. The reasoning (ADR
0017 lines 51–67) was that Klarna's hosted-page delivery options were built
for *fixed* shipping methods, not dynamic per-postcode service-point
selection.

That constraint no longer holds. Klarna Checkout has rebranded to **Kustom**,
and Kustom's checkout now includes a managed shipping product: a PostNord
carrier connection is configured once in the Kustom merchant admin panel, and
Kustom renders the service-point selector *inside its own checkout iframe*,
pre-priced, and (pending verification) drives the PostNord booking itself,
returning the chosen service point and tracking number on the order payload /
push webhook.

Biomax has Kustom test-ground credentials (the playground issues its **own
API key id + password**, distinct from the legacy Klarna Checkout v3
username/password) and PostNord has been connected inside the Kustom admin
panel.

## Decision

### Kustom owns service-point selection and PostNord booking

- The customer picks their PostNord ombud (or home delivery) **inside the
  Kustom iframe**. We do not render a picker, do not split checkout into
  Leverans → Betalning, and do not call PostNord's Shipment API ourselves.
- We **consume** the result: the Kustom order payload + push webhook carry the
  selected service point and (pending step-2 verification) the PostNord
  tracking number. We persist these to the existing `Order.servicePointId` /
  `Order.trackingNumber` columns.
- The mode boundary stays a single function (`isKlarnaConfigured()`), per ADR
  0009. Stub mode is unchanged. Real mode now points at the Kustom test
  ground via Kustom-specific env vars.

### Kustom Shipping Assistant (KSA) must be triggered in the payload

Per the Kustom Shipping Assistant docs, connecting PostNord in the merchant
portal is necessary but **not sufficient** — KSA only renders carrier
options when the create-order payload also triggers it via one of:
`allow_separate_shipping_address: true`, a fallback `shipping_options`
array, or the `shipping_option_update` / `address_update` `merchant_urls`
callbacks. Our current payload sends none, so PostNord pickup points will
NOT appear in the iframe until a trigger is added.

When KSA / `shipping_options` drives shipping, the payload must **not** also
carry a `shipping_fee` order line (Kustom adds the selected option's price
itself — otherwise shipping is double-charged). Real mode therefore needs a
shipping treatment distinct from the stub path's `shipping_fee` line.

### CORRECTION (2026-05-15, after reading the raw KSA docs)

Two earlier statements in this ADR were wrong:

1. `allow_separate_shipping_address` is **not** a top-level payload field
   — it is nested under an `options` object. Fixed in `cart-to-order.ts`
   (`options: { allow_separate_shipping_address: true }`).

2. The KSA pickup-point contract is **not support-gated**. It is fully
   documented. KSA fetches options from a **Shipping API "Integrator"**,
   which is either a connected TMS partner (nShift/Unifaun, Consignor)
   configured in the portal, **or the merchant implementing the Shipping
   API directly**. The PostNord credentials added in the Kustom panel are
   carrier/label creds — they do **not** make KSA serve ombud points. To
   get real PostNord pickup points rendered inside the iframe we must act
   as the Integrator and implement the documented Shipping API:

   - `POST /auth` — bearer-token issue; auth is a SHA-256 digest of
     `nonce + merchant_key`.
   - `POST /shippingoptions` — called on every cart/address change.
     Returns options incl. `locations[]` (pickup points with
     `id`/`name`/`address`/`coordinates`/`operational_hours`); partial
     address → `preview`-flagged options.
   - `POST /shipment` (+ `PUT /shipment/{id}`) — persists the selected
     option, creates a preliminary shipment, returns `shipment_id` /
     `tracking_id`.

   This is backed by our existing `lib/postnord/service-points.ts`
   (option lookup) and `lib/postnord/booking.ts` (shipment creation) —
   so those modules are **repurposed, not dead code**. Tracking flows
   back to Kustom from `/shipment`; the merchant reads the final
   selection + tracking off the order post-purchase (Order Management
   API / read-order).

### DECISION (2026-05-15): TMS-partner route, not direct Shipping API

We will use a **TMS partner** (nShift/Unifaun or Consignor) that fronts
PostNord, rather than implementing the Shipping API ourselves. The TMS
owns the PostNord agreement, the `/shippingoptions` + `/shipment`
contract, label generation, and tracking. KSA setup per the official
5-step guide:

1. Checkout integration live (done).
2. Obtain TMS shipping credentials — `identifier`, `key`, `markets`
   (SE) — from the TMS partner; PostNord is connected inside the TMS.
3. **Activate a KSA profile on the Merchant ID in the Kustom portal**
   (Playground first), entering the TMS credentials + markets. *This
   is the missing piece — without a KSA profile on the MID the payload
   trigger does nothing.*
4. Payload trigger — `options.allow_separate_shipping_address: true` +
   fallback `shipping_options`. **Already implemented.**
5. Verify in Playground: physical-item test order → KSA renders
   dynamic PostNord options incl. ombud from the TMS.

**Consequence for our code:** `lib/postnord/booking.ts` and
`lib/postnord/service-points.ts` are **no longer needed for the Kustom
flow** under the TMS route (the TMS owns options + booking + label +
tracking). They are only still referenced by stub-mode's
`ServicePointPicker`. They become genuinely dead once stub-mode
delivery UI is retired — not deleted yet (stub mode is preserved).

Steps 2–3 + 5 are **Biomax portal/procurement tasks**, not code. The
only remaining code work is the confirmation/push handling below
(reading the TMS-selected service point + tracking off the Kustom
order post-purchase). Until the KSA profile exists, real mode ships
with the flat `shipping_options` fallback (home delivery only).

### Confirmation flow (refines ADR 0009 line 97)

Kustom's checkout is a strict 4-step flow: create → render iframe → **read
order via API** (using the `Location` header, not a URL built from the order
id) → render the **confirmation `html_snippet`** Kustom returns. The
confirmation page must do the read + render the returned snippet, and read
the selected service point + tracking off that order. This supersedes the
stub `?order=` lookup for real mode.

### Deprecated by this ADR — REVISED scope (2026-05-15)

The Shipping-API-Integrator finding above narrows what is actually dead.
**Genuinely dead** (Kustom renders the picker + collects address/identity
inside the iframe, so our upstream UI is redundant):

- `components/checkout/service-point-picker.tsx`
- the customer/address/delivery fieldsets + two-step delivery UI in
  `app/checkout/checkout-flow.tsx` (real/Kustom mode only — stub mode
  keeps the full form)
- `app/api/postnord/service-points/route.ts` (the *public* picker route)

**Repurposed, NOT deleted** (they back the Kustom Shipping API
Integrator we now need to implement):

- `lib/postnord/service-points.ts` → feeds `POST /shippingoptions`
- `lib/postnord/booking.ts` → feeds `POST /shipment` / label

Stub mode is entirely unchanged and keeps the existing checkout form.

### Credentials

The Kustom test ground uses its own key id + password and (potentially) its
own API host. New `KUSTOM_*` env vars carry these; code falls back to the
legacy `KLARNA_*` vars so nothing breaks before they are set. Stub mode
remains the default when none are set.

## Consequences

**Positive**
- Far less code we own: no picker UI, no postcode lookup route, likely no
  Shipment v3 client. Kustom maintains the PostNord integration surface.
- Single-step checkout — the extra click ADR 0017 reluctantly accepted goes
  away.
- Service-point pricing/availability is Kustom's problem, eliminating the
  stub-divergence risk ADR 0017 flagged.

**Negative / risk**
- We are now coupled to Kustom's PostNord integration quality and its payload
  shape for service point + tracking. Mitigated by reading defensively in the
  webhook handler.
- ADR 0017's `booking.ts` retry/queue-on-PostNord-down design is lost if
  Kustom books. If Kustom's booking is less resilient than ours was, we
  revisit.

**Deferred to post-verification (steps 4–5)**
- Confirmation page lookup by Kustom order id instead of the stub `order`
  query param (the branch ADR 0009 line 97 deferred).
- Webhook handler reading service point + tracking from the Kustom payload.
- End-to-end test in the Kustom test ground.

**Out of scope** (unchanged from ADR 0017): real-time freight pricing,
international shipping, return labels, multi-carrier.
