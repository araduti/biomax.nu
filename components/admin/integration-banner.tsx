"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import type { IntegrationStatus } from "@/lib/admin/integration-status";

/**
 * Top-of-admin banner that surfaces unconfigured integrations.
 *
 * Dismiss model:
 *   - "✕" hides for the current session (sessionStorage)
 *   - "Visa inte igen" hides permanently (localStorage). Useful when an
 *     editor knows the integration is intentionally off and doesn't
 *     want a daily nudge.
 *
 * Tone:
 *   - Muted neutral when there are unconfigured items but they're
 *     informational (no broken state). Previously rendered in loud
 *     amber pill chrome which clashed with the rest of the admin's
 *     cool palette and felt like a fix-this warning even for benign
 *     things ("Unsplash not configured — admin keeps working").
 */
const SESSION_KEY = "biomax-admin-integration-banner-dismissed";
const FOREVER_KEY = "biomax-admin-integration-banner-dismissed-forever";

export function IntegrationBanner({
  statuses,
}: {
  statuses: IntegrationStatus[];
}) {
  // Initial state assumes dismissed so SSR renders nothing → first paint
  // matches; useEffect re-checks both storage layers and reveals the
  // banner only if the user hasn't dismissed it.
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      const forever = window.localStorage.getItem(FOREVER_KEY) === "1";
      if (forever) {
        setDismissed(true);
        return;
      }
      const session = window.sessionStorage.getItem(SESSION_KEY) === "1";
      setDismissed(session);
    } catch {
      setDismissed(false);
    }
  }, []);

  function dismissForSession() {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* private mode / quota — best effort */
    }
  }

  function dismissForever() {
    setDismissed(true);
    try {
      window.localStorage.setItem(FOREVER_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  const unconfigured = statuses.filter((s) => !s.configured);
  if (unconfigured.length === 0) return null;
  if (dismissed) return null;

  // Non-sticky on purpose. Previously this rendered as `sticky top-0
  // z-30` which collided with the AdminTopbar (`sticky top-0 z-20`) —
  // when scrolled, the banner pinned itself over the topbar's Cmd-K
  // search bar and made it look like the banner was hovering "in the
  // middle of the page content" because the user scrolled past its
  // natural document position. The banner is informational and
  // dismissable; it doesn't need to follow scroll, the topbar does.
  return (
    <div className="bg-surface-warm border-b border-border-soft">
      <div className="flex items-center gap-3 px-6 md:px-8 lg:px-9 py-2 flex-wrap">
        <span className="font-sans text-[12.5px] uppercase tracking-[0.16em] font-semibold text-ink-mute">
          {unconfigured.length === 1
            ? "1 integration ej konfigurerad"
            : `${unconfigured.length} integrationer ej konfigurerade`}
        </span>
        <div className="flex items-center gap-1.5 flex-wrap flex-1">
          {unconfigured.map((s) => (
            <Link
              key={s.id}
              href={s.helpHref}
              title={s.warningCopy}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-surface border border-border-soft font-sans text-[13px] font-semibold text-ink-body hover:bg-surface-alt hover:border-border transition-colors"
            >
              {s.label}
            </Link>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={dismissForever}
            data-admin-compact
            className="h-7 px-2.5 inline-flex items-center font-sans text-[12.5px] text-ink-mute hover:text-ink-body transition-colors"
          >
            Visa inte igen
          </button>
          <button
            type="button"
            onClick={dismissForSession}
            aria-label="Göm tills nästa session"
            title="Göm tills nästa session"
            data-admin-compact
            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-ink-mute hover:bg-surface-alt hover:text-ink-body transition-colors"
          >
            <X size={14} strokeWidth={1.75} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
