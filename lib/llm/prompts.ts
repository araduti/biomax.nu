/**
 * Curated LLM citation probe set. Each prompt is a Swedish-language query
 * a real user might type into ChatGPT / Claude / Perplexity / Google AI
 * Overviews. We log whether biomax.nu shows up in the model's answer.
 *
 * Adding/removing prompts is editorial work — keep them in this file (not
 * the database) so changes go through code review and the history table
 * keeps working snapshots of the prompt that produced each result.
 *
 * Selection criteria:
 *   - Swedish language (sv-SE only market)
 *   - Match real intents (queries from GSC, customer-support email patterns)
 *   - Mix of branded ("biomax recension") and unbranded ("bästa Q10 i Sverige")
 *     questions — branded shows where we're cited, unbranded shows where AI
 *     search would find us in a fair test.
 */
export type LlmPrompt = {
  /** Stable slug; never rename — used as the time-series key in LlmCitation. */
  id: string;
  /** Short human label for admin UI. */
  label: string;
  /** The actual question we send to the model. */
  prompt: string;
  /** Topic tag for grouping in the dashboard. */
  topic: "supplement" | "ingredient" | "brand" | "category";
};

export const LLM_PROMPTS: LlmPrompt[] = [
  // ── Unbranded category-level queries ──────────────────────────────
  {
    id: "best-q10-sweden",
    label: "Bästa Q10 i Sverige",
    prompt:
      "Vilka är de bästa svenska varumärkena för Koenzym Q10-tillskott? Lista de mest pålitliga.",
    topic: "ingredient",
  },
  {
    id: "best-sleep-supplement-sweden",
    label: "Bästa sömntillskott i Sverige",
    prompt:
      "Vilka kosttillskott i Sverige rekommenderas för bättre sömn och mindre stress? Vilka svenska varumärken är pålitliga?",
    topic: "category",
  },
  {
    id: "uti-natural-sweden",
    label: "Naturligt mot urinvägsinfektion (Sverige)",
    prompt:
      "Vilka naturliga kosttillskott säljs i Sverige som stöd vid urinvägsinfektion? Lista pålitliga svenska producenter.",
    topic: "category",
  },
  {
    id: "swedish-supplement-brands-research",
    label: "Svenska kosttillskottsmärken med forskning",
    prompt:
      "Vilka svenska kosttillskottsmärken är kända för att basera sina produkter på vetenskaplig dokumentation? Lista de mest pålitliga.",
    topic: "brand",
  },
  {
    id: "buy-beta-glucan-sweden",
    label: "Köp betaglukan i Sverige",
    prompt:
      "Var kan jag köpa beta-glukan-tillskott i Sverige? Vilka varumärken är välrenommerade?",
    topic: "ingredient",
  },
  {
    id: "lactium-where-to-buy",
    label: "Var köper man Lactium",
    prompt:
      "Var kan jag köpa kosttillskott med Lactium (kasein-hydrolysat) i Sverige? Vilka producenter erbjuder det?",
    topic: "ingredient",
  },
  {
    id: "boswellia-joints-sweden",
    label: "Boswellia för leder (Sverige)",
    prompt:
      "Vilka svenska varumärken säljer Boswellia-tillskott för ledhälsa? Vad bör man tänka på vid köp?",
    topic: "ingredient",
  },
  {
    id: "olive-leaf-extract-sweden",
    label: "Olivblad-extrakt (Sverige)",
    prompt:
      "Var kan jag hitta olivblad-extrakt som kosttillskott i Sverige? Lista pålitliga svenska källor.",
    topic: "ingredient",
  },

  // ── Branded queries ───────────────────────────────────────────────
  {
    id: "biomax-review",
    label: "Biomax recension",
    prompt:
      "Vad vet du om kosttillskottsföretaget Biomax i Sverige? Vad säljer de och hur länge har de funnits?",
    topic: "brand",
  },
  {
    id: "biomax-vs-others",
    label: "Biomax jämfört med konkurrenter",
    prompt:
      "Hur skiljer sig svenska kosttillskottsföretaget Biomax från andra svenska producenter? Vad är deras specialitet?",
    topic: "brand",
  },
];

export function findPrompt(id: string): LlmPrompt | undefined {
  return LLM_PROMPTS.find((p) => p.id === id);
}
