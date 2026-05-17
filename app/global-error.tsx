"use client";

import { useEffect } from "react";

/**
 * Global error boundary — catches errors that escape root layout (failed
 * Header/Footer renders, font loading explosions, etc). Renders its own
 * minimal HTML shell because `layout.tsx` may itself be the source of
 * the error.
 *
 * The Next.js convention: this file replaces the default Next "Application
 * error" white-screen entirely, so we render <html>/<body> ourselves.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="sv">
      <body
        style={{
          fontFamily: "Helvetica, Arial, sans-serif",
          background: "#FBFAF7",
          color: "#0A0A0A",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          margin: 0,
        }}
      >
        <div style={{ maxWidth: 520, textAlign: "center" }}>
          <p
            style={{
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#7A8290",
              marginBottom: 12,
            }}
          >
            Biomax
          </p>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 500,
              color: "#1E3A5F",
              margin: "0 0 16px",
            }}
          >
            Något gick allvarligt fel
          </h1>
          <p
            style={{
              fontSize: 16,
              color: "#525860",
              lineHeight: 1.55,
              marginBottom: 24,
            }}
          >
            Sidan kunde inte laddas. Vi har loggat felet. Försök att ladda om
            sidan, eller hör av dig på{" "}
            <a href="mailto:kontakt@biomax.nu" style={{ color: "#1E3A5F" }}>
              kontakt@biomax.nu
            </a>
            .
          </p>
          {error.digest && (
            <p style={{ fontSize: 12, color: "#7A8290" }}>
              Referenskod: <code>{error.digest}</code>
            </p>
          )}
          {/* global-error renders its own <html>; the App Router /
              next/link context isn't available here, so a plain anchor
              that does a full reload is the correct recovery path. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            style={{
              display: "inline-block",
              marginTop: 16,
              padding: "10px 20px",
              background: "#1E3A5F",
              color: "#FBFAF7",
              borderRadius: 6,
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Till startsidan
          </a>
        </div>
      </body>
    </html>
  );
}
