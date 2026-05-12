import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { requireAdmin } from "@/lib/admin/guard";

export const metadata = {
  title: { default: "Admin", template: "%s · Biomax Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();
  const display = admin.firstName || admin.name || admin.email;
  return (
    <div className="min-h-screen bg-surface">
      <AdminSidebar adminName={display} />
      <div className="lg:pl-[260px]">
        <main className="px-6 md:px-10 py-8 md:py-12 max-w-[1400px]">
          {children}
        </main>
      </div>
    </div>
  );
}
