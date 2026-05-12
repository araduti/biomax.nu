# ADR 0015 — LLM Citation Tracker (Provider-Agnostic)

**Date:** 2026-05-10
**Status:** Accepted (scaffold) · Pending production credentials
**Related:** ADR 0005 (SEO & AI SEO), ADR 0014 (GSC integration)

## Context

Google's classic search remains a major traffic source, but LLM-mediated answers (ChatGPT, Claude, Perplexity, Google AI Overviews) are an increasingly important — and largely **invisible** — distribution surface. Unlike Google, LLMs don't expose impression/click data: when ChatGPT answers a Swedish user's question without sending them anywhere, we have no signal it happened.

The compensating move is to **probe the answer surface ourselves**. Pick a curated set of Swedish queries a real customer might type, run them against the same models the public uses, and log whether biomax.nu appears in the answer. Track the trend over time.

This is plain-old E-E-A-T measurement adapted for the AI-search era. No third-party SaaS pays for this — the build is small, the data is ours, and the costs are pennies.

## Decision

### Provider-agnostic via the OpenAI Chat Completions REST shape

Most LLM endpoints — Anthropic, OpenAI, Mistral, Together, Groq, Ollama, LiteLLM, vLLM — accept the same request shape:

```
POST {base}/chat/completions
{
  "model": "...",
  "messages": [{"role": "user", "content": "..."}]
}
```

[`lib/integrations/llm-citation.ts`](../../lib/integrations/llm-citation.ts) speaks that shape via plain `fetch` (no SDK lock-in). Three env vars flip provider:

```
LLM_API_KEY    # provider key (any non-empty value for Ollama)
LLM_BASE_URL   # e.g. https://api.anthropic.com/v1 | https://api.openai.com/v1 | http://ollama.local:11434/v1
LLM_MODEL      # e.g. claude-sonnet-4-6 | gpt-4o-mini | llama3
```

### Curated prompt registry, not user-editable

[`lib/llm/prompts.ts`](../../lib/llm/prompts.ts) holds the probe set in code, not the database. Reasons:

- Editorial oversight: changing what we measure should go through code review, not an admin tool.
- The history table denormalises `promptText` per row, so historical results survive prompt edits.
- Prompts double as documentation of "what intents we believe matter".

Today's set covers branded queries ("Biomax recension"), unbranded category queries ("bästa Q10 i Sverige"), and ingredient-level queries ("Var köper man Lactium"). Adjust by editing the file.

### Persisted history, not on-demand calls

`LlmCitation` is append-only. Each cron run creates a row per (prompt, model). The dashboard reads "latest per prompt" but the full series is preserved for trend lines later.

We deliberately don't call the LLM at admin page-load time:

- Cost adds up fast across 50+ admin loads/day per editor.
- Latency on Anthropic/OpenAI is 2–10s per call.
- Variance: same prompt at 2 PM and 4 PM can return different answers; daily probe smooths that.

### Detection logic

Two booleans per probe:

- **`cited`** — `/biomax/i.test(response)` — was the brand mentioned at all?
- **`linked`** — `/biomax\.nu/i.test(response)` — did the model emit our domain (a stronger signal of canonical authority)?

Substring matching is intentional. Fancier NER would catch "biomax är ett varumärke" vs "BiomaX i Texas" but the false-positive rate at small scale doesn't justify the complexity. Editorial review of the response excerpt catches the rare miscategorisation.

### Cost ballpark

10 prompts × ~800 output tokens each ≈ 8 000 tokens per run. Pricing (May 2026):

| Provider | Cost per run |
|---|---|
| Anthropic Sonnet | ~3 cents |
| OpenAI gpt-4o-mini | ~1 cent |
| Self-hosted Ollama | 0 |

Weekly cron = ~1.50 EUR/year against Anthropic Sonnet, free against Ollama. Fits the "no paid tools" framing comfortably.

### Cron cadence

Weekly (Sunday 02:00). LLM ranking shifts month-to-month, not day-to-day. Daily would burn money for noise; weekly captures meaningful drift.

```
0 2 * * 0 cd /srv/biomax && \
  LLM_API_KEY="..." \
  LLM_BASE_URL="https://api.anthropic.com/v1" \
  LLM_MODEL="claude-sonnet-4-6" \
  DATABASE_URL=postgresql://... \
  npx tsx scripts/run-llm-citation-checks.ts \
  >> /var/log/biomax-llm-citation.log 2>&1
```

### Multi-model future

Schema supports it natively — `LlmCitation.model` is a free string and the index covers `(promptId, model, runAt)`. To start measuring against both Claude and Ollama in parallel, run the cron twice with different env. The dashboard groups latest-per-(prompt, model) so multiple models render side-by-side automatically.

## Security & operational posture

- **API key handling**: env var only, never logged or shipped to the client. The library reads `process.env.LLM_API_KEY` server-side at call time.
- **Response storage**: `responseFull` is stored in plaintext in Postgres. Acceptable because the responses are non-PII (about supplements and brands), but worth noting if the prompt set ever evolves to include user data.
- **Rate limiting**: 500 ms gap between probes. Anthropic/OpenAI tolerate higher; Ollama and rate-limited tiers don't. Conservative default.

## Consequences

- **Today:** Without env vars, dashboard shows the "Inte konfigurerat" empty state with the env-var checklist. No code path errors.
- **At launch:** Drop env vars in, run `npx tsx scripts/run-llm-citation-checks.ts` once manually, schedule the weekly cron. First useful trend data in ~3 weeks.
- **Editorial workflow**: Every quarter, review the latest excerpts in `/admin/seo`. When competitors get cited but we don't, that's the editorial brief — usually a content gap on a specific ingredient or category.

## Future enhancements (not now)

- **Trend sparklines per prompt** — once we have ≥4 weekly runs, render a tiny line per prompt showing cited/linked over time. Same component pattern as the GSC sparklines.
- **Multi-model side-by-side** — run nightly against Claude + Ollama; show two columns per prompt.
- **Auto-generated prompts from GSC queries** — pipe top GSC queries into the prompt registry as candidates ("you rank #4 on Google for X — does ChatGPT mention you?").
- **Sentiment** — when we are cited, is the framing positive/neutral/negative? Adds a third boolean per row.
- **Brand competitor probes** — same prompts but log mentions of a watch-list of competitor brands too. Reveals share-of-voice in AI search.
