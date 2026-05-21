"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { platformAuthClient } from "@/lib/auth-platform-client";

/**
 * Platform (Ampliosoft) login — ADR 0031. Separate auth instance +
 * cookie from the storefront. Authority (PlatformAdmin row) is checked
 * server-side by requirePlatformAdmin; this only authenticates.
 */
export default function PlatformLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"creds" | "2fa">("creds");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { data, error } = await platformAuthClient.signIn.email({
      email,
      password,
    });
    setPending(false);
    if (error) {
      setError(error.message ?? "Inloggning misslyckades.");
      return;
    }
    // 2FA-enabled admin → Better Auth signals a 2FA challenge instead
    // of a completed session (ADR 0031, mandatory 2FA).
    if ((data as { twoFactorRedirect?: boolean })?.twoFactorRedirect) {
      setStep("2fa");
      return;
    }
    router.push("/platform");
    router.refresh();
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("Ange den sexsiffriga koden.");
      return;
    }
    setPending(true);
    setError(null);
    const { error } = await platformAuthClient.twoFactor.verifyTotp({
      code,
    });
    setPending(false);
    if (error) {
      setError(error.message ?? "Koden stämde inte.");
      return;
    }
    router.push("/platform");
    router.refresh();
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        background: "#0f2440",
        color: "#fff",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <form
        onSubmit={step === "creds" ? onSubmit : onVerify}
        style={{
          width: 340,
          background: "#15315a",
          padding: 28,
          borderRadius: 12,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <p style={{ margin: 0, fontWeight: 700, letterSpacing: ".08em" }}>
          KINE · PLATTFORM
        </p>
        <p style={{ margin: "0 0 8px", fontSize: 13, opacity: 0.7 }}>
          {step === "creds"
            ? "Ampliosoft-administratör"
            : "Tvåfaktor — ange koden från din app"}
        </p>
        {step === "creds" ? (
          <>
            <input
              suppressHydrationWarning
              type="email"
              required
              placeholder="E-post"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inp}
            />
            <input
              suppressHydrationWarning
              type="password"
              required
              placeholder="Lösenord"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inp}
            />
            <button type="submit" disabled={pending} style={btn}>
              {pending ? "Loggar in…" : "Logga in"}
            </button>
          </>
        ) : (
          <>
            <input
              suppressHydrationWarning
              inputMode="numeric"
              autoFocus
              required
              placeholder="6-siffrig kod"
              value={code}
              onChange={(e) => setCode(e.target.value.trim())}
              style={inp}
            />
            <button type="submit" disabled={pending} style={btn}>
              {pending ? "Verifierar…" : "Verifiera"}
            </button>
          </>
        )}
        {error && (
          <p style={{ color: "#ff9a8a", fontSize: 13, margin: 0 }}>
            {error}
          </p>
        )}
      </form>
    </main>
  );
}

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
