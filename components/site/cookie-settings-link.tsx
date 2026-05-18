"use client";

/**
 * Footer trigger that re-opens the cookie-consent panel (ADR 0023 /
 * GDPR Art. 7(3) — withdrawal must be as easy as granting). Dispatches
 * the event the always-mounted <CookieConsent> listens for; styled to
 * match the surrounding footer links.
 */
export function CookieSettingsLink() {
  return (
    <button
      type="button"
      onClick={() =>
        window.dispatchEvent(new CustomEvent("biomax:open-consent"))
      }
      className="font-sans text-sm text-surface/80 hover:text-surface transition-colors text-left"
    >
      Cookie-inställningar
    </button>
  );
}
