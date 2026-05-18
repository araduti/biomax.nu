import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform/guard";
import { TenantStatusButton } from "./tenant-status-button";

export const metadata: Metadata = {
  title: "Korg · Plattform",
  robots: { index: false, follow: false },
};

/**
 * Platform (Ampliosoft) admin — ADR 0031 D6 v1: list tenants +
 * suspend/resume. Cross-tenant by design; gated by
 * requirePlatformAdmin (separate cookie, PlatformAdmin row, 2FA,
 * platform host).
 */
export default async function PlatformHome() {
  const actor = await requirePlatformAdmin();
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
      createdAt: true,
    },
  });

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#0f2440",
        color: "#fff",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        padding: "32px clamp(16px, 5vw, 64px)",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 28,
        }}
      >
        <div>
          <p style={{ margin: 0, fontWeight: 700, letterSpacing: ".1em" }}>
            KORG · PLATTFORM
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.7 }}>
            Ampliosoft AB · {tenants.length} hyresgäst
            {tenants.length === 1 ? "" : "er"}
          </p>
        </div>
        <p style={{ margin: 0, fontSize: 12, opacity: 0.6 }}>
          {actor.email} · {actor.platformRole}
        </p>
      </header>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: "left", opacity: 0.6 }}>
            <th style={th}>Slug</th>
            <th style={th}>Namn</th>
            <th style={th}>Status</th>
            <th style={th}>Skapad</th>
            <th style={th}></th>
          </tr>
        </thead>
        <tbody>
          {tenants.map((t) => (
            <tr key={t.id} style={{ borderTop: "1px solid #2c5384" }}>
              <td style={td}>
                <code>{t.slug}</code>
              </td>
              <td style={td}>{t.name}</td>
              <td style={td}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: t.status === "ACTIVE" ? "#9fd6a0" : "#ff9a8a",
                  }}
                >
                  {t.status}
                </span>
              </td>
              <td style={{ ...td, opacity: 0.6 }}>
                {t.createdAt.toISOString().slice(0, 10)}
              </td>
              <td style={{ ...td, textAlign: "right" }}>
                <TenantStatusButton
                  tenantId={t.id}
                  slug={t.slug}
                  status={t.status}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

const th: React.CSSProperties = { padding: "8px 10px", fontWeight: 600 };
const td: React.CSSProperties = { padding: "12px 10px" };
