# ADR 0014 — Google Search Console Integration

**Date:** 2026-05-10
**Status:** Accepted (scaffold) · Pending production credentials
**Related:** ADR 0005 (SEO & AI SEO), ADR 0013 (Observability Tier 1) — same mode-boundary pattern

## Context

The /admin/seo dashboard from Stage 1 surfaces **internal** SEO signals (schema validity, keyword cannibalisation, content depth) — all computed from our own DB. What it can't tell employees is **what queries actually drive traffic**, which pages have the highest impressions, where CTR is leaking, or which AI-keywords we should be targeting that we're not.

Google Search Console is the canonical answer to all of those questions. The data is free, accurate (it's Google's own ground truth), goes back 16 months, and has an official API.

## Decision

Integrate the **Search Console API v3** read-only via a **service account** (not OAuth).

### Why service account, not OAuth

| | Service account | OAuth (per-user) |
|---|---|---|
| Auth dance | None — JWT signed at request time | Browser consent screen, refresh token storage |
| Token management | Library handles it | We handle refresh, rotation, expiry |
| Audience | Internal admin users (1–3 staff) | Multi-tenant SaaS |
| Friction at provisioning | Add one email as GSC user | Each user authorises individually |
| Failure mode | Single env var → reconfigure | Token expiry → user has to re-auth |

For an admin tool used by 1–3 internal staff, service account wins on every dimension. We don't need per-user attribution; we need the data in admin.

### Architecture

`lib/integrations/gsc.ts` — single file with mode-boundary helpers (`isGscConfigured`, `getSiteSummary`, `getTopQueries`, `getTopPages`, `getQueriesForPage`). Same shape as the Klarna/Brevo/Sentry helpers from prior ADRs.

The library uses `google-auth-library` (~2 MB) for JWT signing and access token caching. We deliberately avoid the full `googleapis` package (~50 MB) — Search Console's REST surface is small and we don't need the auto-generated client surface for adjacent APIs we don't use.

### Date window choices

- **28 days, with 2-day lag.** GSC data has a ~48 h freshness lag (their words). Asking for "yesterday" returns sparse rows. 28 days is the standard SEO trend window — long enough to smooth out daily noise, short enough to feel current.
- **Delta vs prior 28** for clicks/impressions. Position and CTR don't average meaningfully over delta windows so we just show current.

### Caching

- `revalidate = 1800` (30 min) on `/admin/seo`. GSC's free quota (1200 queries/day per project) is more than enough.
- The JWT client itself is cached in module scope across requests — first call signs the JWT, subsequent calls within the access-token TTL reuse it. `google-auth-library` handles refresh.

## Setup runbook

This is also displayed inline in `<GscEmptyState>` for non-engineering staff to follow.

1. **Create the service account** in [Google Cloud Console](https://console.cloud.google.com/) → IAM & Admin → Service Accounts → Create. No project-level roles needed (Search Console grants its own).
2. **Generate a JSON key** for the account → Keys → Add key → JSON → download.
3. **Enable the Search Console API** in the same Google Cloud project (APIs & Services → Library → "Google Search Console API" → Enable).
4. **Add the service account as a GSC user**: Search Console → biomax.nu property → Settings → Users and permissions → Add user → paste the service account email (looks like `gsc-reader@your-project.iam.gserviceaccount.com`) → permission: **Restricted user** is sufficient (read-only is what we need).
5. **Set the env vars** in production:
   ```
   GSC_SERVICE_ACCOUNT_KEY='{ "type": "service_account", "client_email": "...", "private_key": "-----BEGIN PRIVATE KEY-----\\n…", … }'
   GSC_PROPERTY=https://www.biomax.nu/
   ```
   Note: `GSC_PROPERTY` must match exactly how the property is verified — usually with trailing slash. If you used a Domain property (`sc-domain:biomax.nu`), use that string instead.
6. **Restart the app**. Within ~1 minute the /admin/seo dashboard shows real GSC tiles + the "Sökord (28 dagar)" and "Toppsidor (28 dagar)" cards.

### Verifying the connection

Hit `/admin/seo` as an admin. If GSC is connected:
- Four new top-row tiles: Klick / Visningar / Snitt-CTR / Snittposition.
- Two new cards in the grid.
- Per-product page editors get a "Sökanalys" fieldset showing top queries for that specific page.

If still showing the empty state after a restart, the most common causes (in descending frequency):
- The service account email isn't added to the GSC property → permission denied (silent — empty rows returned).
- `GSC_PROPERTY` doesn't match the verified property exactly (e.g. missing trailing slash, or mixing `https://` vs Domain property format).
- The Google Cloud project doesn't have the Search Console API enabled → 403.
- The JSON key has been escaped twice (env interpolation issue) → JSON parse fails. Wrap the value in single quotes when setting in `.env`.

## Security posture

- Read-only scope (`webmasters.readonly`). The service account literally cannot modify GSC settings.
- Key never rotates automatically. **Rotate manually every 12 months** as part of credential hygiene.
- The key is never exposed to clients — all GSC calls happen in server components / server actions.
- Don't commit the JSON key. Add to `.gitignore` if writing it to a file (we use env var instead).

## Consequences

- **Today:** Without env, dashboard shows "Anslut Google Search Console" empty state with the 4-step runbook inline. No code path errors out.
- **At launch:** drop env vars into prod, add the service account email to GSC, refresh — done.
- **Compounding:** future Stage 3 (paid SerpAPI / DataForSEO) and Stage 4 (LLM citation tracking) follow the same `lib/integrations/*` mode-boundary pattern; this ADR is the template.

## Future enhancements (not now)

- **Keyword suggestions in product editor** powered by GSC — surface real queries that landed on that page but aren't in `aiKeywords[]`. The data is right there, just needs to plug into the chip-suggestions slot.
- **Index coverage check** per page (URL inspection API) — flag products that aren't indexed.
- **Sitemap submission status** card.
- **Position-history sparkline** per page — requires storing daily snapshots since GSC API only returns aggregated data per request.
