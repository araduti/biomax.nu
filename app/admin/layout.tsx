import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { requireAdmin } from "@/lib/admin/guard";
import { densityInitScript } from "@/components/admin/density-toggle";
import { getAdminBadges } from "@/lib/admin/badges";

export const metadata = {
  title: { default: "Admin", template: "%s · Biomax Admin" },
  robots: { index: false, follow: false },
};

/**
 * Admin shell.
 *
 *  - `.admin-shell` is the styling scope; CSS variables in
 *    `app/globals.css` under that selector drive the older-user-friendly
 *    type scale + hit targets.
 *  - `data-density="comfortable"` (default) / `"dense"` swaps the
 *    variable set. The init script below sets the attribute before
 *    paint so dense-mode admins don't see a comfortable-mode flash.
 *  - Sidebar collapses on small screens; admins on phones use the
 *    floating "Meny"-button to open it.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();
  const display = admin.firstName || admin.name || admin.email;
  // Parallel-fetch action counts so the sidebar can render chips next
  // to "Ordrar / Returer / Recensioner / Lager". Cached 60 s — every
  // admin page renders the sidebar, so the badge cost is amortised.
  const badges = await getAdminBadges();
  return (
    <div
      className="admin-shell min-h-screen bg-surface"
      data-density="comfortable"
      // The pre-paint init script below reads localStorage and may flip
      // this attribute to "dense" before React hydrates. That's a
      // deliberate hydration mismatch (same pattern as next-themes) —
      // tell React to leave the discrepancy alone instead of patching
      // the DOM back to the server value and undoing our work.
      suppressHydrationWarning
    >
      {/* Pre-paint density rehydration — see density-toggle.tsx. */}
      <script dangerouslySetInnerHTML={{ __html: densityInitScript }} />
      <AdminSidebar adminName={display} badges={badges} />
      <div className="lg:pl-[280px]">
        <main className="px-5 md:px-10 py-6 md:py-10 max-w-[1400px]">
          {children}
        </main>
      </div>
    </div>
  );
}
