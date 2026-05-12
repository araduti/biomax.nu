# ADR 0012 — Swedish Institutional Citations for Ingredient Monographs

**Date:** 2026-05-10
**Status:** Deferred — pending editorial verification of Swedish-source URLs
**Related:** ADR 0005 (SEO & AI SEO), ADR 0011 (Monograph Trust Signals)

## Context

The ingredient kunskapsbank ([`lib/knowledge/ingredients.ts`](../../lib/knowledge/ingredients.ts)) currently includes curated references for 15 of 29 monographs. The references are weighted toward **US institutions** — NIH Office of Dietary Supplements fact sheets and NCCIH for botanicals — because those organisations publish at predictable, verifiable URLs.

biomax.nu is, by deliberate decision (memory: `project_swedish_only`), a **Swedish-only commercial surface**: sv-SE language, Swedish-only shipping, no English locale, no internationalisation. Citing American regulatory bodies for a Swedish audience is not technically wrong — the underlying nutrition science is universal — but it is **off-brand on two levels**:

1. **Authority signal for Swedish readers.** A reader landing on a koenzym-Q10 monograph is more likely to recognise and trust *Livsmedelsverket* than the *NIH Office of Dietary Supplements*. Borrowed authority from a US agency carries less weight than primary authority from a Swedish one.
2. **Local-search signal for AI/Google.** A Swedish-only site whose citations all point to American agencies is doing the *opposite* of what local SEO and locale-specific LLM ranking want. Swedish institutional links reinforce that this is a Swedish source for Swedish consumers.

## Decision

Migrate the curated references on the ingredient monographs from US institutions to **Swedish-first sources**, in this priority order:

| Priority | Source | Best for | URL pattern |
|---|---|---|---|
| 1 | **Livsmedelsverket** | Vitaminer, mineraler, kosttillskottsregler | `livsmedelsverket.se/livsmedel-och-innehall/naringsamne/...` |
| 2 | **Läkemedelsverket** | Naturläkemedel, traditionella herbala medel | `lakemedelsverket.se/sv/...` |
| 3 | **EFSA** (EU-level) | Tillsatser, hälsopåståenden, scientific opinions | `efsa.europa.eu/en/efsajournal/pub/...` |
| 4 | **1177 Vårdguiden** | Konsumentvänlig hälsoinformation | `1177.se/...` |
| 5 | **Svenska Wikipedia** | Encyklopedisk fallback | `sv.wikipedia.org/wiki/...` |
| — | NIH ODS / NCCIH | Avoid — US-centric | — |
| — | English Wikipedia | Avoid — wrong locale | — |

Specific PubMed studies (`kind: "pubmed" | "review"`) **stay** when present. PubMed is global scientific authority, locale-agnostic, and citing primary research is independent of the brand-locale concern. The migration only affects the `kind: "web"` regulatory/encyclopedic references.

## Why we defer execution

This work needs **browser-side URL verification**. Swedish institutional sites do not follow as predictable a URL pattern as NIH ODS (`/factsheets/[Title]-HealthProfessional/`). Livsmedelsverket and Läkemedelsverket sub-paths vary by topic, language redirects, and have changed in past CMS migrations. Submitting URLs without manual verification would risk shipping broken citation links — worse than the current state.

The current state (NIH ODS + NCCIH) is **valid science with stable URLs**, just suboptimal for the brand. It does not bleed authority — it just doesn't add as much as Swedish sources would.

## Migration plan (when reactivated)

1. **Per-ingredient URL list** — for each of the 15 ingredients with current refs, identify the equivalent Livsmedelsverket / Läkemedelsverket / EFSA / 1177 page. Likely outcome: 8 vitamins/minerals → Livsmedelsverket; some botanicals (boswellia, olivblad) → Läkemedelsverket; specialty items (Lactium, Beta-glucan) → EFSA opinions or stay on PubMed alone.
2. **Replace `kind: "web"` entries** in [`lib/knowledge/ingredients.ts`](../../lib/knowledge/ingredients.ts). The `definedTermLd()` JSON-LD pickup handles any `kind` already; rendering picks up automatically via `ReferenceBadge` (the badge labels — "Studie" / "Översikt" / "Bok" / "Webb" — work for Swedish sources unchanged).
3. **Optional: per-source `cite` line update** — match the new source style ("Livsmedelsverket — Näringsämnen" instead of "NIH Office of Dietary Supplements").
4. **Verify each URL resolves** before merging.

## Open question (decide on reactivation)

Should we **keep** the NIH ODS reference as a secondary `kind: "web"` entry under the Swedish primary, or **fully replace**? Arguments both ways:

- **Keep both:** more total citations is more LLM authority signal; the underlying science is still valid; a curious reader gets two perspectives.
- **Fully replace:** cleaner brand signal; avoids "Swedish brand cites mostly American sources" appearance even with Swedish sources prepended; simpler maintenance.

Recommend **fully replace** unless an editorial reason emerges to keep both. The Källor block is for trust signal, not exhaustive sourcing.

## Consequences

- **Today:** Citations are valid but slightly off-locale. Acceptable interim — the existence and structure of the references is the load-bearing part for SEO/LLM ranking; the institution name is a trust polish on top of that.
- **When implemented:** Editorial work, no schema changes, no rendering changes. Pure data migration in [`lib/knowledge/ingredients.ts`](../../lib/knowledge/ingredients.ts).
- **Compounding benefit:** Once we have a verified Swedish-source URL pattern documented per category (vitamin → Livsmedelsverket, naturläkemedel → Läkemedelsverket, etc.), adding the *remaining* 14 unlinked monographs (per ADR 0011) becomes much faster, since the source is already chosen.
