"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { platformAuthClient } from "@/lib/auth-platform-client";

/**
 * Platform 2FA enrolment (ADR 0031, Option A — production-faithful,
 * no dev bypass). Password-confirm → enable TOTP → scan/verify → done.
 * QR rendered client-side; the secret never hits a third party.
 */
type Mode = "confirm" | "qr";

export function Platform2faSetup({ email }: { email: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("confirm");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [enrolment, setEnrolment] = useState<{
    totpURI: string;
    backupCodes: string[];
  } | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const totpURI = enrolment?.totpURI;
  useEffect(() => {
    if (!totpURI) return;
    let off = false;
    QRCode.toDataURL(totpURI, { margin: 1, width: 220 })
      .then((u) => !off && setQr(u))
      .catch(() => !off && setQr(null));
    return () => {
      off = true;
    };
  }, [totpURI]);

  const manualSecret = totpURI
    ? new URLSearchParams(totpURI.split("?")[1] ?? "").get("secret")
    : null;

  function enable() {
    if (!password) return setError("Ange ditt lösenord.");
    setError(null);
    start(async () => {
      const r = await platformAuthClient.twoFactor.enable({ password });
      if (r.error) {
        setError(r.error.message ?? "Kunde inte starta tvåfaktor.");
        return;
      }
      setEnrolment(r.data as { totpURI: string; backupCodes: string[] });
      setPassword("");
      setMode("qr");
    });
  }

  function verify() {
    if (!/^\d{6}$/.test(code))
      return setError("Ange den sexsiffriga koden.");
    setError(null);
    start(async () => {
      const r = await platformAuthClient.twoFactor.verifyTotp({ code });
      if (r.error) {
        setError(r.error.message ?? "Koden stämde inte.");
        return;
      }
      router.push("/platform");
      router.refresh();
    });
  }

  return (
    <main style={wrap}>
      <div style={card}>
        <p style={{ margin: 0, fontWeight: 700, letterSpacing: ".08em" }}>
          KORG · PLATTFORM
        </p>
        <p style={{ margin: "0 0 4px", fontSize: 13, opacity: 0.7 }}>
          Tvåfaktor krävs · {email}
        </p>

        {mode === "confirm" ? (
          <>
            <p style={{ fontSize: 13, opacity: 0.8, margin: "8px 0" }}>
              Bekräfta lösenordet för att aktivera tvåfaktor (obligatoriskt
              på plattformsadmin).
            </p>
            <input
              suppressHydrationWarning
              type="password"
              placeholder="Lösenord"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inp}
            />
            <button onClick={enable} disabled={pending} style={btn}>
              {pending ? "…" : "Aktivera tvåfaktor"}
            </button>
          </>
        ) : (
          <>
            {qr && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qr}
                alt="QR för authenticator"
                width={200}
                height={200}
                style={{ alignSelf: "center", borderRadius: 8 }}
              />
            )}
            {manualSecret && (
              <p style={{ fontSize: 12, opacity: 0.7, wordBreak: "break-all" }}>
                Manuell nyckel: <code>{manualSecret}</code>
              </p>
            )}
            {enrolment?.backupCodes?.length ? (
              <details style={{ fontSize: 12, opacity: 0.8 }}>
                <summary>Reservkoder (spara dessa)</summary>
                <code style={{ whiteSpace: "pre-wrap" }}>
                  {enrolment.backupCodes.join("  ")}
                </code>
              </details>
            ) : null}
            <input
              suppressHydrationWarning
              inputMode="numeric"
              placeholder="6-siffrig kod"
              value={code}
              onChange={(e) => setCode(e.target.value.trim())}
              style={inp}
            />
            <button onClick={verify} disabled={pending} style={btn}>
              {pending ? "…" : "Verifiera & fortsätt"}
            </button>
          </>
        )}
        {error && (
          <p style={{ color: "#ff9a8a", fontSize: 13, margin: 0 }}>{error}</p>
        )}
      </div>
    </main>
  );
}

const wrap: React.CSSProperties = {
  minHeight: "100dvh",
  display: "grid",
  placeItems: "center",
  background: "#0f2440",
  color: "#fff",
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
};
const card: React.CSSProperties = {
  width: 360,
  background: "#15315a",
  padding: 28,
  borderRadius: 12,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};
const inp: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #2c5384",
  background: "#0f2440",
  color: "#fff",
  fontSize: 14,
};
const btn: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "none",
  background: "#7A8B6F",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
};
