"use client";

import { useState } from "react";

/**
 * One-tap copy-to-clipboard button. Two seconds of confirmation
 * feedback ("Kopierat") so the click registers — older users like to
 * see the system acknowledge the action before they look away.
 *
 * The label says what was copied (e.g. "Kopiera adress") rather than a
 * generic icon. Compact form factor — `data-admin-compact` opts out of
 * the 48 px admin-shell hit-floor so the button sits inline with text.
 */
export function CopyButton({
  value,
  label = "Kopiera",
  className = "",
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onClick() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Some browsers refuse clipboard write without a user-gesture
      // wrapper or HTTPS. Silently fail; the user can still select +
      // copy manually.
    }
  }

  return (
    <button
      type="button"
      data-admin-compact
      onClick={onClick}
      aria-label={`${label}: ${value}`}
      className={
        "inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md border border-border bg-surface font-sans text-caption font-semibold text-ink-mute hover:text-ink-body hover:border-border-soft transition-colors " +
        className
      }
    >
      <span aria-hidden className="text-small leading-none">
        {copied ? "✓" : "⧉"}
      </span>
      <span>{copied ? "Kopierat" : label}</span>
    </button>
  );
}
