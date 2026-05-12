import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SettingsForm } from "@/components/admin/settings-form";
import { getShippingRules, getLowStockDefault } from "@/lib/site/settings";

export const metadata = { title: "Inställningar" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [shipping, lowStockDefault] = await Promise.all([
    getShippingRules(),
    getLowStockDefault(),
  ]);

  return (
    <>
      <AdminPageHeader
        eyebrow="System"
        title="Inställningar"
        subtitle="Sajt-omfattande regler som styr frakt, lager-tröskel och liknande. Ändringar slår igenom inom någon minut tack vare ISR."
        crumbs={[
          { label: "System", href: "/admin" },
          { label: "Inställningar" },
        ]}
      />

      <div className="max-w-[640px] space-y-6">
        <SettingsForm
          initialFlatSek={shipping.flatSek}
          initialFreeThresholdSek={shipping.freeThresholdSek}
          initialLowStockDefault={lowStockDefault}
        />
      </div>
    </>
  );
}
