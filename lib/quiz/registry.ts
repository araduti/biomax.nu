/**
 * "Hjälp mig välja"-quiz — 4 questions that map to a recommended cluster
 * of product slugs and a primary "/hjalp/[slug]" guide. Pure code-driven
 * for v1; promotes to DB-backed when marketing wants per-campaign variants.
 *
 * Recommendation logic is intentionally simple: each answer carries a
 * weight against the symptom slugs. We sum weights and return the top
 * symptom + that symptom page's curated product list.
 */

import { getSymptom, type SymptomEntry } from "@/lib/symptoms/registry";

export type QuizOption = {
  /** Stable answer ID — used in URL state and analytics. */
  id: string;
  /** Display label in Swedish. */
  label: string;
  /** Weight per symptom slug. Higher → stronger match. */
  weights: Record<string, number>;
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  description?: string;
  options: QuizOption[];
};

export const QUIZ: QuizQuestion[] = [
  {
    id: "goal",
    prompt: "Vad letar du efter just nu?",
    description: "Välj det som ligger närmast — du kommer förfina svaret med nästa fråga.",
    options: [
      {
        id: "sleep",
        label: "Bättre sömn",
        weights: { somnproblem: 3, "oro-och-stress": 1 },
      },
      {
        id: "calm",
        label: "Lugnare nervsystem",
        weights: { "oro-och-stress": 3, somnproblem: 1 },
      },
      {
        id: "energy",
        label: "Mer energi",
        weights: { "energi-och-trotthet": 3, "hjarna-och-minne": 1 },
      },
      {
        id: "mind",
        label: "Klarare tanke och minne",
        weights: { "hjarna-och-minne": 3, "energi-och-trotthet": 1 },
      },
      {
        id: "joints",
        label: "Rörlighet och leder",
        weights: { "leder-och-rorlighet": 3 },
      },
      {
        id: "stomach",
        label: "Magen behöver hjälp",
        weights: { "mage-och-tarm": 3 },
      },
      {
        id: "immune",
        label: "Immunförsvar inför säsongen",
        weights: { immunforsvar: 3 },
      },
      {
        id: "uvi",
        label: "Urinvägar",
        weights: { urinvagar: 3 },
      },
      {
        id: "heart",
        label: "Hjärta och blodkärl",
        weights: { "hjarta-och-blodkarl": 3, antioxidanter: 1 },
      },
      {
        id: "aging",
        label: "Antioxidanter och åldrande",
        weights: { "antioxidanter-och-aldrande": 3, "hjarta-och-blodkarl": 1 },
      },
    ],
  },
  {
    id: "timeframe",
    prompt: "Hur ser tidsperspektivet ut?",
    options: [
      {
        id: "now",
        label: "Akut — pågår just nu",
        weights: { "oro-och-stress": 1, somnproblem: 1, "mage-och-tarm": 1, urinvagar: 1 },
      },
      {
        id: "weeks",
        label: "Vågor — kommer och går",
        weights: { somnproblem: 1, "oro-och-stress": 1, immunforsvar: 1 },
      },
      {
        id: "longterm",
        label: "Långsiktigt — vill bygga upp",
        weights: {
          "antioxidanter-och-aldrande": 2,
          "hjarta-och-blodkarl": 1,
          "leder-och-rorlighet": 1,
          "hjarna-och-minne": 1,
        },
      },
    ],
  },
  {
    id: "age",
    prompt: "Vilken åldersgrupp passar bäst?",
    options: [
      {
        id: "young",
        label: "Under 35",
        weights: { "energi-och-trotthet": 1, immunforsvar: 1, "mage-och-tarm": 1 },
      },
      {
        id: "mid",
        label: "35–55",
        weights: {
          "energi-och-trotthet": 1,
          "hjarta-och-blodkarl": 1,
          "antioxidanter-och-aldrande": 1,
          somnproblem: 1,
        },
      },
      {
        id: "senior",
        label: "Över 55",
        weights: {
          "leder-och-rorlighet": 2,
          "hjarna-och-minne": 1,
          "hjarta-och-blodkarl": 1,
          "antioxidanter-och-aldrande": 1,
        },
      },
    ],
  },
  {
    id: "medication",
    prompt: "Tar du regelbundet receptbelagda läkemedel?",
    description: "Vi ger ingen medicinsk rådgivning — men en del kosttillskott bör inte kombineras med vissa läkemedel.",
    options: [
      {
        id: "no",
        label: "Nej",
        weights: {},
      },
      {
        id: "yes",
        label: "Ja",
        // No weight shift, but the result template will flag relevant warnings.
        weights: {},
      },
    ],
  },
];

export type QuizResult = {
  primarySymptom: SymptomEntry;
  /** All symptom matches with non-zero score, sorted descending. */
  ranking: { symptom: SymptomEntry; score: number }[];
  /** True when the user reported regular medication — used to add the warning. */
  onMedication: boolean;
};

/**
 * Compute the result for a set of answers. Answers come in as
 * `{ questionId: optionId }`. Returns the top-scoring symptom plus
 * the full ranking for context.
 */
export function computeQuizResult(
  answers: Record<string, string>
): QuizResult | null {
  const scores: Record<string, number> = {};
  for (const q of QUIZ) {
    const answerId = answers[q.id];
    if (!answerId) continue;
    const option = q.options.find((o) => o.id === answerId);
    if (!option) continue;
    for (const [slug, w] of Object.entries(option.weights)) {
      scores[slug] = (scores[slug] ?? 0) + w;
    }
  }

  const ranked = Object.entries(scores)
    .map(([slug, score]) => ({ symptom: getSymptom(slug), score }))
    .filter(
      (r): r is { symptom: SymptomEntry; score: number } => r.symptom !== null
    )
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) return null;
  return {
    primarySymptom: ranked[0].symptom,
    ranking: ranked,
    onMedication: answers["medication"] === "yes",
  };
}
