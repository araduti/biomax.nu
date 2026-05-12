/**
 * LLM citation probe runner.
 *
 * Loops the curated prompts in `lib/llm/prompts.ts` against the configured
 * LLM provider (Anthropic / OpenAI / Ollama / any OpenAI-compatible
 * endpoint) and persists results in `LlmCitation`.
 *
 * Usage:
 *   npx tsx scripts/run-llm-citation-checks.ts
 *
 * Cron entry on production (weekly, Sunday 02:00 server time — keeps the
 * total pile of API costs minimal while giving useful trend data):
 *
 *   0 2 * * 0 cd /srv/biomax && \
 *     LLM_API_KEY="..." \
 *     LLM_BASE_URL="https://api.anthropic.com/v1" \
 *     LLM_MODEL="claude-sonnet-4-6" \
 *     DATABASE_URL=postgresql://... \
 *     npx tsx scripts/run-llm-citation-checks.ts \
 *     >> /var/log/biomax-llm-citation.log 2>&1
 *
 * Cost ballpark: 10 prompts × ~800 output tokens ≈ 8 k tokens. At Anthropic
 * Sonnet pricing that's roughly 3 cents per run. Weekly = ~1.50 EUR/year.
 *
 * Exit codes:
 *   0  success (or LLM not configured — script logs and exits clean)
 *   1  unexpected error
 *   2  partial failure (some probes failed; check logs)
 */
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import {
  runAllProbes,
  isLlmConfigured,
} from "@/lib/integrations/llm-citation";

async function main() {
  if (!isLlmConfigured()) {
    console.log(
      "[llm-citation] LLM ej konfigurerad — sätt LLM_API_KEY, LLM_BASE_URL och LLM_MODEL. Avbryter (0)."
    );
    return;
  }

  console.log(
    `[llm-citation] Kör mot ${process.env.LLM_MODEL} via ${process.env.LLM_BASE_URL}…`
  );
  const t0 = Date.now();
  const result = await runAllProbes();
  const elapsed = Math.round((Date.now() - t0) / 1000);

  console.log(
    `[llm-citation] Klar på ${elapsed}s — ${result.ok} OK, ${result.failed} misslyckades.`
  );

  if (result.failed > 0) {
    process.exit(2);
  }
}

main()
  .catch((err) => {
    console.error("[llm-citation] FEL:", err);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("@/lib/prisma");
    await prisma.$disconnect();
  });
