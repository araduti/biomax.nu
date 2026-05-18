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
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { error } = await platformAuthClient.signIn.email({
      email,
      password,
    });
    setPending(false);
    if (error) {
      setError(error.message ?? "Inloggning misslyckades.");
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
        onSubmit={onSubmit}
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
          KORG · PLATTFORM
        </p>
        <p style={{ margin: "0 0 8px", fontSize: 13, opacity: 0.7 }}>
          Ampliosoft-administratör
        </p>
        <input
          type="email"
          required
          placeholder="E-post"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inp}
        />
        <input
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
