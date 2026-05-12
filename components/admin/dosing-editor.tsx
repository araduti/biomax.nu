"use client";

import { useMemo } from "react";
import {
  type Dose,
  type DayPhase,
  type DoseTimingTone,
  DAY_PHASES,
  PHASE_LABEL,
  EMPTY_DOSE,
  doseHasSignal,
  getEffectiveDose,
} from "@/lib/products/dose";

const TIMING_OPTIONS: { value: DoseTimingTone | ""; label: string; chip: string | null }[] = [
  { value: "", label: "Ingen tidssignal", chip: null },
  { value: "with", label: "Med måltid", chip: "Med måltid" },
  { value: "before", label: "Före mat", chip: "Före mat" },
  { value: "neutral", label: "Tom mage", chip: "Tom mage" },
];

/**
 * Editorial editor for the dosing chips + day-phase timeline.
 *
 * Two modes:
 *   • **Auto** (default) — the public page parses `usage` free-text into chips
 *     and a timeline. The editor shows what the parser would produce and a
 *     "Använd som utgångspunkt" button to copy that into a manual override.
 *   • **Manual** — explicit values for amount / frequency / timing / schedule.
 *     A live preview shows exactly how the public card will render.
 *
 * Toggling between modes is a single click: "Återgå till autotolkning" clears
 * the manual override and restores parsing.
 */
export function DosingEditor({
  value,
  onChange,
  /** Used as the input to the auto-parser preview. */
  usageText,
}: {
  value: Dose | null;
  onChange: (next: Dose | null) => void;
  usageText: string;
}) {
  // What the parser would render if `value` were null.
  const autoEffective = useMemo(
    () => getEffectiveDose({ dosing: null, usage: usageText }),
    [usageText]
  );

  const isManual = value !== null;
  const effective = isManual ? value : autoEffective;

  function setField<K extends keyof Dose>(key: K, v: Dose[K]) {
    const base = isManual ? value : { ...autoEffective };
    onChange({ ...base, [key]: v });
  }

  function togglePhase(p: DayPhase, on: boolean) {
    const base = isManual ? value : { ...autoEffective };
    const next = on
      ? [...new Set([...base.schedule, p])]
      : base.schedule.filter((x) => x !== p);
    onChange({ ...base, schedule: next });
  }

  function activateManual() {
    onChange({ ...autoEffective });
  }

  function clearManual() {
    onChange(null);
  }

  return (
    <div className="space-y-4">
      {/* Mode banner */}
      <div
        className={
          isManual
            ? "rounded-xl border border-accent/30 bg-accent/[0.06] px-4 py-3 flex items-baseline justify-between gap-3 flex-wrap"
            : "rounded-xl border border-dashed border-border bg-surface-warm/40 px-4 py-3 flex items-baseline justify-between gap-3 flex-wrap"
        }
      >
        <p className="font-sans text-[13px] text-ink-body leading-relaxed">
          {isManual ? (
            <>
              <strong className="font-semibold text-accent-deep">
                Manuell dosering
              </strong>{" "}
              · värdena nedan visas exakt så på produktsidan.
            </>
          ) : (
            <>
              <strong className="font-semibold">Autotolkning</strong> · publika
              sidan analyserar fritexten i Dosering-fältet och bygger chips
              och tidsaxel automatiskt.
            </>
          )}
        </p>
        <button
          type="button"
          onClick={isManual ? clearManual : activateManual}
          className="font-sans text-[12.5px] font-semibold text-accent-deep hover:text-primary-deep border-b border-accent/40 pb-px transition-colors"
        >
          {isManual ? "Återgå till autotolkning" : "Ta manuell kontroll →"}
        </button>
      </div>

      {/* Editable fields when in manual mode */}
      {isManual && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Mängd per dos">
            <input
              type="text"
              value={effective.amount ?? ""}
              onChange={(e) => setField("amount", e.target.value || null)}
              placeholder="t.ex. 1 kapsel"
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface-alt font-sans text-[13.5px] text-ink-body outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </Field>
          <Field label="Frekvens">
            <input
              type="text"
              value={effective.frequency ?? ""}
              onChange={(e) => setField("frequency", e.target.value || null)}
              placeholder="t.ex. 1×/dag eller 1-2×/dag"
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface-alt font-sans text-[13.5px] text-ink-body outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </Field>
          <Field label="Tidssignal">
            <select
              value={effective.timing?.tone ?? ""}
              onChange={(e) => {
                const tone = e.target.value;
                if (!tone) return setField("timing", null);
                const opt = TIMING_OPTIONS.find((t) => t.value === tone);
                if (!opt || !opt.chip) return setField("timing", null);
                setField("timing", {
                  label: opt.chip,
                  tone: tone as DoseTimingTone,
                });
              }}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface-alt font-sans text-[13.5px] text-ink-body outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            >
              {TIMING_OPTIONS.map((o) => (
                <option key={o.value || "none"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}

      {isManual && (
        <div>
          <p className="font-sans text-[11px] uppercase tracking-[0.2em] font-semibold text-ink-mute mb-2">
            Tidsaxel — när doseras
          </p>
          <div className="grid grid-cols-4 gap-2">
            {DAY_PHASES.map((p) => {
              const checked = effective.schedule.includes(p);
              return (
                <label
                  key={p}
                  className={
                    checked
                      ? "cursor-pointer rounded-lg border border-accent bg-accent/10 px-3 py-2.5 text-center transition-colors"
                      : "cursor-pointer rounded-lg border border-border bg-surface-alt px-3 py-2.5 text-center hover:border-accent/40 transition-colors"
                  }
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => togglePhase(p, e.target.checked)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden
                    className={
                      checked
                        ? "block w-2.5 h-2.5 mx-auto rounded-full bg-accent-deep mb-1"
                        : "block w-2.5 h-2.5 mx-auto rounded-full border border-ink-soft mb-1"
                    }
                  />
                  <span
                    className={
                      checked
                        ? "block font-sans text-[11px] uppercase tracking-[0.14em] font-semibold text-accent-deep"
                        : "block font-sans text-[11px] uppercase tracking-[0.14em] font-semibold text-ink-soft"
                    }
                  >
                    {PHASE_LABEL[p]}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Preview — always visible. Shows exactly what the public card will render. */}
      <div>
        <p className="font-sans text-[10.5px] uppercase tracking-[0.2em] font-semibold text-ink-soft mb-2">
          Förhandsvisning
        </p>
        <PreviewCard dose={effective} />
        {!isManual && !doseHasSignal(autoEffective) && (
          <p className="mt-2 font-sans text-[12px] text-ink-mute italic">
            Autotolkningen kunde inte hitta tillräcklig signal i fritexten —
            chip- och tidsaxelblocket visas inte publikt. Ta manuell kontroll
            för att fylla i.
          </p>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block font-sans text-[11px] uppercase tracking-[0.2em] font-semibold text-ink-mute mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}

function PreviewCard({ dose }: { dose: Dose }) {
  const hasSignal = doseHasSignal(dose);
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      {hasSignal ? (
        <>
          {(dose.amount || dose.frequency || dose.timing) && (
            <div className="flex flex-wrap gap-2 mb-3">
              {dose.amount && (
                <PreviewChip>{dose.amount}</PreviewChip>
              )}
              {dose.frequency && (
                <PreviewChip>{dose.frequency}</PreviewChip>
              )}
              {dose.timing && (
                <PreviewChip
                  tone={dose.timing.tone === "before" ? "amber" : "sage"}
                >
                  {dose.timing.label}
                </PreviewChip>
              )}
            </div>
          )}
          {dose.schedule.length > 0 && (
            <div className="grid grid-cols-4 gap-1 max-w-[280px]">
              {DAY_PHASES.map((p) => {
                const on = dose.schedule.includes(p);
                return (
                  <div
                    key={p}
                    className="flex flex-col items-center"
                  >
                    <span
                      aria-hidden
                      className={
                        on
                          ? "w-[18px] h-[18px] rounded-full bg-accent-deg bg-accent-deep border border-accent-deep"
                          : "w-[18px] h-[18px] rounded-full bg-surface border border-border-soft"
                      }
                    />
                    <span
                      className={
                        on
                          ? "mt-1.5 font-sans text-[10px] uppercase tracking-[0.14em] font-semibold text-accent-deep"
                          : "mt-1.5 font-sans text-[10px] uppercase tracking-[0.14em] font-semibold text-ink-soft"
                      }
                    >
                      {PHASE_LABEL[p]}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <p className="font-sans text-[13px] text-ink-mute italic">
          Inget innehåll att visa.
        </p>
      )}
    </div>
  );
}

function PreviewChip({
  children,
  tone = "sage",
}: {
  children: React.ReactNode;
  tone?: "sage" | "amber";
}) {
  const palette =
    tone === "amber"
      ? "bg-[#C68A4F]/10 text-[#7A4D2A] border-[#C68A4F]/30"
      : "bg-accent/12 text-accent-deep border-accent/25";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 font-sans text-[12px] font-medium tracking-tight ${palette}`}
    >
      {children}
    </span>
  );
}
