"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setTenantStatus } from "./actions";

export function TenantStatusButton({
  tenantId,
  slug,
  status,
}: {
  tenantId: string;
  slug: string;
  status: "ACTIVE" | "SUSPENDED";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const next = status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
  const lockedZero = slug === "biomax" && next === "SUSPENDED";

  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      {error && (
        <span style={{ color: "#ff9a8a", fontSize: 12 }}>{error}</span>
      )}
      <button
        type="button"
        disabled={pending || lockedZero}
        title={lockedZero ? "Tenant zero kan inte stängas av" : undefined}
        onClick={() =>
          start(async () => {
            setError(null);
            const r = await setTenantStatus({ tenantId, next });
            if (!r.ok) setError(r.error);
            else router.refresh();
          })
        }
        style={{
          padding: "6px 10px",
          borderRadius: 6,
          border: "1px solid #2c5384",
          background: next === "SUSPENDED" ? "#5a2330" : "#2f5a3a",
          color: "#fff",
          fontSize: 12,
          fontWeight: 600,
          cursor: pending || lockedZero ? "not-allowed" : "pointer",
          opacity: lockedZero ? 0.4 : 1,
        }}
      >
        {pending
          ? "…"
          : next === "SUSPENDED"
            ? "Stäng av"
            : "Återaktivera"}
      </button>
    </span>
  );
}
