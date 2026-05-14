"use client";

import { useEffect, useState } from "react";

/**
 * Admin UI density switch — "Bekväm" (comfortable, default) vs "Tät".
 *
 * Comfortable: 16 px body, 48 px hit targets, 72 px row heights. The
 * starting point for our older user audience.
 *
 * Dense: 14 px body, 40 px hit targets, 56 px rows. For admins coming
 * from Excel / SAP / Visma who prefer to see more rows at once.
 *
 * Persisted to `localStorage["biomax-admin-density"]` so the choice
 * survives across sessions. The attribute lands on the admin shell
 * element via the matching script in `app/admin/layout.tsx`, which
 * runs blocking before paint to avoid a flash of the wrong density.
 */
const STORAGE_KEY = "biomax-admin-density";

type Density = "comfortable" | "dense";

function readStoredDensity(): Density {
  if (typeof window === "undefined") return "comfortable";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "dense" ? "dense" : "comfortable";
}

function applyDensity(d: Density) {
  if (typeof document === "undefined") return;
  const shell = document.querySelector(".admin-shell");
  if (shell) shell.setAttribute("data-density", d);
}

export function DensityToggle() {
  const [density, setDensity] = useState<Density>("comfortable");

  // Read on mount so the toggle reflects the stored value.
  useEffect(() => {
    setDensity(readStoredDensity());
  }, []);

  function pick(next: Density) {
    setDensity(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode / quota — best effort */
    }
    applyDensity(next);
  }

  return (
    <div
      role="radiogroup"
      aria-label="Layouttäthet"
      className="inline-flex items-center gap-1 p-1 rounded-full bg-surface/10"
    >
      <button
        type="button"
        role="radio"
        aria-checked={density === "comfortable"}
        onClick={() => pick("comfortable")}
        className={`px-3 py-1.5 rounded-full font-sans text-[12.5px] font-semibold transition-colors min-w-[80px] ${
          density === "comfortable"
            ? "bg-surface text-primary-deep"
            : "text-surface/70 hover:text-surface"
        }`}
      >
        Bekväm
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={density === "dense"}
        onClick={() => pick("dense")}
        className={`px-3 py-1.5 rounded-full font-sans text-[12.5px] font-semibold transition-colors min-w-[60px] ${
          density === "dense"
            ? "bg-surface text-primary-deep"
            : "text-surface/70 hover:text-surface"
        }`}
      >
        Tät
      </button>
    </div>
  );
}

/**
 * Inline script that runs before paint and writes the stored density
 * onto the admin shell. Prevents a flash where comfortable renders for
 * one frame before the toggle's `useEffect` corrects to dense.
 *
 * Stringified intentionally — Next.js inlines this server-side.
 */
export const densityInitScript = `
(function () {
  try {
    var v = window.localStorage.getItem("${STORAGE_KEY}");
    var d = v === "dense" ? "dense" : "comfortable";
    var s = document.querySelector(".admin-shell");
    if (s) s.setAttribute("data-density", d);
  } catch (_) {}
})();
`.trim();
