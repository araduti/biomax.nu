"use client";

import { useState, useRef, type KeyboardEvent } from "react";

/**
 * Badge chips that appear in the product card eyebrow ("MEST SÅLDA",
 * "BÄSTSÄLJARE", "KLINISKT DOKUMENTERAT" etc.).
 *
 * UX intent: editorial mostly picks from the standard set; the chip input
 * still accepts free-form values for one-off cases ("Begränsad upplaga",
 * "Reapris" etc.). Capped at 4 visible badges to avoid card noise.
 */
const PRESETS = [
  "Bästsäljare",
  "Mest sålda",
  "Kliniskt dokumenterat",
  "Nyhet",
  "Begränsad upplaga",
  "Reapris",
] as const;

const MAX_BADGES = 4;

export function BadgesEditor({
  values,
  onChange,
}: {
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function addRaw(input: string) {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (values.some((v) => v.toLowerCase() === trimmed.toLowerCase())) return;
    if (values.length >= MAX_BADGES) return;
    onChange([...values, trimmed]);
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

  function togglePreset(preset: string) {
    if (values.some((v) => v.toLowerCase() === preset.toLowerCase())) {
      onChange(
        values.filter((v) => v.toLowerCase() !== preset.toLowerCase())
      );
    } else if (values.length < MAX_BADGES) {
      onChange([...values, preset]);
    }
  }

  const remaining = MAX_BADGES - values.length;

  return (
    <div className="space-y-3">
      {/* Active badges */}
      <div
        className="min-h-[44px] flex flex-wrap items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-surface focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-colors"
        onClick={() => inputRef.current?.focus()}
      >
        {values.map((v, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary-deep/[0.08] text-primary-deep px-2.5 py-1 font-sans text-micro uppercase tracking-[0.16em] font-semibold"
          >
            {v}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                remove(i);
              }}
              aria-label={`Ta bort ${v}`}
              className="text-primary-deep/60 hover:text-primary-deep transition-colors leading-none"
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
          placeholder={
            values.length === 0
              ? "Klicka en förinställning nedan eller skriv eget värde…"
              : ""
          }
          disabled={remaining <= 0}
          className="flex-1 min-w-[120px] outline-none bg-transparent font-sans text-small text-ink-body placeholder:text-ink-soft px-1 py-0.5"
        />
      </div>

      <div className="flex items-baseline justify-between gap-3">
        <p className="font-sans text-micro text-ink-mute leading-snug">
          Visas i kortets toppikon på sortimentet. Max {MAX_BADGES} per produkt.
        </p>
        <p className="font-sans text-micro text-ink-soft tabular-nums whitespace-nowrap">
          {values.length} / {MAX_BADGES}
        </p>
      </div>

      {/* Preset chips */}
      <div>
        <p className="font-sans text-micro uppercase tracking-[0.2em] font-semibold text-ink-soft mb-1.5">
          Förinställningar
        </p>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => {
            const on = values.some(
              (v) => v.toLowerCase() === p.toLowerCase()
            );
            return (
              <button
                key={p}
                type="button"
                onClick={() => togglePreset(p)}
                disabled={!on && remaining <= 0}
                aria-pressed={on}
                className={
                  on
                    ? "rounded-full bg-primary-deep/[0.08] text-primary-deep px-3 py-1 font-sans text-micro uppercase tracking-[0.16em] font-semibold"
                    : remaining <= 0
                      ? "rounded-full border border-dashed border-border-soft px-3 py-1 font-sans text-micro uppercase tracking-[0.16em] font-semibold text-ink-soft/50 cursor-not-allowed"
                      : "rounded-full border border-dashed border-border-soft px-3 py-1 font-sans text-micro uppercase tracking-[0.16em] font-semibold text-ink-mute hover:text-primary-deep hover:border-primary-deep transition-colors"
                }
              >
                {on ? "✓ " : "+ "}
                {p}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
