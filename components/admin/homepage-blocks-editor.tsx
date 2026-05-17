"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  seedFromDefaults,
  setBlockActive,
  setBlockPosition,
  deleteBlock,
  createBlock,
} from "@/lib/admin/homepage-actions";
import { KIND_LABELS, type BlockKind } from "@/lib/homepage/blocks";

type Row = {
  id: string;
  kind: BlockKind;
  position: number;
  active: boolean;
};

export function HomepageBlocksEditor({ blocks }: { blocks: Row[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newKind, setNewKind] = useState<BlockKind>("bestsellers");

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Något gick fel.");
      router.refresh();
    });
  }

  if (blocks.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface-alt p-8 max-w-[640px]">
        <h2 className="font-display text-xl font-medium tracking-tight text-primary-deep mb-2">
          Tom tabell
        </h2>
        <p className="font-sans text-[14px] text-ink-mute leading-relaxed mb-5">
          Startsidan renderas just nu från kodens defaults. Klicka nedan för
          att seedea tabellen med samma blockordning — sedan kan du redigera.
        </p>
        <Button
          type="button"
          size="md"
          onClick={() => run(() => seedFromDefaults())}
          disabled={pending}
        >
          {pending ? "Seedar…" : "Seed from defaults"}
        </Button>
        {error && (
          <p
            role="alert"
            className="mt-4 font-sans text-[12.5px] text-status-error bg-status-error/10 px-3 py-2 rounded-md"
          >
            {error}
          </p>
        )}
      </div>
    );
  }

  const sorted = [...blocks].sort((a, b) => a.position - b.position);

  return (
    <div>
      <ul className="space-y-2 mb-8">
        {sorted.map((b) => (
          <li
            key={b.id}
            className={
              "grid grid-cols-[56px_1fr_auto_auto] items-center gap-4 px-5 py-3 rounded-xl border bg-surface-alt " +
              (b.active ? "border-border" : "border-border-soft opacity-60")
            }
          >
            <input
              type="number"
              value={b.position}
              onChange={(e) =>
                run(() =>
                  setBlockPosition(b.id, parseInt(e.target.value, 10) || 0)
                )
              }
              disabled={pending}
              className="w-14 px-2 py-1 bg-surface border border-border rounded font-mono text-[13px] tabular-nums text-center"
            />
            <span className="font-sans text-[14.5px] text-primary-deep font-medium">
              {KIND_LABELS[b.kind] ?? b.kind}
            </span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={b.active}
                onChange={(e) =>
                  run(() => setBlockActive(b.id, e.target.checked))
                }
                disabled={pending}
                className="w-4 h-4"
              />
              <span className="font-sans text-[12.5px] text-ink-mute">
                Aktiv
              </span>
            </label>
            <button
              type="button"
              onClick={() => {
                if (!confirm("Ta bort blocket?")) return;
                run(() => deleteBlock(b.id));
              }}
              disabled={pending}
              className="w-7 h-7 rounded-md bg-status-error/10 text-status-error hover:bg-status-error/20"
              aria-label="Ta bort"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <div className="bg-surface-alt border border-border rounded-xl p-4 flex items-end gap-3 max-w-[560px]">
        <div className="flex-1">
          <label className="block font-sans text-[12px] font-semibold text-ink-soft mb-1.5">
            Lägg till block
          </label>
          <select
            value={newKind}
            onChange={(e) => setNewKind(e.target.value as BlockKind)}
            disabled={pending}
            className="w-full px-3 py-2 bg-surface border border-border rounded-md font-sans text-[13.5px]"
          >
            {Object.entries(KIND_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            const maxPos = Math.max(0, ...sorted.map((b) => b.position));
            run(() => createBlock(newKind, maxPos + 10));
          }}
          disabled={pending}
        >
          Lägg till
        </Button>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 font-sans text-[12.5px] text-status-error bg-status-error/10 px-3 py-2 rounded-md max-w-[560px]"
        >
          {error}
        </p>
      )}

      <p className="mt-6 font-sans text-[12px] text-ink-soft leading-relaxed max-w-[560px]">
        Positionen är ett heltal — lägre tal renderas tidigare på sidan.
        Förändringar slår igenom inom någon minut tack vare ISR.
      </p>
    </div>
  );
}
