import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";

export const metadata = { title: "Loggar" };

export default function LoggarPage() {
  const sentryConfigured = !!process.env.SENTRY_DSN;

  return (
    <>
      <AdminPageHeader
        eyebrow="System"
        title="Loggar"
        subtitle="Felrapporter och varningar från Sentry. Sammanfattning kommer hit; full historik finns alltid i Sentry-dashboarden."
        crumbs={[
          { label: "System", href: "/admin" },
          { label: "Loggar" },
        ]}
      />

      {sentryConfigured ? (
        <AdminEmptyState
          intent="pending"
          title="Sentry är anslutet"
          body={
            <>
              Inbyggd sammanfattningsvy kommer i nästa iteration — under tiden
              hittar du fullständiga felrapporter direkt i din Sentry-instans.
              Tier 1.5 är att läsa Sentry API härifrån och visa: olösta fel
              senaste 24h, felfrekvens per route, släppspecifika regressions.
            </>
          }
        />
      ) : (
        <AdminEmptyState
          intent="setup"
          title="Sentry är inte anslutet"
          body={
            <>
              Sätt{" "}
              <code className="px-1 rounded bg-surface-warm font-mono text-[12px]">
                SENTRY_DSN
              </code>{" "}
              och{" "}
              <code className="px-1 rounded bg-surface-warm font-mono text-[12px]">
                NEXT_PUBLIC_SENTRY_DSN
              </code>{" "}
              i produktionsmiljön. Server- och klientfel skickas då automatiskt
              till Sentry via{" "}
              <code className="px-1 rounded bg-surface-warm font-mono text-[12px]">
                instrumentation.ts
              </code>{" "}
              och{" "}
              <code className="px-1 rounded bg-surface-warm font-mono text-[12px]">
                instrumentation-client.ts
              </code>
              . Full uppstart i ADR 0013.
            </>
          }
        />
      )}
    </>
  );
}
