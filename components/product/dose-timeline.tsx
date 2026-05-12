import type { Dose, DayPhase } from "@/lib/products/dose";

const PHASES: { id: DayPhase; label: string }[] = [
  { id: "morgon", label: "Morgon" },
  { id: "lunch", label: "Lunch" },
  { id: "eftermiddag", label: "Eftermiddag" },
  { id: "kvall", label: "Kväll" },
];

/**
 * Visual representation of when in the day a dose is taken. Consumes a
 * resolved `Dose` — caller decides whether the schedule came from an
 * editorial override or the dose parser. Renders nothing when the schedule
 * is empty.
 */
export function DoseTimeline({ dose }: { dose: Dose }) {
  const filled = new Set(dose.schedule);
  if (filled.size === 0) return null;

  return (
    <div className="mt-3 mb-4">
      <div className="relative grid grid-cols-4 gap-1 px-1">
        <span
          aria-hidden
          className="absolute left-3 right-3 top-[10px] h-px bg-border-soft"
        />
        {PHASES.map((p) => {
          const on = filled.has(p.id);
          return (
            <div key={p.id} className="relative flex flex-col items-center">
              <span
                aria-hidden
                className={`relative z-10 inline-flex items-center justify-center w-[22px] h-[22px] rounded-full transition-colors ${
                  on
                    ? "bg-accent-deep text-white"
                    : "bg-surface border border-border-soft text-ink-soft"
                }`}
              >
                {on ? <Dot /> : <Hollow />}
              </span>
              <span
                className={`mt-2 font-sans text-[10.5px] uppercase tracking-[0.14em] font-semibold ${
                  on ? "text-accent-deep" : "text-ink-soft"
                }`}
              >
                {p.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Dot() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" aria-hidden>
      <circle cx="4" cy="4" r="3" />
    </svg>
  );
}
function Hollow() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="4" cy="4" r="2.5" />
    </svg>
  );
}
