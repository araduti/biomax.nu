"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Search input — submits as a GET to /sok?q=… so the URL is shareable
 * and indexable. Lives on the /sok page itself; the header "Sök" button
 * navigates to /sok where this input takes focus on mount.
 */
export function SearchInput({ initialQuery = "" }: { initialQuery?: string }) {
  const [q, setQ] = useState(initialQuery);
  const router = useRouter();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    if (trimmed.length < 2) return;
    router.push(`/sok?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      className="flex gap-2 items-center bg-surface border border-border rounded-full px-4 py-2"
    >
      <svg
        aria-hidden
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-ink-soft flex-shrink-0"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
      <input
        type="search"
        name="q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Sök produkter, ingredienser, behov…"
        autoFocus={initialQuery.length === 0}
        className="flex-1 bg-transparent border-none outline-none font-sans text-[15px] text-ink-body placeholder:text-ink-soft"
        autoComplete="off"
      />
      <button
        type="submit"
        disabled={q.trim().length < 2}
        className="px-4 py-1.5 rounded-full bg-primary-deep text-surface font-sans text-[13px] font-semibold hover:bg-primary-deep/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Sök
      </button>
    </form>
  );
}
