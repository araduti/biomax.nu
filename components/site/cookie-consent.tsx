"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Cookie / tracking consent banner.
 *
 * Today we only ship Plausible (cookieless, EU-hosted) so technically
 * we don't need this banner. We render it anyway — the moment we add
 * Meta Pixel / Google Ads / any cross-site tracker, GDPR ePrivacy
 * Directive Article 5(3) (the "cookie law" in Swedish PUL/ePrivacy
 * implementation) requires opt-in *before* the script loads.
 *
 * Architecture:
 *   - Stored in `localStorage["biomax-consent"]` as JSON of the form
 *     `{ functional: true, analytics: bool, marketing: bool, at: ISO }`.
 *     The `functional` row is locked on — strictly necessary for the
 *     site to work (session, cart) and is exempt from consent under
 *     PE Article 5(3)(b).
 *   - First render reads localStorage; missing entry → show banner.
 *   - Banner is dismissed via "Acceptera alla", "Bara nödvändiga",
 *     or "Anpassa". Dismissal writes the consent object.
 *
 * To gate a tracker on `analytics: true`, read `getConsent().analytics`
 * before mounting the script. We don't load any non-functional tracker
 * today so the gating helper is exported for the future.
 */

type Consent = {
  functional: true;
  analytics: boolean;
  marketing: boolean;
  at: string;
};

const STORAGE_KEY = "biomax-consent";

export function readConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Consent>;
    if (typeof parsed?.at !== "string") return null;
    return {
      functional: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      at: parsed.at,
    };
  } catch {
    return null;
  }
}

function writeConsent(c: Consent) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
    // Notify any in-page listeners (e.g. future tracker mount logic)
    window.dispatchEvent(new CustomEvent("biomax:consent-changed", { detail: c }));
  } catch {
    /* ignore — private mode or quota; we'll re-prompt on next visit */
  }
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    // Defer to next tick so SSR-rendered HTML doesn't flash the banner
    // before localStorage is checked.
    const existing = readConsent();
    if (!existing) setVisible(true);
  }, []);

  if (!visible) return null;

  function save(c: { analytics: boolean; marketing: boolean }) {
    writeConsent({
      functional: true,
      analytics: c.analytics,
      marketing: c.marketing,
      at: new Date().toISOString(),
    });
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-label="Cookies och spårning"
      className="fixed bottom-4 left-4 right-4 md:left-6 md:right-auto md:max-w-[440px] z-50 bg-surface-alt border border-border rounded-2xl shadow-2xl p-5 md:p-6"
    >
      {!showDetail ? (
        <>
          <p className="font-display text-lg font-medium tracking-tight text-primary-deep mb-2">
            Cookies och spårning
          </p>
          <p className="font-sans text-[13.5px] text-ink-body leading-relaxed mb-4">
            Vi använder bara nödvändiga cookies för att sajten ska fungera
            (kassan, inloggning). Vill du också hjälpa oss förbättra sidan med
            anonym besökstatistik?{" "}
            <Link
              href="/integritet"
              className="underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent"
            >
              Mer i vår integritetspolicy
            </Link>
            .
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => save({ analytics: true, marketing: true })}
              className="px-4 py-2 rounded-md bg-primary-deep text-surface font-sans text-[13px] font-semibold hover:bg-primary-deep/90 transition-colors"
            >
              Acceptera alla
            </button>
            <button
              type="button"
              onClick={() => save({ analytics: false, marketing: false })}
              className="px-4 py-2 rounded-md border border-border bg-surface font-sans text-[13px] font-semibold text-ink-body hover:bg-surface-warm transition-colors"
            >
              Bara nödvändiga
            </button>
            <button
              type="button"
              onClick={() => setShowDetail(true)}
              className="font-sans text-[12.5px] text-ink-mute underline decoration-accent/30 underline-offset-[3px] hover:text-primary-deep"
            >
              Anpassa
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="font-display text-lg font-medium tracking-tight text-primary-deep mb-3">
            Anpassa cookies
          </p>
          <ul className="space-y-3 mb-5">
            <li className="flex items-start gap-3">
              <input
                type="checkbox"
                checked
                disabled
                className="mt-1 w-4 h-4 accent-primary-deep"
                aria-label="Nödvändiga cookies"
              />
              <div className="flex-1">
                <p className="font-sans text-[13px] font-semibold text-ink-body">
                  Nödvändiga (alltid på)
                </p>
                <p className="font-sans text-[12px] text-ink-mute">
                  Session, kundvagn, säkerhet. Krävs för att kunna handla.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="mt-1 w-4 h-4 accent-primary-deep"
                id="consent-analytics"
              />
              <div className="flex-1">
                <label
                  htmlFor="consent-analytics"
                  className="font-sans text-[13px] font-semibold text-ink-body cursor-pointer"
                >
                  Statistik
                </label>
                <p className="font-sans text-[12px] text-ink-mute">
                  Anonym besökstatistik (Plausible) — hjälper oss förstå vad
                  som funkar. Ingen personlig profil byggs.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                className="mt-1 w-4 h-4 accent-primary-deep"
                id="consent-marketing"
              />
              <div className="flex-1">
                <label
                  htmlFor="consent-marketing"
                  className="font-sans text-[13px] font-semibold text-ink-body cursor-pointer"
                >
                  Marknadsföring
                </label>
                <p className="font-sans text-[12px] text-ink-mute">
                  Pixlar från t.ex. Meta / Google Ads (inte aktivt idag —
                  framtida förberedelse).
                </p>
              </div>
            </li>
          </ul>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => save({ analytics, marketing })}
              className="px-4 py-2 rounded-md bg-primary-deep text-surface font-sans text-[13px] font-semibold hover:bg-primary-deep/90 transition-colors"
            >
              Spara val
            </button>
            <button
              type="button"
              onClick={() => setShowDetail(false)}
              className="font-sans text-[12.5px] text-ink-mute underline decoration-accent/30 underline-offset-[3px] hover:text-primary-deep"
            >
              Tillbaka
            </button>
          </div>
        </>
      )}
    </div>
  );
}
