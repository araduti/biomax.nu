"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Display, Eyebrow, Accent } from "@/components/ui/typography";
import { ButtonLink } from "@/components/ui/button";
import { QUIZ, computeQuizResult } from "@/lib/quiz/registry";
import { AddBundleButton } from "@/components/cart/add-bundle-button";
import { formatPriceSEK } from "@/lib/format";
import type { BundleSummary } from "@/lib/bundles/queries";
import type { SymptomEntry } from "@/lib/symptoms/registry";

/**
 * Pick the best-matching bundle for a symptom result by counting how
 * many of the symptom's curated products show up in the bundle's items.
 * Returns the bundle with the highest overlap; ties broken by curated
 * order. Null when no bundle shares any product with the symptom — the
 * Result falls back to the symptom-page link in that case.
 */
function pickBundleForSymptom(
  symptom: SymptomEntry,
  bundles: BundleSummary[]
): BundleSummary | null {
  if (symptom.productSlugs.length === 0 || bundles.length === 0) return null;
  const wanted = new Set(symptom.productSlugs);
  let best: { bundle: BundleSummary; overlap: number } | null = null;
  for (const b of bundles) {
    const overlap = b.items.filter((it) => wanted.has(it.slug)).length;
    if (overlap === 0) continue;
    if (!best || overlap > best.overlap) {
      best = { bundle: b, overlap };
    }
  }
  return best?.bundle ?? null;
}

/**
 * Client-driven 4-question quiz. State stays in memory — no DB write
 * unless the user opts into the newsletter at the end. Each question is
 * a card; we step forward as soon as an option is picked (no "next"-knapp).
 *
 * Bundles are pre-fetched server-side and passed in so the Result can
 * recommend a matching paket as primary CTA (Holistic pattern from the
 * 2026 category research).
 */
export function QuizFlow({ bundles = [] }: { bundles?: BundleSummary[] }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  if (step >= QUIZ.length) {
    return (
      <Result
        answers={answers}
        bundles={bundles}
        onRestart={() => {
          setStep(0);
          setAnswers({});
        }}
      />
    );
  }

  const q = QUIZ[step];

  function answer(optionId: string) {
    const next = { ...answers, [q.id]: optionId };
    setAnswers(next);
    setStep((s) => s + 1);
  }

  return (
    <div>
      <Eyebrow className="mb-3">
        Fråga {step + 1} av {QUIZ.length}
      </Eyebrow>
      <Display as="h1" size="lg" className="mb-4">
        {q.prompt}
      </Display>
      {q.description && (
        <p className="font-sans text-[14px] text-ink-mute mb-6 leading-relaxed">
          {q.description}
        </p>
      )}

      <ul className="space-y-2.5">
        {q.options.map((o) => (
          <li key={o.id}>
            <button
              type="button"
              onClick={() => answer(o.id)}
              className="w-full text-left rounded-xl border border-border bg-surface px-5 py-4 hover:border-accent-deep hover:bg-surface-warm transition-colors"
            >
              <span className="font-display text-[17px] text-primary-deep tracking-tight">
                {o.label}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {step > 0 && (
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="mt-8 font-sans text-[13px] text-ink-soft underline decoration-accent/30 underline-offset-[3px] hover:text-primary-deep"
        >
          ← Föregående fråga
        </button>
      )}
    </div>
  );
}

function Result({
  answers,
  bundles,
  onRestart,
}: {
  answers: Record<string, string>;
  bundles: BundleSummary[];
  onRestart: () => void;
}) {
  const result = computeQuizResult(answers);

  if (!result) {
    return (
      <div>
        <Display as="h1" size="lg" className="mb-4">
          Inget tydligt resultat
        </Display>
        <p className="font-sans text-base text-ink-mute leading-relaxed mb-6">
          Vi kan inte säga något bestämt utifrån svaren. Bläddra gärna i{" "}
          <Link
            href="/hjalp"
            className="text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent"
          >
            alla våra guider
          </Link>{" "}
          eller börja om.
        </p>
        <button
          type="button"
          onClick={onRestart}
          className="font-sans text-[13px] text-primary-deep underline decoration-accent/30 underline-offset-[3px] hover:decoration-accent"
        >
          Börja om quizen
        </button>
      </div>
    );
  }

  const sym = result.primarySymptom;
  const secondary = result.ranking.slice(1, 3);
  const matchedBundle = pickBundleForSymptom(sym, bundles);

  return (
    <div>
      <Eyebrow className="mb-3">Vi föreslår</Eyebrow>
      <Display as="h1" size="xl" className="mb-4">
        {sym.title.split(" — ")[0]} <Accent>är där du börjar</Accent>
      </Display>
      <p className="font-sans text-base md:text-lg text-ink-body leading-relaxed mb-8 max-w-[560px]">
        {sym.summary}
      </p>

      {result.onMedication && (
        <div className="mb-8 rounded-xl border border-status-warn/40 bg-status-warn/8 px-5 py-4">
          <p className="font-sans text-[13.5px] text-ink-body leading-relaxed">
            <strong className="font-semibold">Viktigt:</strong> du angav att
            du tar receptbelagda läkemedel. Vissa kosttillskott kan
            interagera — prata med läkare eller apotekspersonal innan du
            börjar med något nytt.
          </p>
        </div>
      )}

      {matchedBundle && (
        <div className="mb-8 rounded-2xl bg-accent/[0.08] border border-accent/25 p-5 md:p-6">
          <p className="font-sans text-[11px] uppercase tracking-[0.18em] font-semibold text-accent-deep mb-2">
            Vår rekommendation
          </p>
          <div className="flex items-start gap-5 flex-wrap md:flex-nowrap">
            <div className="grid grid-cols-3 gap-2 w-[180px] flex-shrink-0">
              {matchedBundle.items.slice(0, 3).map((it) => (
                <div
                  key={it.slug}
                  className="aspect-square rounded-lg overflow-hidden bg-surface relative"
                >
                  <Image
                    src={it.imageUrl}
                    alt={it.name}
                    fill
                    sizes="60px"
                    className="object-contain mix-blend-darken p-2"
                  />
                </div>
              ))}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-xl md:text-2xl font-medium tracking-tight text-primary-deep">
                {matchedBundle.name}
              </p>
              {matchedBundle.description && (
                <p className="mt-1.5 font-sans text-[13.5px] text-ink-mute leading-relaxed">
                  {matchedBundle.description}
                </p>
              )}
              <div className="mt-3 flex items-baseline gap-3">
                <span className="font-display text-2xl font-medium text-primary-deep tabular-nums">
                  {formatPriceSEK(matchedBundle.bundlePriceSek.toString())}
                </span>
                {matchedBundle.savingsSek > 0 && (
                  <span className="font-sans text-[13px] text-ink-soft line-through tabular-nums">
                    {formatPriceSEK(matchedBundle.listTotalSek.toString())}
                  </span>
                )}
              </div>
              {matchedBundle.savingsSek > 0 && (
                <p className="mt-1 font-sans text-[12px] text-accent-deep font-semibold">
                  Du sparar {formatPriceSEK(matchedBundle.savingsSek.toString())}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-3">
                <AddBundleButton
                  bundle={{
                    id: matchedBundle.id,
                    slug: matchedBundle.slug,
                    name: matchedBundle.name,
                    discountPercent: matchedBundle.discountPercent,
                    items: matchedBundle.items.map((it) => ({
                      productId: it.productId,
                      slug: it.slug,
                      name: it.name,
                      imageUrl: it.imageUrl,
                      price: it.listPriceSek.toString(),
                    })),
                  }}
                />
                <Link
                  href={`/paket/${matchedBundle.slug}`}
                  className="self-center font-sans text-[13px] text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent"
                >
                  Mer om paketet →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <ButtonLink
          href={`/hjalp/${sym.slug}`}
          variant={matchedBundle ? "outline" : "primary"}
          size="md"
        >
          Läs hela guiden →
        </ButtonLink>
        <ButtonLink href="/produkter" variant="outline" size="md">
          Bläddra i sortimentet
        </ButtonLink>
      </div>

      {secondary.length > 0 && (
        <div className="mt-12 pt-8 border-t border-border-soft">
          <p className="font-sans text-[11px] uppercase tracking-[0.22em] font-semibold text-ink-soft mb-4">
            Också relevant
          </p>
          <ul className="space-y-2">
            {secondary.map((r) => (
              <li key={r.symptom.slug}>
                <Link
                  href={`/hjalp/${r.symptom.slug}`}
                  className="font-display text-lg text-primary-deep tracking-tight underline decoration-accent/30 underline-offset-[3px] hover:decoration-accent"
                >
                  {r.symptom.title.split(" — ")[0]} →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={onRestart}
        className="mt-10 font-sans text-[13px] text-ink-soft underline decoration-accent/30 underline-offset-[3px] hover:text-primary-deep"
      >
        Gör om quizen
      </button>
    </div>
  );
}
