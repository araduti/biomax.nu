"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  setProductStock,
  setVariantStock,
} from "@/lib/admin/inventory-actions";
import { AdminStatusPill, type StatusKind } from "./admin-status-pill";
import type { InventoryRow } from "@/lib/admin/inventory";

const SEVERITY: Record<
  InventoryRow["severity"],
  { label: string; icon: string; kind: StatusKind }
> = {
  out: { label: "Slut", icon: "⚠", kind: "error" },
  low: { label: "Lågt", icon: "○", kind: "warn" },
  ok: { label: "I lager", icon: "✓", kind: "ok" },
};

/**
 * One inventory row with inline stock edit. Two states:
 *
 *  - Display: severity pill + name + current stock + "Ändra"-button.
 *  - Edit:    number input + "Spara"/"Avbryt". Optimistic update so
 *             the visible value flips immediately; server failure
 *             reverts and surfaces the error.
 *
 * The 48 px hit-area floor + 17 px input font from the admin shell
 * tokens applies automatically.
 */
export function InventoryRowEditor({ row }: { row: InventoryRow }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(row.stock));
  const [optimistic, setOptimistic] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const currentStock = optimistic ?? row.stock;
  const severity = SEVERITY[row.severity];

  function save() {
    setError(null);
    const next = parseInt(draft, 10);
    if (!Number.isFinite(next) || next < 0) {
      setError("Lagersaldo måste vara 0 eller mer.");
      return;
    }
    setOptimistic(next);
    start(async () => {
      const result =
        row.kind === "variant"
          ? await setVariantStock({ variantId: row.rowId, stock: next })
          : await setProductStock({ productId: row.rowId, stock: next });
      if (!result.ok) {
        setError(result.error);
        setOptimistic(null);
        return;
      }
      setEditing(false);
      // router.refresh() so the severity bucket + sort order reflect
      // the new value. The optimistic state hangs on briefly while
      // the refresh runs, so no flash of old stock.
      router.refresh();
      setTimeout(() => setOptimistic(null), 600);
    });
  }

  return (
    <div className="grid grid-cols-[40px_1fr_auto] items-center gap-4 px-5 py-2 min-h-[56px] hover:bg-surface-warm/40 transition-colors">
      <Link
        href={`/admin/produkter/${row.productSlug}`}
        className="relative w-10 h-10 rounded-md overflow-hidden bg-surface-warm"
        aria-label={`Öppna ${row.name}`}
      >
        <Image
          src={row.imageUrl || "/products/_placeholder.svg"}
          alt=""
          fill
          sizes="40px"
          className="object-cover mix-blend-darken"
        />
      </Link>

      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-3">
          <Link
            href={`/admin/produkter/${row.productSlug}`}
            className="font-sans text-[14px] font-semibold text-primary-deep hover:text-primary transition-colors"
          >
            {row.name}
          </Link>
          <AdminStatusPill kind={severity.kind} icon={severity.icon}>
            {severity.label}
          </AdminStatusPill>
        </div>
        <p className="mt-1 font-sans text-[13px] text-ink-mute">
          {row.sku}
          {row.manageStock
            ? ` · tröskel ${row.threshold} st`
            : " · lager hanteras ej"}
        </p>
        {error && (
          <p
            role="alert"
            className="mt-2 font-sans text-[13px] text-status-error"
          >
            {error}
          </p>
        )}
      </div>

      {editing ? (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
            disabled={pending}
            aria-label={`Lagersaldo för ${row.name}`}
            className="w-24 h-12 px-3 rounded-md border-2 border-border bg-surface font-sans text-[17px] tabular-nums text-right focus:border-primary focus:ring-2 focus:ring-primary/15"
            autoFocus
          />
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="h-12 px-5 rounded-md bg-primary-deep text-surface font-sans text-[14px] font-semibold hover:bg-primary-deep/90 disabled:opacity-50"
          >
            {pending ? "Sparar…" : "Spara"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setDraft(String(row.stock));
              setError(null);
            }}
            disabled={pending}
            className="h-12 px-4 font-sans text-[13.5px] text-ink-soft hover:text-ink-body"
          >
            Avbryt
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <p
            className={`font-sans text-[15px] font-semibold tabular-nums whitespace-nowrap min-w-[60px] text-right ${
              row.severity === "out"
                ? "text-status-error"
                : row.severity === "low"
                  ? "text-status-low"
                  : "text-primary-deep"
            }`}
          >
            {row.manageStock ? `${currentStock} st` : "∞"}
          </p>
          {row.manageStock && (
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setDraft(String(row.stock));
                setError(null);
              }}
              className="h-12 px-5 rounded-md border-2 border-border bg-surface font-sans text-[14px] font-semibold text-ink-body hover:bg-surface-warm"
            >
              Ändra
            </button>
          )}
        </div>
      )}
    </div>
  );
}
