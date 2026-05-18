"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  GripVertical,
  X,
  Plus,
  Maximize2,
  Minimize2,
} from "lucide-react";
import {
  ALL_WIDGETS,
  defaultPrefs,
  effectiveWidth,
  readPrefs,
  writePrefs,
  type WidgetId,
  type WidgetPrefs,
  type WidgetWidth,
} from "@/lib/admin/widget-prefs";
import { useOverviewEdit } from "./overview-edit-context";

/**
 * Customizable widget grid for /admin (Översikt).
 *
 * Server renders all widget contents into a `Record<WidgetId, ReactNode>`.
 * This client component then:
 *   1. reads the user's preferences from localStorage on mount
 *   2. renders visible widgets in the user-chosen order
 *   3. provides an Edit/Done toggle that reveals X-dismiss buttons,
 *      drag-handles, and a dashed "Lägg till widget"-placeholder
 *   4. opens a picker modal listing hidden widgets when the user
 *      clicks the placeholder
 *
 * Drag-to-reorder uses HTML5 native DnD — single-column reorder is
 * simple enough that pulling in @dnd-kit would be overkill.
 *
 * Hydration: server renders the default order, then the useEffect
 * re-renders with stored prefs. Each widget's JSX is stable across
 * renders so React handles the reordering via keyed children without
 * a hydration warning.
 */
export function OverviewWidgetGrid({
  widgets,
}: {
  widgets: Record<WidgetId, ReactNode>;
}) {
  const [prefs, setPrefs] = useState<WidgetPrefs>(defaultPrefs());
  // Edit-mode state lives in context so the toggle button can render
  // inside AdminPageHeader.actions (next to the page title) instead of
  // tucked above the grid where it was hard to discover. `resetTick`
  // bumps each time the user clicks "Återställ" — we listen and snap
  // prefs back to defaults.
  const { editing, resetTick } = useOverviewEdit();
  const [dragId, setDragId] = useState<WidgetId | null>(null);
  const [hoverId, setHoverId] = useState<WidgetId | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    setPrefs(readPrefs());
  }, []);

  useEffect(() => {
    writePrefs(prefs);
  }, [prefs]);

  // Reset → re-apply defaults. Skip the initial mount tick (resetTick=0
  // is the seeded value, not a user action). writePrefs runs in the
  // standard effect above as a side-effect of `setPrefs(defaultPrefs())`.
  useEffect(() => {
    if (resetTick === 0) return;
    setPrefs(defaultPrefs());
  }, [resetTick]);

  const visibleIds = prefs.order.filter((id) => !prefs.hidden.includes(id));
  const hiddenIds = prefs.order.filter((id) => prefs.hidden.includes(id));

  function hide(id: WidgetId) {
    setPrefs((p) => ({ ...p, hidden: [...new Set([...p.hidden, id])] }));
  }
  function show(id: WidgetId) {
    setPrefs((p) => ({ ...p, hidden: p.hidden.filter((h) => h !== id) }));
  }
  function moveBefore(from: WidgetId, to: WidgetId) {
    if (from === to) return;
    setPrefs((p) => {
      const order = p.order.filter((x) => x !== from);
      const idx = order.indexOf(to);
      order.splice(idx, 0, from);
      return { ...p, order };
    });
  }
  function toggleWidth(id: WidgetId) {
    setPrefs((p) => {
      const current = effectiveWidth(p, id);
      const next: WidgetWidth = current === "full" ? "half" : "full";
      return { ...p, widths: { ...p.widths, [id]: next } };
    });
  }

  return (
    <>
      {/* 2-col CSS Grid. Each widget chooses col-span-1 (half) or
          col-span-2 (full) — auto-flow handles the rest. Two consecutive
          halves sit side-by-side; a full breaks to its own row; a half
          followed by a full leaves no gap (the half is alone on its row).
          On narrow viewports collapses to single column so all widgets
          go full-width automatically.

          `items-start` so a short widget (1-row "Senaste ordrar") next
          to a tall widget (5-row "Lågt lager") doesn't get stretched
          to match — the default `stretch` alignment created a sea of
          cream below the shorter widget. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10 items-start">
        {visibleIds.map((id) => {
          const def = ALL_WIDGETS.find((w) => w.id === id);
          if (!def) return null;
          const content = widgets[id];
          if (!content) return null;
          const width = effectiveWidth(prefs, id);
          const isHover = editing && hoverId === id && dragId && dragId !== id;
          return (
            <div
              key={id}
              draggable={editing}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                setDragId(id);
              }}
              onDragEnd={() => {
                setDragId(null);
                setHoverId(null);
              }}
              onDragOver={(e) => {
                if (!editing || !dragId) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setHoverId(id);
              }}
              onDragLeave={() =>
                setHoverId((curr) => (curr === id ? null : curr))
              }
              onDrop={(e) => {
                if (!editing || !dragId) return;
                e.preventDefault();
                moveBefore(dragId, id);
                setDragId(null);
                setHoverId(null);
              }}
              className={`relative transition-all ${
                width === "full" ? "md:col-span-2" : "md:col-span-1"
              } ${
                editing
                  ? "ring-1 ring-border-soft rounded-xl p-4 bg-surface-alt/60"
                  : ""
              } ${dragId === id ? "opacity-40" : ""} ${
                isHover ? "ring-2 ring-primary-deep/40" : ""
              }`}
            >
              {editing && (
                <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleWidth(id)}
                    aria-label={
                      width === "full"
                        ? "Krymp till halv bredd"
                        : "Expandera till full bredd"
                    }
                    title={
                      width === "full"
                        ? "Krymp till halv bredd"
                        : "Expandera till full bredd"
                    }
                    data-admin-compact
                    className="inline-flex items-center justify-center w-7 h-7 rounded-md text-ink-mute hover:bg-surface-warm hover:text-primary-deep transition-colors"
                  >
                    {width === "full" ? (
                      <Minimize2 size={13} strokeWidth={1.75} aria-hidden />
                    ) : (
                      <Maximize2 size={13} strokeWidth={1.75} aria-hidden />
                    )}
                  </button>
                  <span
                    className="inline-flex items-center justify-center w-7 h-7 rounded-md text-ink-mute hover:bg-surface-warm cursor-grab active:cursor-grabbing"
                    aria-label="Dra för att flytta"
                    title="Dra för att flytta"
                    data-admin-compact
                  >
                    <GripVertical size={14} strokeWidth={1.75} aria-hidden />
                  </span>
                  <button
                    type="button"
                    onClick={() => hide(id)}
                    aria-label={`Göm ${def.label}`}
                    title="Göm widget"
                    data-admin-compact
                    className="inline-flex items-center justify-center w-7 h-7 rounded-md text-ink-mute hover:bg-status-error/10 hover:text-status-error transition-colors"
                  >
                    <X size={14} strokeWidth={1.75} aria-hidden />
                  </button>
                </div>
              )}
              {content}
            </div>
          );
        })}

        {editing && hiddenIds.length > 0 && (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="md:col-span-2 border-2 border-dashed border-border-soft rounded-xl py-10 flex flex-col items-center justify-center gap-2 text-ink-mute hover:border-primary-deep/60 hover:text-primary-deep hover:bg-surface-warm transition-colors"
          >
            <Plus size={20} strokeWidth={1.75} aria-hidden />
            <span className="font-sans text-small font-semibold">
              Lägg till widget
            </span>
            <span className="font-sans text-micro text-ink-soft">
              {hiddenIds.length}{" "}
              {hiddenIds.length === 1 ? "tillgänglig" : "tillgängliga"}
            </span>
          </button>
        )}
      </div>

      {pickerOpen && (
        <WidgetPicker
          hiddenIds={hiddenIds}
          onPick={(id) => {
            show(id);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  );
}

function WidgetPicker({
  hiddenIds,
  onPick,
  onClose,
}: {
  hiddenIds: WidgetId[];
  onPick: (id: WidgetId) => void;
  onClose: () => void;
}) {
  // Close on Esc
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Lägg till widget"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <button
        type="button"
        aria-label="Stäng"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-[480px] bg-surface-alt border border-border-soft rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-soft">
          <h2 className="font-sans text-body-lg font-semibold text-primary-deep">
            Lägg till widget
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Stäng"
            data-admin-compact
            className="w-8 h-8 inline-flex items-center justify-center rounded-md text-ink-mute hover:bg-surface-warm"
          >
            <X size={15} strokeWidth={1.75} aria-hidden />
          </button>
        </div>
        <ul className="p-2">
          {hiddenIds.map((id) => {
            const def = ALL_WIDGETS.find((w) => w.id === id);
            if (!def) return null;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onPick(id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-surface-warm transition-colors text-left"
                >
                  <Plus size={14} strokeWidth={1.75} className="text-ink-mute flex-shrink-0" aria-hidden />
                  <span className="font-sans text-small font-medium text-ink-body">
                    {def.label}
                  </span>
                </button>
              </li>
            );
          })}
          {hiddenIds.length === 0 && (
            <li className="px-3 py-6 text-center font-sans text-small text-ink-mute italic">
              Inga gömda widgets — alla visas redan.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
