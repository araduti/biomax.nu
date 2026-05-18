"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { adminSearch, type AdminSearchResult } from "@/lib/admin/search";
import { cn } from "@/lib/utils";

/**
 * Admin global search — Cmd-K-style dialog.
 *
 * Opens via:
 *   - Cmd/Ctrl + K anywhere in the admin shell
 *   - Click on the topbar search input (which renders an inert proxy
 *     that activates this dialog)
 *
 * Keyboard inside the dialog:
 *   - ↑ / ↓ navigate results
 *   - Enter jumps to the active result
 *   - Esc closes
 *
 * Includes:
 *   - Server-backed search (Products / Orders / Customers) with 200 ms
 *     debounce so we don't hammer the DB on every keystroke
 *   - Static "Hoppa till"-section (admin pages — local match, no DB)
 *   - Empty state with shortcut hints
 *
 * The whole dialog is rendered conditionally; while closed it costs one
 * passive `keydown` listener — negligible.
 */

const STATIC_PAGES: { href: string; label: string; group: string }[] = [
  { href: "/admin", label: "Översikt", group: "Beställningar" },
  { href: "/admin/ordrar", label: "Ordrar", group: "Beställningar" },
  { href: "/admin/packlista", label: "Packlista", group: "Beställningar" },
  { href: "/admin/returer", label: "Returer", group: "Beställningar" },
  { href: "/admin/kunder", label: "Kunder", group: "Beställningar" },
  { href: "/admin/produkter", label: "Produkter", group: "Katalog" },
  { href: "/admin/lager", label: "Lager", group: "Katalog" },
  { href: "/admin/kategorier", label: "Kategorier", group: "Katalog" },
  { href: "/admin/paket", label: "Paket", group: "Katalog" },
  { href: "/admin/kuponger", label: "Rabattkoder", group: "Katalog" },
  { href: "/admin/recensioner", label: "Recensioner", group: "Marknad" },
  { href: "/admin/startsida", label: "Startsidan", group: "Marknad" },
  { href: "/admin/startsida/hero", label: "Hero-bilder", group: "Marknad" },
  { href: "/admin/seo", label: "SEO", group: "Marknad" },
  { href: "/admin/innehall", label: "Innehåll", group: "Marknad" },
  { href: "/admin/moms", label: "Momsrapport", group: "Rapporter" },
  { href: "/admin/installningar", label: "Inställningar", group: "System" },
  { href: "/admin/system/prestanda", label: "Prestanda", group: "System" },
  { href: "/admin/system/drifttid", label: "Drifttid", group: "System" },
  { href: "/admin/system/loggar", label: "Loggar", group: "System" },
  { href: "/admin/system/backups", label: "Backups", group: "System" },
];

const KIND_LABEL: Record<AdminSearchResult["kind"], string> = {
  product: "Produkter",
  order: "Ordrar",
  customer: "Kunder",
};

const KIND_ICON: Record<AdminSearchResult["kind"], string> = {
  product: "📦",
  order: "🧾",
  customer: "👤",
};

type Row = {
  href: string;
  title: string;
  sublabel?: string;
  groupLabel: string;
  icon?: string;
  /** Product image URL — when present, renders as a thumbnail instead
   *  of the emoji icon for stronger visual recognition. */
  thumbUrl?: string | null;
  /** Initial letter for avatar fallback (customers). */
  initial?: string;
};

export function CmdK({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminSearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [, startTransition] = useTransition();

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setActiveIndex(0);
      // Autofocus after the dialog has mounted
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Debounced server search
  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      startTransition(async () => {
        const res = await adminSearch(trimmed);
        setResults(res.results);
        setActiveIndex(0);
      });
    }, 200);
    return () => clearTimeout(timer);
  }, [query, open]);

  // Build the unified row list (static pages + server results)
  const rows: Row[] = (() => {
    const out: Row[] = [];
    const q = query.trim().toLowerCase();

    // Server results first when the user is actively typing
    if (q.length >= 2) {
      for (const r of results) {
        out.push({
          href: r.href,
          title: r.title,
          sublabel: r.sublabel,
          groupLabel: KIND_LABEL[r.kind],
          icon: KIND_ICON[r.kind],
          thumbUrl: r.thumbUrl,
          // Initial letter for customer rows — gives them a colored
          // avatar circle instead of the generic person emoji.
          initial:
            r.kind === "customer"
              ? r.title.slice(0, 1).toUpperCase()
              : undefined,
        });
      }
    }

    // Then static page matches (local filter — fast)
    const staticMatches = q
      ? STATIC_PAGES.filter(
          (p) =>
            p.label.toLowerCase().includes(q) ||
            p.group.toLowerCase().includes(q)
        )
      : STATIC_PAGES;
    for (const p of staticMatches) {
      out.push({
        href: p.href,
        title: p.label,
        groupLabel: `Hoppa till · ${p.group}`,
      });
    }

    return out;
  })();

  // Keyboard navigation inside the dialog
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      onOpenChange(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(rows.length - 1, i + 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const r = rows[activeIndex];
      if (r) {
        onOpenChange(false);
        router.push(r.href);
      }
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sök i admin"
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
    >
      {/* Scrim */}
      <button
        type="button"
        aria-label="Stäng sökruta"
        onClick={() => onOpenChange(false)}
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
      />

      {/* Panel */}
      <div className="relative w-full max-w-[640px] bg-surface border border-border rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border-soft">
          <span aria-hidden className="text-ink-mute text-lg">
            🔍
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sök produkter, ordrar, kunder…"
            className="flex-1 h-10 bg-transparent font-sans text-lead text-ink outline-none placeholder:text-ink-soft"
            type="text"
            spellCheck={false}
            autoComplete="off"
            aria-autocomplete="list"
            aria-controls="cmdk-list"
          />
          <kbd className="hidden sm:inline-flex items-center px-2 h-6 rounded bg-surface-warm border border-border-soft font-sans text-micro text-ink-mute">
            Esc
          </kbd>
        </div>

        <div
          id="cmdk-list"
          role="listbox"
          className="max-h-[60vh] overflow-y-auto py-1"
        >
          {rows.length === 0 ? (
            <p className="px-5 py-10 text-center font-sans text-body text-ink-mute italic">
              {query.trim().length < 2
                ? "Skriv minst två tecken för att söka."
                : "Inga träffar för ”" + query.trim() + "”."}
            </p>
          ) : (
            <RowList
              rows={rows}
              activeIndex={activeIndex}
              setActiveIndex={setActiveIndex}
              onPick={() => onOpenChange(false)}
            />
          )}
        </div>

        <div className="px-5 py-2.5 border-t border-border-soft bg-surface-warm flex items-center gap-4 font-sans text-micro text-ink-mute">
          <span>
            <kbd className="inline-flex items-center px-1.5 h-5 rounded bg-surface border border-border-soft text-micro mr-1">
              ↑↓
            </kbd>
            navigera
          </span>
          <span>
            <kbd className="inline-flex items-center px-1.5 h-5 rounded bg-surface border border-border-soft text-micro mr-1">
              ↵
            </kbd>
            välj
          </span>
          <span>
            <kbd className="inline-flex items-center px-1.5 h-5 rounded bg-surface border border-border-soft text-micro mr-1">
              Esc
            </kbd>
            stäng
          </span>
        </div>
      </div>
    </div>
  );
}

function RowList({
  rows,
  activeIndex,
  setActiveIndex,
  onPick,
}: {
  rows: Row[];
  activeIndex: number;
  setActiveIndex: (i: number) => void;
  onPick: () => void;
}) {
  // Bucket consecutive rows by group label for visual grouping
  const buckets: { label: string; items: { row: Row; index: number }[] }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const last = buckets[buckets.length - 1];
    if (last && last.label === row.groupLabel) {
      last.items.push({ row, index: i });
    } else {
      buckets.push({ label: row.groupLabel, items: [{ row, index: i }] });
    }
  }

  return (
    <>
      {buckets.map((b) => (
        <div key={b.label} className="mb-1.5 last:mb-0">
          <p className="px-5 pt-2 pb-1 font-sans text-micro uppercase tracking-[0.16em] text-ink-soft font-semibold">
            {b.label}
          </p>
          {b.items.map(({ row, index }) => {
            const active = index === activeIndex;
            return (
              <Link
                key={row.href + index}
                href={row.href}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={onPick}
                role="option"
                aria-selected={active}
                className={cn(
                  "block px-5 py-2.5 flex items-center gap-3 transition-colors",
                  active
                    ? "bg-surface-warm"
                    : "hover:bg-surface-warm/60"
                )}
              >
                {row.thumbUrl ? (
                  // Product thumbnail — same image the catalogue uses.
                  // mix-blend-darken hides the white bottle background
                  // against our cream surface for cleaner inline render.
                  <span className="relative w-9 h-9 rounded-md overflow-hidden bg-surface-warm flex-shrink-0 border border-border-soft">
                    <Image
                      src={row.thumbUrl}
                      alt=""
                      fill
                      sizes="36px"
                      className="object-cover mix-blend-darken"
                    />
                  </span>
                ) : row.initial ? (
                  // Customer avatar — generated initial circle.
                  <span
                    aria-hidden
                    className="w-9 h-9 rounded-full bg-accent-deep/15 text-accent-deep flex items-center justify-center font-sans text-small font-semibold flex-shrink-0"
                  >
                    {row.initial}
                  </span>
                ) : row.icon ? (
                  <span
                    aria-hidden
                    className="w-9 h-9 rounded-md bg-surface-warm flex items-center justify-center text-base flex-shrink-0"
                  >
                    {row.icon}
                  </span>
                ) : null}
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-body font-semibold text-primary-deep truncate">
                    {row.title}
                  </p>
                  {row.sublabel && (
                    <p className="font-sans text-caption text-ink-mute truncate mt-0.5">
                      {row.sublabel}
                    </p>
                  )}
                </div>
                {active && (
                  <span
                    aria-hidden
                    className="font-sans text-micro text-ink-mute"
                  >
                    ↵
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );
}
