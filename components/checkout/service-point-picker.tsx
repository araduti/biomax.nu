"use client";

import { useEffect, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import type {
  FindServicePointsResult,
  ServicePoint,
} from "@/lib/postnord/types";

const SWE_POSTCODE_RE = /^\d{3}\s?\d{2}$/;

function formatDistance(metres: number): string {
  if (metres < 1000) return `${metres} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}

/**
 * Phase A surface: postal-code input → server route → list of ombud →
 * radio-select. The picker owns no persistence yet; it bubbles the
 * chosen point up via `onSelect` so the checkout flow can stash it
 * however it likes (form state, sessionStorage, hidden input, etc.).
 *
 * Wraps the live API in a small loading state because PostNord latency
 * is ~200–500ms; we want the user to know something is happening.
 */
export function ServicePointPicker({
  defaultPostalCode = "",
  selectedId = null,
  onSelect,
}: {
  defaultPostalCode?: string;
  selectedId?: string | null;
  onSelect: (point: ServicePoint | null) => void;
}) {
  const [postalCode, setPostalCode] = useState(defaultPostalCode);
  const [points, setPoints] = useState<ServicePoint[]>([]);
  const [mode, setMode] = useState<"stub" | "live" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Auto-fetch on initial mount if we have a default postcode.
  useEffect(() => {
    if (defaultPostalCode && SWE_POSTCODE_RE.test(defaultPostalCode)) {
      fetchPoints(defaultPostalCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function fetchPoints(code: string) {
    setError(null);
    setPoints([]);
    onSelect(null);
    start(async () => {
      const res = await fetch(
        `/api/postnord/service-points?postalCode=${encodeURIComponent(code)}&limit=5`
      );
      const json = (await res.json()) as FindServicePointsResult;
      if (!json.ok) {
        setError(json.error);
        setMode(null);
        return;
      }
      setPoints(json.points);
      setMode(json.mode);
    });
  }

  function submitPostal() {
    if (!SWE_POSTCODE_RE.test(postalCode)) {
      setError("Ange ett giltigt postnummer (5 siffror).");
      return;
    }
    fetchPoints(postalCode);
  }

  // We render a plain div instead of a <form> because the picker is mounted
  // inside the checkout's own <form>, and nested forms are invalid HTML.
  // Enter on the postal-code input triggers the same lookup.
  return (
    <div>
      <div className="flex items-end gap-3 max-w-[420px]">
        <div className="flex-1">
          <label
            htmlFor="postal-code"
            className="block font-sans text-caption font-semibold text-ink-soft mb-1.5"
          >
            Postnummer
          </label>
          <Input
            id="postal-code"
            inputMode="numeric"
            autoComplete="postal-code"
            value={postalCode}
            onChange={(e) =>
              setPostalCode(
                e.target.value.replace(/[^0-9\s]/g, "").slice(0, 6)
              )
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitPostal();
              }
            }}
            placeholder="428 36"
            disabled={pending}
          />
        </div>
        <button
          type="button"
          onClick={submitPostal}
          disabled={pending || !postalCode}
          className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-primary-deep text-surface font-sans text-small font-semibold hover:bg-primary-deep/90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {pending ? "Söker…" : "Hitta ombud"}
        </button>
      </div>

      {mode === "stub" && (
        <p className="mt-2 font-sans text-micro text-status-warn-text italic">
          Visar exempeldata — riktiga ombud kopplas på när PostNord-nyckeln är
          aktiverad.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-3 font-sans text-caption text-status-error bg-status-error/10 px-3 py-2 rounded-md"
        >
          {error}
        </p>
      )}

      {points.length > 0 && (
        <ul className="mt-5 space-y-2">
          {points.map((p) => {
            const isSelected = selectedId === p.id;
            return (
              <li key={p.id}>
                <label
                  className={`flex items-start gap-3 cursor-pointer rounded-xl border p-4 transition-colors ${
                    isSelected
                      ? "border-accent-deep bg-accent/5"
                      : "border-border bg-surface hover:border-border-soft hover:bg-surface-warm"
                  }`}
                >
                  <input
                    type="radio"
                    name="service-point"
                    value={p.id}
                    checked={isSelected}
                    onChange={() => onSelect(p)}
                    className="mt-1 w-4 h-4"
                  />
                  <span className="flex-1 min-w-0">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="font-sans text-body font-semibold text-primary-deep truncate">
                        {p.name}
                      </span>
                      <span className="font-sans text-micro text-ink-soft whitespace-nowrap tabular-nums">
                        {formatDistance(p.distanceM)}
                      </span>
                    </span>
                    <span className="block mt-0.5 font-sans text-caption text-ink-mute">
                      {p.street}, {p.postalCode} {p.city}
                    </span>
                    <span className="block mt-1 font-sans text-micro text-ink-soft">
                      Idag {p.openTodayLabel}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
