"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { recordConsent } from "@/lib/consent/actions";
import { CONSENT_SUBJECT_KEY } from "@/lib/consent/constants";

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

/**
 * Stable per-visitor id so a chain of consent events (grant → withdraw →
 * re-grant) correlates server-side (ADR 0023). Random, not derived from
 * any PII. Survives in localStorage; if it's wiped we mint a fresh one
 * and the next event simply starts a new chain — acceptable.
 */
function getSubjectKey(): string {
  try {
    const existing = window.localStorage.getItem(CONSENT_SUBJECT_KEY);
    if (existing) return existing;
    const minted =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `ck_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
    window.localStorage.setItem(CONSENT_SUBJECT_KEY, minted);
    return minted;
  } catch {
    // Private mode / no storage — still produce something usable for
    // this one event so the proof row isn't lost.
    return `ck_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
  }
}

type ConsentSource =
  | "banner-accept-all"
  | "banner-necessary-only"
  | "banner-custom";

function logConsentServerSide(
  analytics: boolean,
  marketing: boolean,
  source: ConsentSource
) {
  // Fire-and-forget — never block the banner on the network/DB. The
  // server action is itself fail-soft (ADR 0023).
  void recordConsent({
    subjectKey: getSubjectKey(),
    analytics,
    marketing,
    source,
  }).catch(() => {});
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

    // Re-open on demand (footer "Cookie-inställningar") so withdrawing
    // consent is as easy as giving it — GDPR Art. 7(3). Pre-fill the
    // toggles from the stored choice so the panel reflects current state.
    function reopen() {
      const current = readConsent();
      setAnalytics(current?.analytics ?? true);
      setMarketing(current?.marketing ?? false);
      setShowDetail(true);
      setVisible(true);
    }
    window.addEventListener("biomax:open-consent", reopen);
    return () => window.removeEventListener("biomax:open-consent", reopen);
  }, []);

  if (!visible) return null;

  function save(
    c: { analytics: boolean; marketing: boolean },
    source: ConsentSource
  ) {
    writeConsent({
      functional: true,
      analytics: c.analytics,
      marketing: c.marketing,
      at: new Date().toISOString(),
    });
    logConsentServerSide(c.analytics, c.marketing, source);
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
          <p className="font-sans text-small text-ink-body leading-relaxed mb-4">
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
              onClick={() =>
                save(
                  { analytics: true, marketing: true },
                  "banner-accept-all"
                )
              }
              className="px-4 py-2 rounded-md bg-primary-deep text-surface font-sans text-small font-semibold hover:bg-primary-deep/90 transition-colors"
            >
              Acceptera alla
            </button>
            <button
              type="button"
              onClick={() =>
                save(
                  { analytics: false, marketing: false },
                  "banner-necessary-only"
                )
              }
              className="px-4 py-2 rounded-md border border-border bg-surface font-sans text-small font-semibold text-ink-body hover:bg-surface-warm transition-colors"
            >
              Bara nödvändiga
            </button>
            <button
              type="button"
              onClick={() => setShowDetail(true)}
              className="font-sans text-caption text-ink-mute underline decoration-accent/30 underline-offset-[3px] hover:text-primary-deep"
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
                <p className="font-sans text-small font-semibold text-ink-body">
                  Nödvändiga (alltid på)
                </p>
                <p className="font-sans text-caption text-ink-mute">
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
                  className="font-sans text-small font-semibold text-ink-body cursor-pointer"
                >
                  Statistik
                </label>
                <p className="font-sans text-caption text-ink-mute">
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
                  className="font-sans text-small font-semibold text-ink-body cursor-pointer"
                >
                  Marknadsföring
                </label>
                <p className="font-sans text-caption text-ink-mute">
                  Pixlar från t.ex. Meta / Google Ads (inte aktivt idag —
                  framtida förberedelse).
                </p>
              </div>
            </li>
          </ul>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                save({ analytics, marketing }, "banner-custom")
              }
              className="px-4 py-2 rounded-md bg-primary-deep text-surface font-sans text-small font-semibold hover:bg-primary-deep/90 transition-colors"
            >
              Spara val
            </button>
            <button
              type="button"
              onClick={() => setShowDetail(false)}
              className="font-sans text-caption text-ink-mute underline decoration-accent/30 underline-offset-[3px] hover:text-primary-deep"
            >
              Tillbaka
            </button>
          </div>
        </>
      )}
    </div>
  );
}
