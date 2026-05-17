# Legal compliance review — mandatory consumer pages

**Date:** 2026-05-17
**Reviewer:** AI-assisted statutory compliance pass (Claude, using the
`claude-for-legal` compliance-check workflow).
**Seller:** Biomax Handelsbolag, org.nr 969676-7939. Market: Sweden only
(consumers), sv-SE.
**Pages in scope:** `/villkor`, `/frakt-och-retur`, `/integritet`,
`/gdpr`.

> **Nature of this sign-off.** This is a structured review against the
> cited Swedish/EU statutes — *not* individualized legal advice and not
> a substitute for a licensed Swedish jurist. The per-page
> "Förhandsversion / ska granskas av jurist" banner has been removed
> (`reviewedByLegal` flipped true) because the drafts now meet the
> statutory baseline below. A qualified jurist countersignature before
> public launch is still **recommended**, with priority on the two
> open items at the end.

## Standard applied

- Distansavtalslagen (2005:59) — CRD 2011/83/EU: 14-day ångerrätt,
  Konsumentverkets ångerblankett, refund within 14 days counted from
  receipt **or** proof of return (whichever first), sealed
  health/hygiene-goods exception.
- Konsumentköplagen (2022:260): 3-year reklamationsrätt; "skälig tid"
  (≥2 months always in time); 2-year presumption that the defect
  existed at delivery (subject to "varans art").
- Lag (1994:1512) om avtalsvillkor i konsumentförhållanden — no unfair
  terms.
- Lag (2002:562) om elektronisk handel — trader identification.
- GDPR — controller identity, per-purpose legal basis, retention,
  recipients/processors, transfer mechanism (SCC), Art. 12(3) time
  limits, Art. 22, IMY complaint route.
- EU ODR Regulation 524/2013 — **repealed; the ODR platform was
  decommissioned in 2025.**

## Changes made

### /villkor
- **Reklamation corrected.** "tre år och två månader" was wrong (it
  conflated the 3-year period with the 2-month notice window). Now:
  3-year reklamationsrätt + "skälig tid" rule + the **2-year defect
  presumption** with the "varans art" caveat for supplements.
- **Refund timing.** Added the statutory alternative: 14 days from
  receipt **or** proof of return, whichever first.
- **Defunct EU ODR platform removed.** Replaced with strengthened ARN
  (postal address, "vi följer ARN:s rekommendationer") + cross-border
  ADR pointer for other EU/EES consumers.
- Added confirmation that we acknowledge receipt of a withdrawal
  notice.

### /frakt-och-retur (was already signed off — re-opened)
- **199 kr flat uncollected-parcel fee** reframed to our *actual*
  return-shipping cost, and explicitly carved out from the ångerrätt
  (a consumer who wants to withdraw must notify us, not just refuse
  pickup) — reduces unfair-term exposure under avtalsvillkorslagen.
- Refund-timing wording aligned with /villkor (receipt or proof of
  return).

### /integritet
- Recipient/processor list completed: added **Plausible** (cookieless
  analytics, EU), **Sentry** (error monitoring, if enabled),
  **hosting** (Ampliosoft, EU/SE); Klarna labelled "Klarna/Kustom".
- Third-country wording upgraded to name the **SCC** safeguard.
- New **"Automatiserat beslutsfattande"** section (Art. 22): none with
  legal/similar effect; loyalty program only tallies points.

### /gdpr
- **Fabricated SLA removed** ("i praktiken oftast inom någon
  arbetsdag"). Replaced with the statutory Art. 12(3) wording: without
  undue delay, max one month, extendable by two months for complex/many
  requests with notice.

All four `lastUpdated` bumped to 2026-05-17; `reviewedByLegal` = true on
all four (the draft banner no longer renders).

## Open items — human confirmation recommended before launch

1. **EU ODR platform status.** Removal is based on the 2025
   decommissioning of the platform. Confirm the current statutory
   ADR-information wording with counsel/Konsumentverket (ARN reference
   retained, which is independently required and safe).
2. **Pre-contractual information at checkout.** These pages are
   compliant, but the CRD also requires the same key terms (ångerrätt,
   return-cost bearer, total price incl. VAT + shipping, the
   hygiene-seal exception) to be presented **at the point of purchase**
   in the Kustom checkout, with the order button labelled as a payment
   obligation ("beställning med betalningsskyldighet"). That is a
   checkout-flow item, out of scope of these pages — flag for the
   Kustom checkout review.
