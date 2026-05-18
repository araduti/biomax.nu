"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import {
  searchProductsForIngredientPin,
  setIngredientPins,
  type IngredientPinSearchResult,
} from "@/lib/admin/ingredient-pin-actions";

const MAX = 8;

export type PinnedProduct = {
  slug: string;
  name: string;
  imageUrl: string;
  primaryCategory: string | null;
};

/**
 * Same UX pattern as the related-products editor (search → pin → reorder
 * with arrows → remove), scoped to a single ingredient slug. We commit
 * the entire ordered list on every change rather than per-row mutations
 * — keeps the server action surface flat.
 */
export function IngredientPinsEditor({
  ingredientSlug,
  initialPinned,
}: {
  ingredientSlug: string;
  initialPinned: PinnedProduct[];
}) {
  const [pinned, setPinned] = useState<PinnedProduct[]>(initialPinned);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<IngredientPinSearchResult[]>([]);
  const [searching, startSearch] = useTransition();
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function runSearch(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    startSearch(async () => {
      const rows = await searchProductsForIngredientPin(value);
      setResults(rows);
    });
  }

  function persist(next: PinnedProduct[]) {
    setError(null);
    setSaved(false);
    setPinned(next);
    startSave(async () => {
      const r = await setIngredientPins(
        ingredientSlug,
        next.map((p) => p.slug)
      );
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  function pin(item: IngredientPinSearchResult) {
    if (pinned.some((p) => p.slug === item.slug)) return;
    if (pinned.length >= MAX) return;
    persist([...pinned, item]);
    setQuery("");
    setResults([]);
  }
  function unpin(slug: string) {
    persist(pinned.filter((p) => p.slug !== slug));
  }
  function move(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= pinned.length) return;
    const next = [...pinned];
    [next[idx], next[j]] = [next[j], next[idx]];
    persist(next);
  }

  const remaining = MAX - pinned.length;

  return (
    <div>
      {pinned.length === 0 ? (
        <p className="font-sans text-small text-ink-mute italic mb-4">
          Inga pinnade än — sidan visar automatiska matchningar.
        </p>
      ) : (
        <ul className="space-y-2 mb-4">
          {pinned.map((p, i) => (
            <li
              key={p.slug}
              className="flex items-center gap-3 bg-surface border border-border rounded-lg p-2"
            >
              <div className="relative w-12 h-12 rounded-md overflow-hidden bg-surface-warm flex-shrink-0">
                <Image
                  src={p.imageUrl}
                  alt=""
                  fill
                  sizes="48px"
                  className="object-cover mix-blend-darken"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-sans text-small font-semibold text-primary-deep truncate">
                  {p.name}
                </p>
                {p.primaryCategory && (
                  <p className="font-sans text-micro text-ink-soft">
                    {p.primaryCategory}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0 || saving}
                  aria-label="Flytta upp"
                  className="w-7 h-7 rounded-md bg-surface-warm text-primary-deep hover:bg-border-soft disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === pinned.length - 1 || saving}
                  aria-label="Flytta ner"
                  className="w-7 h-7 rounded-md bg-surface-warm text-primary-deep hover:bg-border-soft disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => unpin(p.slug)}
                  disabled={saving}
                  aria-label="Ta bort"
                  className="w-7 h-7 rounded-md bg-status-error text-white hover:bg-[#7A331E] disabled:opacity-30"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {remaining > 0 && (
        <div>
          <Input
            type="search"
            placeholder="Sök produktnamn eller SKU…"
            value={query}
            onChange={(e) => runSearch(e.target.value)}
            disabled={saving}
          />
          {results.length > 0 && (
            <ul className="mt-2 max-h-[260px] overflow-auto bg-surface border border-border rounded-lg divide-y divide-border-soft">
              {results.map((r) => {
                const already = pinned.some((p) => p.slug === r.slug);
                return (
                  <li key={r.slug}>
                    <button
                      type="button"
                      onClick={() => pin(r)}
                      disabled={already || saving}
                      className="w-full flex items-center gap-3 p-2 hover:bg-surface-warm disabled:opacity-40 text-left"
                    >
                      <div className="relative w-10 h-10 rounded-md overflow-hidden bg-surface-warm flex-shrink-0">
                        <Image
                          src={r.imageUrl}
                          alt=""
                          fill
                          sizes="40px"
                          className="object-cover mix-blend-darken"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-sans text-small font-semibold text-primary-deep truncate">
                          {r.name}
                        </p>
                        {r.primaryCategory && (
                          <p className="font-sans text-micro text-ink-soft">
                            {r.primaryCategory}
                          </p>
                        )}
                      </div>
                      <span className="font-sans text-micro text-accent-deep font-semibold">
                        {already ? "Tillagd" : "+ Pinna"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center gap-3">
        <p className="font-sans text-caption text-ink-mute">
          {remaining > 0 ? `${remaining} kvar (max ${MAX})` : `Listan är full`}
        </p>
        {saved && (
          <span
            role="status"
            className="font-sans text-caption text-accent-deep font-semibold"
          >
            ✓ Sparat
          </span>
        )}
        {searching && (
          <span className="font-sans text-caption text-ink-soft">Söker…</span>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 font-sans text-caption text-status-error bg-status-error/10 px-3 py-2 rounded-md"
        >
          {error}
        </p>
      )}
    </div>
  );
}
