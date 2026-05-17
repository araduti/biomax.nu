"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Styled confirmation dialog — replaces `window.confirm()` across admin.
 *
 * Native confirm dialogs look 1995-era on macOS and don't respect our
 * design system. This is a modal with an Esc-to-close scrim, focus
 * trapping (basic — autofocus the cancel button), and two intents:
 *
 *   • "default"     — neutral primary button (sage)
 *   • "destructive" — rust primary button + softer cancel
 *
 * Usage via hook:
 *
 *   const confirm = useConfirm();
 *   const ok = await confirm({
 *     title: "Avvisa retur?",
 *     body: "Kunden meddelas och får ingen återbetalning.",
 *     confirmLabel: "Avvisa",
 *     intent: "destructive",
 *   });
 *   if (ok) await reject();
 *
 * Falls back gracefully — the dialog is render-only when `open`.
 */

export type ConfirmOptions = {
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  intent?: "default" | "destructive";
};

type Resolver = (result: boolean) => void;

let currentResolver: Resolver | null = null;
let currentSetOptions: ((next: ConfirmOptions | null) => void) | null = null;

/**
 * Call from anywhere in the admin shell. Returns a Promise that
 * resolves true on confirm, false on cancel/dismiss. Requires
 * `<ConfirmDialogHost />` to be mounted somewhere in the tree.
 */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!currentSetOptions) {
      // Host not mounted — fall back to native confirm so the action
      // doesn't silently fail.
      resolve(window.confirm(`${options.title}\n\n${options.body ?? ""}`));
      return;
    }
    currentResolver = resolve;
    currentSetOptions(options);
  });
}

/** Mount once in `app/admin/layout.tsx`. */
export function ConfirmDialogHost() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    currentSetOptions = setOptions;
    return () => {
      currentSetOptions = null;
    };
  }, []);

  useEffect(() => {
    if (!options) return;
    // Autofocus cancel by default — safer choice if user hits Enter.
    setTimeout(() => cancelRef.current?.focus(), 0);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        resolve(false);
      } else if (e.key === "Enter") {
        // Only fire if focus isn't on cancel — let Enter on cancel close
        // the dialog (it acts as cancel).
        if (document.activeElement !== cancelRef.current) {
          e.preventDefault();
          resolve(true);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options]);

  function resolve(ok: boolean) {
    if (currentResolver) currentResolver(ok);
    currentResolver = null;
    setOptions(null);
  }

  if (!options) return null;
  const intent = options.intent ?? "default";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
    >
      <button
        type="button"
        aria-label="Stäng"
        onClick={() => resolve(false)}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-[440px] bg-surface-alt border border-border-soft rounded-xl shadow-2xl">
        <div className="px-5 pt-4 pb-2 flex items-start justify-between gap-3">
          <h2
            id="confirm-dialog-title"
            className="font-sans text-[15px] font-semibold text-primary-deep leading-snug"
          >
            {options.title}
          </h2>
          <button
            type="button"
            onClick={() => resolve(false)}
            aria-label="Stäng"
            data-admin-compact
            className="-mt-1 -mr-1 w-7 h-7 inline-flex items-center justify-center rounded-md text-ink-mute hover:bg-surface-warm"
          >
            <X size={14} strokeWidth={1.75} aria-hidden />
          </button>
        </div>
        {options.body && (
          <div className="px-5 pb-4 font-sans text-[13.5px] text-ink-body leading-relaxed">
            {options.body}
          </div>
        )}
        <div className="px-5 py-3.5 border-t border-border-soft flex items-center justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={() => resolve(false)}
            className="h-9 px-4 rounded-md font-sans text-[13px] font-semibold text-ink-body hover:bg-surface-warm transition-colors"
          >
            {options.cancelLabel ?? "Avbryt"}
          </button>
          <button
            type="button"
            onClick={() => resolve(true)}
            className={
              intent === "destructive"
                ? "h-9 px-4 rounded-md bg-status-error text-surface font-sans text-[13px] font-semibold hover:bg-[#9a4632] transition-colors"
                : "h-9 px-4 rounded-md bg-primary-deep text-surface font-sans text-[13px] font-semibold hover:bg-primary transition-colors"
            }
          >
            {options.confirmLabel ?? "Bekräfta"}
          </button>
        </div>
      </div>
    </div>
  );
}
