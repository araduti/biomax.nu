# ADR 0010 — Transactional & Marketing Email (Brevo)

**Date:** 2026-05-10
**Status:** Accepted (scaffold) · Pending real credentials
**Supersedes:** Working default in ADR 0008 (which named Postmark)

## Context

Phase 3D needs transactional email for password resets (Phase 3A) and order confirmations (Phase 3C). Phase 7 needs marketing automation (welcome series, abandoned-cart, post-purchase, win-back, newsletter to ~2,778 imported customers + new growth).

Postmark, Mailjet, and Brevo were all considered. **Brevo** was selected because:

- **EU data residency** (France) — natural fit for sv-SE-only Biomax under GDPR
- **Combined transactional + marketing automation + CRM + SMS** in one product
- **More mature marketing automation** than Mailjet — visual workflows, segmentation, lead scoring, A/B testing — directly relevant to Phase 7
- **Modern dashboard UX** — friendlier for non-developers tweaking workflows
- **Free tier**: 300 emails/day, 9,000/month — covers V1 comfortably
- **Single API key** auth (no public/private pair) — slightly simpler dev ergonomics

## Decision

### Same mode-boundary pattern as Klarna (ADR 0009)

`lib/email/client.ts` exports `isEmailConfigured()`. Every send call checks once:

- **Real mode** (`BREVO_API_KEY` set): hits Brevo's REST API v3 (`https://api.brevo.com/v3/smtp/email`).
- **Stub mode** (key missing): logs the email to the dev terminal in a bordered block with subject, recipient, links extracted from the HTML, and a plaintext preview — easy to grab password-reset URLs etc. while developing without credentials.

### Required env vars (`.env.example`)

```
BREVO_API_KEY=""
BREVO_FROM_EMAIL="noreply@biomax.nu"
BREVO_FROM_NAME="Biomax"
BREVO_REPLY_TO_EMAIL="kontakt@biomax.nu"
```

### Domain authentication (DNS records to set before going live)

When credentials arrive, also add to the `biomax.nu` DNS:

- **SPF**: `v=spf1 include:spf.brevo.com ?all`
- **DKIM**: TXT records on `mail._domainkey.biomax.nu` and `brevo1._domainkey.biomax.nu` (Brevo provides exact values during domain verification — typically two selectors)
- **DMARC**: `v=DMARC1; p=none; rua=mailto:dmarc@biomax.nu` (start lenient, tighten to `quarantine` then `reject` after 30 clean days)
- **MX** unchanged (Brevo only sends; doesn't receive)
- **Brevo verification TXT**: a one-time TXT record Brevo asks you to add to confirm you control the domain

### Templates

For V1, templates are pure TypeScript functions in `lib/email/templates.ts` that return `{ subject, html, text, preheader }`. They use a shared brand-aware HTML layout (`lib/email/layout.ts`) — table-based, inline CSS, web-safe fonts, brand tokens duplicated as inline styles.

Templates landed in V1:

- `passwordResetEmail` — used by Better Auth's `sendResetPassword`
- `orderConfirmationEmail` — used by `placeOrder` server action

When marketing automation is built (Phase 7), more complex templates (welcome series, abandoned cart) will live in Brevo's visual editor and be referenced by `templateId` — the `sendTransactional` API already supports both inline HTML and `templateId` form (passes through Brevo's `params` object for variable interpolation).

### Transactional vs. marketing send streams

Brevo handles both via the same dashboard with separate quota / reputation tracking. In Phase 7 we'll use Brevo's Automation feature (visual workflow builder) for non-transactional flows. Marketing sends will respect the `User.marketingConsent` flag set at checkout (and the future newsletter subscribe form).

### Failure handling

Email send failures are **non-fatal** for the underlying domain event:

- Order placement succeeds even if confirmation email fails. Order is in the DB; admin can resend from the order detail (Phase 5) or via Brevo's UI.
- Password reset failures bubble up to Better Auth which surfaces them to the user.

## Consequences

- **Today**: dev environment runs with stub-mode email. Password resets and order confirmations log full content (with links extracted) to the terminal where `bun run dev` is running. No credentials needed to test end-to-end flows.
- **When credentials arrive**: set `BREVO_API_KEY` in `.env.local`, restart the dev server (or redeploy in prod), and emails fly via Brevo. No code changes required.
- **Domain reputation**: must verify DKIM / SPF / DMARC before sending real customer emails. Add to launch checklist (Phase 9).
- **Phase 7 marketing automation**: implement using Brevo's Automation features, triggered by API events (e.g. order placed → enter post-purchase flow after 3 days). Contacts sync via Brevo's `/v3/contacts` API on user signup.
- **Cost trajectory**: free tier covers V1. Phase 7 with the 2,778-customer reactivation cohort + ongoing flows likely needs the Starter plan (~€19/mo for 20K emails) or Business (~€39/mo for 30K + automation features unlocked). Budget a placeholder.
