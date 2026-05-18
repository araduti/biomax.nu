"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { Pencil, Check, RotateCcw } from "lucide-react";

/**
 * Edit-mode state for the customizable widget grid on /admin (Översikt).
 *
 * Lives in context so the toggle button can sit in AdminPageHeader's
 * `actions` slot (discoverable, next to the page title) while the grid
 * itself reads/writes the same flag from below.
 *
 * Carries a `resetTick` counter the grid watches via useEffect; bumping
 * it requests a reset to default widget order/visibility/widths. The
 * actual reset logic lives in the grid (it owns the prefs state) — the
 * context just signals "user asked to reset". Counter approach beats a
 * boolean flag because consecutive resets fire useEffect each time
 * even when the value is "still true".
 */
type Ctx = {
  editing: boolean;
  setEditing: (next: boolean) => void;
  resetTick: number;
  requestReset: () => void;
};

const OverviewEditCtx = createContext<Ctx | null>(null);

export function OverviewEditProvider({ children }: { children: ReactNode }) {
  const [editing, setEditing] = useState(false);
  const [resetTick, setResetTick] = useState(0);
  const requestReset = useCallback(() => setResetTick((n) => n + 1), []);
  return (
    <OverviewEditCtx.Provider
      value={{ editing, setEditing, resetTick, requestReset }}
    >
      {children}
    </OverviewEditCtx.Provider>
  );
}

export function useOverviewEdit(): Ctx {
  const ctx = useContext(OverviewEditCtx);
  if (!ctx) {
    throw new Error("useOverviewEdit must be used inside OverviewEditProvider");
  }
  return ctx;
}

/**
 * The toggle cluster. Renders as a small toolbar with two states:
 *
 *   - Idle:    [ ✏️ Anpassa översikt ]
 *   - Editing: [ ↺ Återställ standard ]  [ ✓ Klar ]
 *
 * Drop into AdminPageHeader.actions on the Översikt page so it lives
 * next to the title — much more discoverable than the previous "tucked
 * above the first widget" placement.
 */
export function OverviewEditToggle() {
  const { editing, setEditing, requestReset } = useOverviewEdit();
  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-border-soft bg-surface-alt font-sans text-small font-semibold text-ink-body hover:bg-surface-warm hover:border-border transition-colors"
        data-admin-compact
      >
        <Pencil size={13} strokeWidth={1.75} aria-hidden />
        Anpassa översikt
      </button>
    );
  }
  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={requestReset}
        title="Återställ widgetordning och bredder till standardvärden"
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md font-sans text-caption font-semibold text-ink-mute hover:text-primary-deep hover:bg-surface-warm transition-colors"
        data-admin-compact
      >
        <RotateCcw size={13} strokeWidth={1.75} aria-hidden />
        Återställ
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-primary-deep text-surface font-sans text-small font-semibold hover:bg-primary transition-colors"
        data-admin-compact
      >
        <Check size={14} strokeWidth={2} aria-hidden />
        Klar
      </button>
    </div>
  );
}
