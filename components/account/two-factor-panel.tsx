"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Two-factor (TOTP) self-service panel.
 *
 * State machine:
 *   - off                 → "Aktivera"-button.
 *   - confirming-password → enter current password to authorise enrol.
 *   - showing-qr          → render the otpauth URI as a QR-friendly URL
 *                           + manual key + backup codes; user scans into
 *                           their authenticator, types the 6-digit code.
 *   - on                  → "Stäng av"-button (re-prompts for password).
 *
 * We don't render an actual QR image — the URL is shown and the user can
 * paste into their authenticator manually. Authenticator apps also accept
 * the secret directly via a copy-paste field. (A real QR image would
 * require either a server-side renderer or a client dep; deferred — for
 * the v1 admin use case the URL works.)
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
  const router = useRouter();

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
      setError("Ange den sex-siffriga koden från din app.");
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
        <p className="font-sans text-[13.5px] text-ink-mute mb-4 leading-relaxed">
          Kopiera URL:en nedan och klistra in i din authenticator-app (eller
          använd appens &quot;lägg till manuellt&quot; för hemligheten direkt).
          Spara backup-koderna — du behöver dem om du tappar telefonen.
        </p>
        <pre className="block w-full overflow-x-auto bg-surface border border-border rounded-md px-3 py-2 font-mono text-[12px] text-ink-body mb-4 whitespace-pre-wrap break-all">
          {enrolment.totpURI}
        </pre>

        <p className="font-sans text-[12px] uppercase tracking-[0.16em] font-semibold text-ink-soft mb-2">
          Backup-koder · spara säkert
        </p>
        <div className="grid grid-cols-2 gap-1 font-mono text-[13px] text-ink-body bg-surface border border-border rounded-md p-3 mb-5">
          {enrolment.backupCodes.map((c) => (
            <code key={c}>{c}</code>
          ))}
        </div>

        <div className="border-t border-border pt-5">
          <Input
            label="Sex-siffrig kod från appen"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            maxLength={6}
            inputMode="numeric"
            disabled={pending}
          />
          {error && (
            <p
              role="alert"
              className="mt-2 font-sans text-[12.5px] text-status-error"
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
              className="font-sans text-[13px] text-ink-soft hover:text-ink-body"
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
          <p role="alert" className="mt-2 font-sans text-[12.5px] text-status-error">
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
            className="font-sans text-[13px] text-ink-soft hover:text-ink-body"
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
      <p className="font-sans text-[14px] mb-4">
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
