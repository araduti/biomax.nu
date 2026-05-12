"use client";

import { Button } from "@/components/ui/button";

export type FaqItem = { question: string; answer: string };

/**
 * Repeating-row editor for product-level FAQ entries. Mirrors the IngredientList
 * editor's pattern (move up/down, delete, add) so admin staff get a consistent
 * editing posture across structured content.
 *
 * A "load auto-suggestions" button pre-fills the editor with the same Q&As the
 * site auto-synthesises from existing fields — staff edit rather than write
 * from blank, then the manual entries take precedence over the synthesis at
 * render time.
 */
export function FaqEditor({
  items,
  onChange,
  suggestions,
}: {
  items: FaqItem[];
  onChange: (next: FaqItem[]) => void;
  suggestions: FaqItem[];
}) {
  function update(i: number, patch: Partial<FaqItem>) {
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  function move(i: number, dir: -1 | 1) {
    const next = [...items];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }
  function add() {
    onChange([...items, { question: "", answer: "" }]);
  }
  function loadSuggestions() {
    if (items.length > 0) {
      if (
        !confirm(
          "Detta ersätter befintliga FAQ-poster med autoförslagen. Fortsätta?"
        )
      ) {
        return;
      }
    }
    onChange(suggestions);
  }

  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <p className="font-sans text-[13.5px] text-ink-mute italic">
          Inga manuella FAQ-poster — sajten genererar automatiskt 2–3 frågor från
          fälten Dosering / Innehåll / Observera.
        </p>
      )}

      {items.map((it, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-surface px-4 py-4 space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-sans text-[11px] uppercase tracking-[0.2em] font-semibold text-ink-soft">
              Fråga {i + 1}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="Flytta upp"
                className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-border bg-surface-alt text-ink-mute hover:text-ink-body disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === items.length - 1}
                aria-label="Flytta ner"
                className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-border bg-surface-alt text-ink-mute hover:text-ink-body disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Ta bort"
                className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-[#B5523B]/30 bg-[#B5523B]/[0.04] text-[#B5523B] hover:bg-[#B5523B]/10"
              >
                ✕
              </button>
            </div>
          </div>
          <input
            type="text"
            value={it.question}
            onChange={(e) => update(i, { question: e.target.value })}
            placeholder="Fråga, t.ex. Är produkten säker under graviditet?"
            className="w-full px-3 py-2 rounded-lg border border-border bg-surface-alt font-sans text-[14px] text-ink-body outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-colors"
          />
          <textarea
            value={it.answer}
            onChange={(e) => update(i, { answer: e.target.value })}
            placeholder="Svar i löpande text — håll det kort, en LLM kan citera detta direkt."
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-border bg-surface-alt font-sans text-[14px] text-ink-body leading-relaxed outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-colors resize-y"
          />
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={add}>
          + Lägg till fråga
        </Button>
        {suggestions.length > 0 && (
          <button
            type="button"
            onClick={loadSuggestions}
            className="font-sans text-[12.5px] font-semibold text-accent-deep hover:text-primary-deep border-b border-accent/40 pb-px transition-colors"
          >
            Ladda {suggestions.length} autoförslag →
          </button>
        )}
      </div>

      <p className="font-sans text-[11.5px] text-ink-mute italic">
        Dessa frågor publiceras som FAQPage-strukturerad data — Google kan visa
        dem som rich-result, och LLMs kan citera dem direkt. Skriv som om en
        kund frågat dig direkt i butiken.
      </p>
    </div>
  );
}
