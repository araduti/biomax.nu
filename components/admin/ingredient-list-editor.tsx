"use client";

import { useId } from "react";
import {
  type IngredientList,
  type IngredientRow,
} from "@/lib/products/ingredient-list";
import { Input } from "@/components/ui/input";

const PER_UNIT_PRESETS = ["kapsel", "tablett", "tugg", "påse", "g", "ml"];

export function IngredientListEditor({
  value,
  onChange,
}: {
  value: IngredientList;
  onChange: (next: IngredientList) => void;
}) {
  const tableId = useId();

  function setRows(rows: IngredientRow[]) {
    onChange({ ...value, rows });
  }

  function updateRow(idx: number, patch: Partial<IngredientRow>) {
    const next = value.rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    setRows(next);
  }

  function addRow() {
    setRows([...value.rows, { name: "", amount: "" }]);
  }

  function removeRow(idx: number) {
    setRows(value.rows.filter((_, i) => i !== idx));
  }

  function moveRow(idx: number, dir: -1 | 1) {
    const next = [...value.rows];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setRows(next);
  }

  return (
    <div className="space-y-4">
      {/* Per-unit selector */}
      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor={`${tableId}-perUnit`}
          className="font-sans text-[12px] uppercase tracking-[0.16em] font-semibold text-ink-mute"
        >
          Mängd per
        </label>
        <input
          id={`${tableId}-perUnit`}
          list={`${tableId}-perUnit-presets`}
          value={value.perUnit}
          onChange={(e) => onChange({ ...value, perUnit: e.target.value })}
          placeholder="kapsel"
          className="h-10 px-3 rounded-md border border-border bg-surface-alt font-sans text-[14px] text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 min-w-[160px]"
        />
        <datalist id={`${tableId}-perUnit-presets`}>
          {PER_UNIT_PRESETS.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <p className="font-sans text-[12px] text-ink-soft">
          Rubriken på tabellens andra kolumn — t.ex. {`"`}Mängd per kapsel{`"`}.
        </p>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1fr_180px_auto] gap-2 px-3 py-2 bg-surface-warm border-b border-border-soft font-sans text-[10px] uppercase tracking-[0.16em] font-semibold text-ink-mute">
          <span>Ingrediens</span>
          <span>Mängd per {value.perUnit || "enhet"}</span>
          <span aria-hidden className="w-[88px]" />
        </div>
        {value.rows.length === 0 ? (
          <div className="px-3 py-8 text-center font-sans text-[13px] text-ink-mute italic">
            Inga rader ännu — klicka {`"`}Lägg till rad{`"`} nedan.
          </div>
        ) : (
          <ul>
            {value.rows.map((row, i) => (
              <li
                key={i}
                className="grid grid-cols-[1fr_180px_auto] gap-2 px-3 py-2 items-center border-t first:border-t-0 border-border-soft"
              >
                <input
                  type="text"
                  value={row.name}
                  onChange={(e) => updateRow(i, { name: e.target.value })}
                  placeholder="t.ex. Koenzym Q10"
                  className="h-10 px-3 rounded-md border border-border bg-surface-alt font-sans text-[14px] text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
                <input
                  type="text"
                  value={row.amount}
                  onChange={(e) => updateRow(i, { amount: e.target.value })}
                  placeholder="100 mg"
                  className="h-10 px-3 rounded-md border border-border bg-surface-alt font-sans text-[14px] text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveRow(i, -1)}
                    disabled={i === 0}
                    aria-label="Flytta upp"
                    className="w-8 h-8 rounded text-ink-mute hover:bg-surface-warm disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveRow(i, 1)}
                    disabled={i === value.rows.length - 1}
                    aria-label="Flytta ner"
                    className="w-8 h-8 rounded text-ink-mute hover:bg-surface-warm disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    aria-label={`Ta bort rad ${i + 1}`}
                    className="w-8 h-8 rounded text-ink-mute hover:bg-status-error/10 hover:text-status-error transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-border-soft p-2">
          <button
            type="button"
            onClick={addRow}
            className="font-sans text-[13px] font-semibold text-primary hover:text-primary-deep transition-colors px-3 py-2"
          >
            + Lägg till rad
          </button>
        </div>
      </div>

      {/* Footnote */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`${tableId}-footnote`}
          className="font-sans text-[12px] uppercase tracking-[0.16em] font-semibold text-ink-mute"
        >
          Fotnot
        </label>
        <textarea
          id={`${tableId}-footnote`}
          value={value.footnote}
          onChange={(e) => onChange({ ...value, footnote: e.target.value })}
          rows={3}
          placeholder="* Rismjöl, gelatin kapsel, Glycerin, Järnoxid (färg)&#10;* Dagsintag har inte fastställts."
          className="px-4 py-3 rounded-md border border-border bg-surface-alt font-sans text-[14px] text-ink leading-relaxed outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 resize-y"
        />
        <p className="font-sans text-[12px] text-ink-soft">
          Övriga ingredienser, RDI-disclaimer eller andra kommentarer som
          visas under tabellen. Använd radbrytning för flera punkter.
        </p>
      </div>
    </div>
  );
}
