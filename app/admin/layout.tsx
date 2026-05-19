import { AdminShell } from "@/components/admin/admin-shell";
import { requireTenantRole } from "@/lib/admin/guard";
import { getAdminBadges } from "@/lib/admin/badges";
import { getIntegrationStatus } from "@/lib/admin/integration-status";

export const metadata = {
  title: { default: "Admin", template: "%s · Biomax Admin" },
  robots: { index: false, follow: false },
};

/**
 * Admin layout — server-side data fetching, then hands off to
 * `<AdminShell>` (Direction D chrome).
 *
 *  - Badges and integration status are fetched here so the shell
 *    receives ready-to-render props (no server-client waterfall).
 *  - The shell carries `data-direction="d"` + `.admin-shell`; the
 *    Direction D token bridge in `app/globals.css` re-skins every
 *    admin page through that scope.
 *  - Fixed 224 px sidebar (Direction D spec — no icon-rail collapse);
 *    below `lg` it becomes an off-canvas mobile drawer.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireTenantRole("admin");
  const display = admin.firstName || admin.name || admin.email;
  // Parallel-fetch action counts so the sidebar can render chips next
  // to "Ordrar / Returer / Recensioner / Lager". Cached 60 s — every
  // admin page renders the sidebar, so the badge cost is amortised.
  const badges = await getAdminBadges(admin.tenantId);
  const integrations = getIntegrationStatus();

  return (
    <AdminShell
      adminName={display}
      badges={badges}
      integrations={integrations}
    >
      {children}
    </AdminShell>
  );
}
