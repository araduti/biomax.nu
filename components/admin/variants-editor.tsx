"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  setProductVariants,
  type VariantInput,
} from "@/lib/admin/variant-actions";

export type InitialVariant = {
  id: string;
  sku: string;
  label: string;
  price: string;
  compareAtPrice: string | null;
  stock: number;
  manageStock: boolean;
  weight: string | null;
  isDefault: boolean;
};

type Row = {
  /** Existing-row id, or empty string for new rows. */
  id: string;
  sku: string;
  label: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  manageStock: boolean;
  weight: string;
  isDefault: boolean;
};

function initialToRow(v: InitialVariant): Row {
  return {
    id: v.id,
    sku: v.sku,
    label: v.label,
    price: v.price,
    compareAtPrice: v.compareAtPrice ?? "",
    stock: String(v.stock),
    manageStock: v.manageStock,
    weight: v.weight ?? "",
    isDefault: v.isDefault,
  };
}

function emptyRow(): Row {
  return {
    id: "",
    sku: "",
    label: "",
    price: "",
    compareAtPrice: "",
    stock: "0",
    manageStock: true,
    weight: "",
    isDefault: false,
  };
}

/**
 * Inline-table editor for product variants. Lives inside the Pris & lager
 * section of the product editor. Order in the table = `position` saved
 * to DB. Submitting replaces the whole variant list — same shape as the
 * related-products and bundles editors so editors aren't learning new
 * conventions.
 */
export function VariantsEditor({
  productSlug,
  initial,
}: {
  productSlug: string;
  initial: InitialVariant[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(
    initial.length > 0
      ? initial.map(initialToRow)
      : [] /* empty — editor adds when ready */
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function update(i: number, patch: Partial<Row>) {
    setRows((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      // If the user just set this row as default, unset the others —
      // schema allows multiple defaults but UX should be a single radio.
      if (patch.isDefault) {
        for (let j = 0; j < next.length; j++) {
          if (j !== i) next[j].isDefault = false;
        }
      }
      return next;
    });
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    setRows((prev) => {
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function remove(i: number) {
    setRows((prev) => prev.filter((_, k) => k !== i));
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function save() {
    setError(null);
    setSaved(false);

    // If at least one row, ensure exactly one isDefault is set.
    const normalized = rows.map((r, i) => ({ ...r, _idx: i }));
    if (normalized.length > 0 && !normalized.some((r) => r.isDefault)) {
      normalized[0].isDefault = true;
    }

    const payload: VariantInput[] = normalized.map((r) => ({
      id: r.id || undefined,
      sku: r.sku.trim(),
      label: r.label.trim(),
      price: r.price.trim() || "0",
      compareAtPrice:
        r.compareAtPrice.trim() === "" ? null : r.compareAtPrice.trim(),
      stock: parseInt(r.stock || "0", 10),
      manageStock: r.manageStock,
      weight: r.weight.trim() === "" ? null : r.weight.trim(),
      isDefault: r.isDefault,
    }));

    start(async () => {
      const result = await setProductVariants(productSlug, payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    });
  }

  return (
    <div>
      <p className="font-sans text-[12.5px] text-ink-mute mb-3 leading-relaxed max-w-[640px]">
        Använd varianter när samma produkt finns i flera storlekar, smaker
        eller styrkor. Varje variant har egen SKU, eget pris och eget lager.
        Lämnas listan tom använder produktsidan moder­produktens pris och
        lager — det vanliga.
      </p>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface-warm/40 px-4 py-5">
          <p className="font-sans text-[13px] text-ink-mute italic mb-3">
            Inga varianter — produkten säljs som en enda SKU.
          </p>
          <Button type="button" size="sm" variant="outline" onClick={addRow}>
            + Lägg till första varianten
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_120px_100px_80px_44px_44px_44px_44px] gap-2 items-end p-3 rounded-lg border border-border bg-surface"
            >
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label={i === 0 ? "Etikett" : undefined}
                  placeholder="t.ex. 30 kaps"
                  value={r.label}
                  onChange={(e) => update(i, { label: e.target.value })}
                  disabled={pending}
                />
                <Input
                  label={i === 0 ? "SKU" : undefined}
                  placeholder="ROCK-EW-30"
                  value={r.sku}
                  onChange={(e) =>
                    update(i, { sku: e.target.value.toUpperCase() })
                  }
                  disabled={pending}
                />
              </div>
              <Input
                label={i === 0 ? "Pris (SEK)" : undefined}
                type="number"
                step="0.01"
                min="0"
                value={r.price}
                onChange={(e) => update(i, { price: e.target.value })}
                disabled={pending}
              />
              <Input
                label={i === 0 ? "Jämförpris" : undefined}
                type="number"
                step="0.01"
                min="0"
                value={r.compareAtPrice}
                onChange={(e) =>
                  update(i, { compareAtPrice: e.target.value })
                }
                disabled={pending}
              />
              <Input
                label={i === 0 ? "Lager" : undefined}
                type="number"
                min="0"
                value={r.stock}
                onChange={(e) =>
                  update(i, { stock: e.target.value.replace(/[^0-9]/g, "") })
                }
                disabled={pending || !r.manageStock}
              />
              <label
                className="inline-flex flex-col items-center gap-1 text-[10.5px] font-sans uppercase tracking-[0.14em] font-semibold text-ink-soft cursor-pointer pt-[18px]"
                title="Standard — välj denna variant som förvald"
              >
                {i === 0 && <span className="invisible">x</span>}
                <input
                  type="radio"
                  name={`isDefault-${productSlug}`}
                  checked={r.isDefault}
                  onChange={() => update(i, { isDefault: true })}
                  disabled={pending}
                />
                <span>Std</span>
              </label>
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={pending || i === 0}
                aria-label="Flytta upp"
                className="w-9 h-9 rounded-md bg-surface-warm text-primary-deep hover:bg-border-soft disabled:opacity-30 self-end"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={pending || i === rows.length - 1}
                aria-label="Flytta ner"
                className="w-9 h-9 rounded-md bg-surface-warm text-primary-deep hover:bg-border-soft disabled:opacity-30 self-end"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => remove(i)}
                disabled={pending}
                aria-label="Ta bort"
                className="w-9 h-9 rounded-md bg-[#B5523B]/10 text-[#B5523B] hover:bg-[#B5523B]/20 self-end"
              >
                ✕
              </button>
            </div>
          ))}

          <Button type="button" size="sm" variant="outline" onClick={addRow}>
            + Lägg till variant
          </Button>
        </div>
      )}

      <div className="mt-4 flex items-center gap-3 flex-wrap">
        <Button
          type="button"
          size="sm"
          onClick={save}
          disabled={pending}
        >
          {pending ? "Sparar varianter…" : "Spara varianter"}
        </Button>
        {saved && (
          <span
            role="status"
            className="font-sans text-[12.5px] text-accent-deep font-semibold"
          >
            ✓ Sparat
          </span>
        )}
        {rows.length > 0 && (
          <span className="font-sans text-[11.5px] text-ink-soft ml-auto">
            {rows.length} {rows.length === 1 ? "variant" : "varianter"}
          </span>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 font-sans text-[12.5px] text-[#B5523B] bg-[#B5523B]/10 px-3 py-2 rounded-md"
        >
          {error}
        </p>
      )}
    </div>
  );
}
