import { type ReactNode } from "react";
import { AdminSidebar } from "./admin-sidebar";
import { AdminTopbar } from "./admin-topbar";
import { IntegrationBanner } from "./integration-banner";
import { ConfirmDialogHost } from "./confirm-dialog";
import type { AdminBadges } from "@/lib/admin/badges";
import type { IntegrationStatus } from "@/lib/admin/integration-status";

/**
 * Admin shell — Direction D ("Linear-warm").
 *
 * Every admin page wears this exact chrome. The icon-rail collapse was
 * dropped: Direction D specifies one fixed 224 px sidebar ("Page
 * anatomy: sidebar 224"), so the prior collapse state machine is gone —
 * the shell is simpler and matches the ratified design. Mobile keeps
 * the off-canvas drawer (the sidebar owns that state internally).
 *
 * Layout (rule: "Every page wears the same shell"):
 *   [ sidebar 224 ] [ topbar 10/28 · crumb+date / actions ]
 *                    [ main · max 1180 · pad 24/32/36 ]
 *
 * The breadcrumb lives in the topbar now (Direction D shell spec), so
 * the standalone AdminBreadcrumbs row is no longer mounted here.
 */
export function AdminShell({
  adminName,
  badges,
  integrations,
  children,
}: {
  adminName: string | null;
  badges: AdminBadges;
  integrations: IntegrationStatus[];
  children: ReactNode;
}) {
  return (
    <div
      data-direction="d"
      className="admin-shell min-h-screen bg-surface font-sans text-ink-body"
    >
      <AdminSidebar adminName={adminName} badges={badges} />
      <div className="lg:pl-[224px]">
        <IntegrationBanner statuses={integrations} />
        <AdminTopbar />
        {/* Fluid — content fills `viewport − sidebar − gutters` at every
            screen size, matching the ratified mockup. The Direction D
            token doc's "content max 1180px" line is superseded: the
            doc's own reference render is fluid (it fills to a ~30 px
            gutter at 2200 px), so 1180 was a documentation error, not
            an intended cap. Gutters stay on the spec's 24/32/36 scale. */}
        <main className="px-6 md:px-8 lg:px-9 py-6 md:py-8">
          {children}
        </main>
      </div>
      <ConfirmDialogHost />
    </div>
  );
}
