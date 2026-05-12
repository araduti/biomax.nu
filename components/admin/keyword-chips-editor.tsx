"use client";

import { useState, useRef, type KeyboardEvent } from "react";
import { Sparkline } from "@/components/admin/sparkline";

export type HistoryPoint = {
  date: string;
  clicks: number;
  impressions: number;
  position: number;
};

export type GscSuggestion = {
  keyword: string;
  clicks: number;
  impressions: number;
  position: number;
  /** Optional 14-day series for inline sparkline. */
  history?: HistoryPoint[];
};

/**
 * Multi-keyword chip input. Comma- or Enter-separated; click ✕ to remove;
 * Backspace on empty input removes the last chip. Used for `aiKeywords[]`
 * — the LLM/AI-search analogue of `seoFocusKw`.
 *
 * Two suggestion sources, rendered as separate groups with different visual
 * weight:
 *   • `gscSuggestions` — real Google queries that landed on this page but
 *     aren't covered yet. Shown first because they're proven traffic.
 *   • `suggestions` — derived from sajt-internal signals (categories,
 *     ingredient names). Shown second; lower priority but still useful when
 *     GSC data is sparse or unavailable.
 */
export function KeywordChipsEditor({
  label,
  hint,
  values,
  onChange,
  max = 24,
  suggestions = [],
  gscSuggestions = [],
}: {
  label: string;
  hint?: string;
  values: string[];
  onChange: (next: string[]) => void;
  max?: number;
  suggestions?: string[];
  gscSuggestions?: GscSuggestion[];
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function addRaw(input: string) {
    const parts = input
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const seen = new Set(values.map((v) => v.toLowerCase()));
    const additions: string[] = [];
    for (const p of parts) {
      const key = p.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      additions.push(p);
    }
    if (additions.length === 0) return;
    onChange([...values, ...additions].slice(0, max));
  }

  function commit() {
    if (!draft.trim()) return;
    addRaw(draft);
    setDraft("");
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && !draft && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  function remove(idx: number) {
    onChange(values.filter((_, i) => i !== idx));
  }

  const remaining = max - values.length;
  const valueSet = new Set(values.map((v) => v.toLowerCase()));
  const unusedGsc = gscSuggestions.filter(
    (s) => !valueSet.has(s.keyword.toLowerCase())
  );
  const unusedSuggestions = suggestions.filter(
    (s) => !valueSet.has(s.toLowerCase())
  );

  return (
    <div>
      <label className="block font-sans text-[13px] font-medium text-ink-body mb-1.5">
        {label}
      </label>
      <div
        className="min-h-[44px] flex flex-wrap items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-surface focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-colors"
        onClick={() => inputRef.current?.focus()}
      >
        {values.map((v, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 text-accent-deep px-2.5 py-1 font-sans text-[12.5px] font-medium"
          >
            {v}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                remove(i);
              }}
              aria-label={`Ta bort ${v}`}
              className="text-accent-deep/60 hover:text-accent-deep transition-colors leading-none"
            >
              ✕
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          onBlur={commit}
          placeholder={values.length === 0 ? "Skriv ett nyckelord och tryck Enter…" : ""}
          disabled={remaining <= 0}
          className="flex-1 min-w-[120px] outline-none bg-transparent font-sans text-[13.5px] text-ink-body placeholder:text-ink-soft px-1 py-0.5"
        />
      </div>
      <div className="mt-1.5 flex items-baseline justify-between gap-3">
        {hint && (
          <p className="font-sans text-[11.5px] text-ink-mute leading-snug">
            {hint}
          </p>
        )}
        <p className="font-sans text-[11.5px] text-ink-soft tabular-nums whitespace-nowrap">
          {values.length} / {max}
        </p>
      </div>
      {unusedGsc.length > 0 && remaining > 0 && (
        <div className="mt-3">
          <p className="font-sans text-[11px] uppercase tracking-[0.18em] font-semibold text-accent-deep mb-1.5">
            Från Google Search Console — riktiga sökningar
          </p>
          <div className="flex flex-wrap gap-1.5">
            {unusedGsc.slice(0, 10).map((g) => (
              <button
                key={g.keyword}
                type="button"
                onClick={() => addRaw(g.keyword)}
                className="group/gsc inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/[0.06] px-3 py-1 hover:bg-accent/15 hover:border-accent transition-colors"
              >
                <span className="font-sans text-[12px] font-medium text-accent-deep">
                  + {g.keyword}
                </span>
                <span className="font-sans text-[10.5px] tabular-nums text-ink-soft group-hover/gsc:text-accent-deep transition-colors">
                  {g.clicks > 0
                    ? `${g.clicks} klick · pos ${g.position.toFixed(1)}`
                    : `${g.impressions} v · pos ${g.position.toFixed(1)}`}
                </span>
                {g.history && g.history.length > 1 && (
                  <Sparkline history={g.history} metric="impressions" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
      {unusedSuggestions.length > 0 && remaining > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5 items-baseline">
          <span className="font-sans text-[11px] uppercase tracking-[0.18em] font-semibold text-ink-soft">
            Från sajten:
          </span>
          {unusedSuggestions.slice(0, 8).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addRaw(s)}
              className="rounded-full border border-dashed border-border-soft px-2.5 py-0.5 font-sans text-[12px] text-ink-mute hover:text-accent-deep hover:border-accent-deep transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
