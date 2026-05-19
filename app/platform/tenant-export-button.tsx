"use client";

import { useState, useTransition } from "react";
import { exportTenant } from "./actions";

/**
 * Triggers an in-browser download of the per-tenant JSON dump
 * (ADR 0033 A2). The action returns a base64 payload that we
 * decode + blob-ify here — no extra route needed.
 */
export function TenantExportButton({
  tenantId,
  slug,
}: {
  tenantId: string;
  slug: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      {error && (
        <span style={{ color: "#ff9a8a", fontSize: 12 }}>{error}</span>
      )}
      <button
        type="button"
        disabled={pending}
        title={`Exportera all data för ${slug}`}
        onClick={() =>
          start(async () => {
            setError(null);
            const r = await exportTenant({ tenantId });
            if (!r.ok) {
              setError(r.error);
              return;
            }
            const bin = atob(r.payloadB64);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            const blob = new Blob([bytes], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = r.filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
          })
        }
        style={{
          padding: "6px 10px",
          borderRadius: 6,
          border: "1px solid #2c5384",
          background: "#1d3a66",
          color: "#fff",
          fontSize: 12,
          fontWeight: 600,
          cursor: pending ? "not-allowed" : "pointer",
        }}
      >
        {pending ? "…" : "Exportera data"}
      </button>
    </span>
  );
}
