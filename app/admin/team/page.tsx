import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { TeamManager } from "@/components/admin/team-manager";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/guard";

export const metadata = { title: "Team & behörighet" };
export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  const me = await requireAdmin();

  const admins = await prisma.user.findMany({
    where: { role: "admin" },
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      lastName: true,
      twoFactorEnabled: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const rows = admins.map((a) => ({
    id: a.id,
    email: a.email,
    name:
      a.name ||
      [a.firstName, a.lastName].filter(Boolean).join(" ") ||
      a.email,
    twoFactorEnabled: a.twoFactorEnabled,
    isSelf: a.id === me.id,
  }));

  return (
    <>
      <AdminPageHeader
        eyebrow="System"
        title="Team & behörighet"
        subtitle="Vem som har åtkomst till adminpanelen. Admin kräver tvåfaktorsinloggning — en admin utan 2FA blir ombedd att aktivera det innan panelen öppnas."
        crumbs={[
          { label: "System", href: "/admin" },
          { label: "Team & behörighet" },
        ]}
      />
      <div className="max-w-[760px]">
        <TeamManager admins={rows} />
      </div>
    </>
  );
}
