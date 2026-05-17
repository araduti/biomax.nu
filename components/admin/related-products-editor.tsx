"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  searchProductsForRelated,
  setRelatedProducts,
  type RelatedSearchResult,
} from "@/lib/admin/related-products-actions";

const MAX = 6;

export type PinnedProduct = {
  slug: string;
  name: string;
  imageUrl: string;
  primaryCategory: string | null;
};

/**
 * Editor-pinned related products. Empty pins → public page auto-picks by
 * category overlap. Order is preserved (drag-free; arrow buttons reorder).
 */
export function RelatedProductsEditor({
  sourceSlug,
  initialPinned,
}: {
  sourceSlug: string;
  initialPinned: PinnedProduct[];
}) {
  const [pinned, setPinned] = useState<PinnedProduct[]>(initialPinned);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RelatedSearchResult[]>([]);
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
      const rows = await searchProductsForRelated(sourceSlug, value);
      setResults(rows);
    });
  }

  function persist(next: PinnedProduct[]) {
    setError(null);
    setSaved(false);
    setPinned(next); // optimistic
    startSave(async () => {
      const result = await setRelatedProducts(
        sourceSlug,
        next.map((p) => p.slug)
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  function pin(item: RelatedSearchResult) {
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
  const pendingAny = saving || searching;

  return (
    <div>
      {pinned.length === 0 ? (
        <p className="font-sans text-[13px] text-ink-mute italic mb-4">
          Inga manuellt valda. Sidan visar automatiskt 3 produkter ur samma
          kategori (mest sålda först).
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
                <p className="font-sans text-[13px] font-semibold text-primary-deep truncate">
                  {p.name}
                </p>
                {p.primaryCategory && (
                  <p className="font-sans text-[11px] text-ink-soft">
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
                  className="w-7 h-7 inline-flex items-center justify-center rounded-md bg-surface-warm text-primary-deep hover:bg-border-soft disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === pinned.length - 1 || saving}
                  aria-label="Flytta ner"
                  className="w-7 h-7 inline-flex items-center justify-center rounded-md bg-surface-warm text-primary-deep hover:bg-border-soft disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => unpin(p.slug)}
                  disabled={saving}
                  aria-label="Ta bort"
                  className="w-7 h-7 inline-flex items-center justify-center rounded-md bg-status-error text-white hover:bg-[#7A331E] disabled:opacity-30 disabled:cursor-not-allowed"
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
            disabled={pendingAny}
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
                      className="w-full flex items-center gap-3 p-2 hover:bg-surface-warm disabled:opacity-40 disabled:cursor-not-allowed text-left"
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
                        <p className="font-sans text-[13px] font-semibold text-primary-deep truncate">
                          {r.name}
                        </p>
                        {r.primaryCategory && (
                          <p className="font-sans text-[11px] text-ink-soft">
                            {r.primaryCategory}
                          </p>
                        )}
                      </div>
                      {already ? (
                        <span className="font-sans text-[11px] text-ink-soft">
                          Tillagd
                        </span>
                      ) : (
                        <span className="font-sans text-[11px] text-accent-deep font-semibold">
                          + Lägg till
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center gap-3">
        <p className="font-sans text-[12px] text-ink-mute">
          {remaining > 0
            ? `${remaining} kvar (max ${MAX})`
            : `Listan är full (${MAX})`}
        </p>
        {saved && (
          <span
            role="status"
            className="font-sans text-[12px] text-accent-deep font-semibold"
          >
            ✓ Sparat
          </span>
        )}
        {searching && (
          <span className="font-sans text-[12px] text-ink-soft">Söker…</span>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 font-sans text-[12.5px] text-status-error bg-status-error/10 px-3 py-2 rounded-md"
        >
          {error}
        </p>
      )}
    </div>
  );
}
