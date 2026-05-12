/**
 * LLM citation tracker — does the model mention biomax.nu when asked one of
 * our curated prompts?
 *
 * Provider-agnostic: speaks the OpenAI Chat Completions REST shape, which
 * Anthropic, OpenAI, Mistral, Together, Groq, and self-hosted Ollama /
 * LiteLLM / vLLM all support. Pick whichever you have an API key for —
 * config flips with two env vars.
 *
 * Required env (production / cron only):
 *   LLM_API_KEY    — provider key. For Ollama use any non-empty string.
 *   LLM_BASE_URL   — e.g. "https://api.anthropic.com/v1",
 *                    "https://api.openai.com/v1",
 *                    "http://ollama.local:11434/v1"
 *   LLM_MODEL      — e.g. "claude-sonnet-4-6", "gpt-4o-mini", "llama3"
 *
 * Without any of those set, all functions no-op gracefully (mode boundary
 * matches Klarna/Brevo/GSC pattern).
 */
import { prisma } from "@/lib/prisma";
import { LLM_PROMPTS, type LlmPrompt } from "@/lib/llm/prompts";

export function isLlmConfigured(): boolean {
  return (
    !!process.env.LLM_API_KEY?.trim() &&
    !!process.env.LLM_BASE_URL?.trim() &&
    !!process.env.LLM_MODEL?.trim()
  );
}

const SYSTEM_PROMPT = [
  "Du är en assistent som hjälper användare hitta produkter i Sverige.",
  "Svara med konkreta varumärken och produkter när du kan, på svenska.",
  "Om du inte vet, säg det rakt ut hellre än att gissa.",
].join(" ");

const BIOMAX_NEEDLE = /biomax/i;
const BIOMAX_URL_NEEDLE = /biomax\.nu/i;
const EXCERPT_MAX = 600;

type ChatResponse = {
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

async function callModel(prompt: string): Promise<{
  content: string;
  promptTokens: number;
  completionTokens: number;
}> {
  if (!isLlmConfigured()) {
    throw new Error("LLM is not configured");
  }
  const baseUrl = process.env.LLM_BASE_URL!.replace(/\/$/, "");
  const apiKey = process.env.LLM_API_KEY!;
  const model = process.env.LLM_MODEL!;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      // Lower temp = more comparable across runs.
      temperature: 0.2,
      max_tokens: 800,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`LLM ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as ChatResponse;
  const content = json.choices?.[0]?.message?.content ?? "";
  return {
    content,
    promptTokens: json.usage?.prompt_tokens ?? 0,
    completionTokens: json.usage?.completion_tokens ?? 0,
  };
}

/** Run a single prompt against the configured model and persist the result. */
export async function runProbe(p: LlmPrompt): Promise<void> {
  const model = process.env.LLM_MODEL!;
  const { content, promptTokens, completionTokens } = await callModel(p.prompt);

  const cited = BIOMAX_NEEDLE.test(content);
  const linked = BIOMAX_URL_NEEDLE.test(content);
  const excerpt =
    content.length <= EXCERPT_MAX
      ? content
      : content.slice(0, EXCERPT_MAX - 1).trimEnd() + "…";

  await prisma.llmCitation.create({
    data: {
      promptId: p.id,
      promptText: p.prompt,
      model,
      cited,
      linked,
      responseExcerpt: excerpt,
      responseFull: content,
      promptTokens,
      completionTokens,
    },
  });
}

export async function runAllProbes(): Promise<{ ok: number; failed: number }> {
  let ok = 0;
  let failed = 0;
  for (const p of LLM_PROMPTS) {
    try {
      await runProbe(p);
      ok++;
    } catch (err) {
      console.error(`[llm-citation] probe ${p.id} failed:`, err);
      failed++;
    }
    // Small gap between calls — most providers tolerate higher throughput,
    // but 500 ms keeps us polite for Ollama and rate-limited tiers.
    await new Promise((r) => setTimeout(r, 500));
  }
  return { ok, failed };
}

// ── Read API for the dashboard ──────────────────────────────────────

export type LlmCitationLatest = {
  promptId: string;
  promptLabel: string;
  topic: LlmPrompt["topic"];
  model: string;
  cited: boolean;
  linked: boolean;
  responseExcerpt: string;
  runAt: Date;
};

/**
 * Latest probe result per prompt. We always show the freshest run for each
 * curated prompt — the time-series tab (future) will surface trend data.
 */
export async function getLatestCitations(): Promise<LlmCitationLatest[]> {
  // Pull the last ~60 days of probes — covers a quarterly run cadence with
  // headroom — then dedupe to the most recent per (promptId, model) in JS.
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - 60);
  const rows = await prisma.llmCitation.findMany({
    where: { runAt: { gte: cutoff } },
    orderBy: { runAt: "desc" },
    select: {
      promptId: true,
      model: true,
      cited: true,
      linked: true,
      responseExcerpt: true,
      runAt: true,
    },
  });

  const seen = new Set<string>();
  const latest: LlmCitationLatest[] = [];
  for (const r of rows) {
    const key = r.promptId + "|" + r.model;
    if (seen.has(key)) continue;
    seen.add(key);
    const meta = LLM_PROMPTS.find((p) => p.id === r.promptId);
    if (!meta) continue;
    latest.push({
      promptId: r.promptId,
      promptLabel: meta.label,
      topic: meta.topic,
      model: r.model,
      cited: r.cited,
      linked: r.linked,
      responseExcerpt: r.responseExcerpt,
      runAt: r.runAt,
    });
  }
  return latest;
}

export type LlmCitationSummary = {
  totalProbes: number;
  cited: number;
  linked: number;
  /** True when at least one probe in the registry hasn't been run yet. */
  partial: boolean;
};

export async function getCitationSummary(): Promise<LlmCitationSummary> {
  const latest = await getLatestCitations();
  return {
    totalProbes: latest.length,
    cited: latest.filter((l) => l.cited).length,
    linked: latest.filter((l) => l.linked).length,
    partial: latest.length < LLM_PROMPTS.length,
  };
}
