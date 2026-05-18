"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Two-factor (TOTP) self-service panel.
 *
 * State machine:
 *   - off                 → "Aktivera"-button.
 *   - confirming-password → enter current password to authorise enrol.
 *   - showing-qr          → render a scannable QR of the otpauth URI
 *                           + the manual-entry secret + backup codes;
 *                           user scans, then types the 6-digit code.
 *   - on                  → "Stäng av"-button (re-prompts for password).
 *
 * The QR is generated **client-side** (`qrcode`) into a data URL — the
 * TOTP secret never touches the network or a third party. The raw
 * otpauth URI + the bare secret are kept as manual-entry fallbacks
 * (password managers / apps without a camera).
 */
type Mode = "off" | "confirming" | "showing-qr" | "on";

export function TwoFactorPanel({
  initiallyEnabled,
}: {
  initiallyEnabled: boolean;
}) {
  const [mode, setMode] = useState<Mode>(initiallyEnabled ? "on" : "off");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enrolment, setEnrolment] = useState<{
    totpURI: string;
    backupCodes: string[];
  } | null>(null);
  const [pending, start] = useTransition();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const router = useRouter();

  // Render the otpauth URI to a QR data URL locally (no network).
  const totpURI = enrolment?.totpURI;
  useEffect(() => {
    if (!totpURI) return;
    let cancelled = false;
    QRCode.toDataURL(totpURI, { margin: 1, width: 220 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null); // URI/secret fallback still shown
      });
    return () => {
      cancelled = true;
    };
  }, [totpURI]);

  // Bare secret for "add manually" in authenticator apps.
  const manualSecret = enrolment?.totpURI
    ? new URLSearchParams(enrolment.totpURI.split("?")[1] ?? "").get("secret")
    : null;

  function reset() {
    setPassword("");
    setCode("");
    setError(null);
    setEnrolment(null);
  }

  function startEnable() {
    setMode("confirming");
    reset();
  }

  function confirmEnable() {
    if (!password) {
      setError("Ange ditt lösenord för att fortsätta.");
      return;
    }
    setError(null);
    start(async () => {
      const result = await authClient.twoFactor.enable({ password });
      if (result.error) {
        setError(result.error.message ?? "Kunde inte starta tvåfaktor.");
        return;
      }
      // Better Auth returns { totpURI, backupCodes } when enrolment
      // succeeds — the user must verify a code from their app before
      // 2FA actually starts protecting the account.
      setEnrolment(result.data as { totpURI: string; backupCodes: string[] });
      setPassword("");
      setMode("showing-qr");
    });
  }

  function verifyEnrolment() {
    if (!/^\d{6}$/.test(code)) {
      setError("Ange den sexsiffriga koden från din app.");
      return;
    }
    setError(null);
    start(async () => {
      const result = await authClient.twoFactor.verifyTotp({ code });
      if (result.error) {
        setError(result.error.message ?? "Koden stämde inte. Försök igen.");
        return;
      }
      setMode("on");
      reset();
      router.refresh();
    });
  }

  function startDisable() {
    setMode("confirming");
    reset();
    // Re-use the password field for disable flow — set a flag via mode.
  }

  function confirmDisable() {
    if (!password) {
      setError("Ange ditt lösenord för att fortsätta.");
      return;
    }
    setError(null);
    start(async () => {
      const result = await authClient.twoFactor.disable({ password });
      if (result.error) {
        setError(result.error.message ?? "Kunde inte stänga av tvåfaktor.");
        return;
      }
      setMode("off");
      reset();
      router.refresh();
    });
  }

  // Show-QR state
  if (mode === "showing-qr" && enrolment) {
    return (
      <div className="bg-surface-alt border border-border rounded-2xl p-6 max-w-[640px]">
        <h3 className="font-display text-xl font-medium text-primary-deep mb-2">
          Skanna in i din app
        </h3>
        <p className="font-sans text-small text-ink-mute mb-4 leading-relaxed">
          Skanna QR-koden med din authenticator-app (Google Authenticator,
          1Password, Authy m.fl.). Kan du inte skanna? Lägg till manuellt
          med nyckeln nedan. Spara backup-koderna — du behöver dem om du
          tappar telefonen.
        </p>

        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrDataUrl}
            alt="QR-kod för tvåfaktorsinloggning"
            width={220}
            height={220}
            className="mb-4 rounded-md border border-border bg-white p-2"
          />
        ) : (
          <p className="font-sans text-small text-ink-mute mb-4">
            Kunde inte rita QR-koden — använd den manuella nyckeln nedan.
          </p>
        )}

        {manualSecret && (
          <>
            <p className="font-sans text-caption uppercase tracking-[0.16em] font-semibold text-ink-soft mb-2">
              Manuell nyckel
            </p>
            <pre className="block w-full overflow-x-auto bg-surface border border-border rounded-md px-3 py-2 font-mono text-small tracking-wider text-ink-body mb-4 break-all">
              {manualSecret}
            </pre>
          </>
        )}

        <details className="mb-4">
          <summary className="font-sans text-small text-ink-soft cursor-pointer hover:text-ink-body">
            Visa hela otpauth-URL:en
          </summary>
          <pre className="mt-2 block w-full overflow-x-auto bg-surface border border-border rounded-md px-3 py-2 font-mono text-caption text-ink-body whitespace-pre-wrap break-all">
            {enrolment.totpURI}
          </pre>
        </details>

        <p className="font-sans text-caption uppercase tracking-[0.16em] font-semibold text-ink-soft mb-2">
          Backup-koder · spara säkert
        </p>
        <div className="grid grid-cols-2 gap-1 font-mono text-small text-ink-body bg-surface border border-border rounded-md p-3 mb-5">
          {enrolment.backupCodes.map((c) => (
            <code key={c}>{c}</code>
          ))}
        </div>

        <div className="border-t border-border pt-5">
          <Input
            label="Sexsiffrig kod från appen"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            maxLength={6}
            inputMode="numeric"
            disabled={pending}
          />
          {error && (
            <p
              role="alert"
              className="mt-2 font-sans text-caption text-status-error"
            >
              {error}
            </p>
          )}
          <div className="mt-4 flex gap-3">
            <Button
              type="button"
              onClick={verifyEnrolment}
              disabled={pending}
            >
              {pending ? "Verifierar…" : "Aktivera"}
            </Button>
            <button
              type="button"
              onClick={() => {
                setMode("off");
                reset();
              }}
              className="font-sans text-small text-ink-soft hover:text-ink-body"
            >
              Avbryt
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "confirming") {
    const disabling = initiallyEnabled;
    return (
      <div className="bg-surface-alt border border-border rounded-2xl p-6 max-w-[480px]">
        <h3 className="font-display text-lg font-medium text-primary-deep mb-3">
          {disabling
            ? "Bekräfta att du vill stänga av tvåfaktor"
            : "Bekräfta ditt lösenord"}
        </h3>
        <Input
          label="Lösenord"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={pending}
          autoComplete="current-password"
        />
        {error && (
          <p role="alert" className="mt-2 font-sans text-caption text-status-error">
            {error}
          </p>
        )}
        <div className="mt-4 flex gap-3">
          <Button
            type="button"
            onClick={disabling ? confirmDisable : confirmEnable}
            disabled={pending}
          >
            {pending ? "…" : disabling ? "Stäng av" : "Fortsätt"}
          </Button>
          <button
            type="button"
            onClick={() => {
              setMode(initiallyEnabled ? "on" : "off");
              reset();
            }}
            className="font-sans text-small text-ink-soft hover:text-ink-body"
          >
            Avbryt
          </button>
        </div>
      </div>
    );
  }

  // Steady states
  return (
    <div className="bg-surface-alt border border-border rounded-2xl p-5 max-w-[480px]">
      <p className="font-sans text-body mb-4">
        Status:{" "}
        <strong className={mode === "on" ? "text-accent-deep" : "text-ink-soft"}>
          {mode === "on" ? "Aktiverad" : "Inte aktiverad"}
        </strong>
      </p>
      {mode === "on" ? (
        <Button type="button" variant="outline" onClick={startDisable}>
          Stäng av tvåfaktor
        </Button>
      ) : (
        <Button type="button" onClick={startEnable}>
          Aktivera tvåfaktor
        </Button>
      )}
    </div>
  );
}
