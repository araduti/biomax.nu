import { notFound } from "next/navigation";
import { hostTenantScope } from "@/lib/tenant/db";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CouponEditForm } from "@/components/admin/coupon-edit-form";

export const metadata = { title: "Rabattkod" };
export const dynamic = "force-dynamic";

export default async function AdminCouponEditPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const coupon = await hostTenantScope((tx) =>
    tx.coupon.findFirst({
      where: { code: code.toUpperCase() },
      select: {
        code: true,
        description: true,
        discountPercent: true,
        discountAmount: true,
        startsAt: true,
        expiresAt: true,
        active: true,
        maxUses: true,
        usedCount: true,
      },
    })
  );
  if (!coupon) notFound();

  return (
    <>
      <AdminPageHeader
        eyebrow="Rabattkod"
        title={coupon.code}
        crumbs={[
          { label: "Drift", href: "/admin" },
          { label: "Rabattkoder", href: "/admin/kuponger" },
          { label: coupon.code },
        ]}
        subtitle={
          <span>
            {coupon.usedCount} användning{coupon.usedCount === 1 ? "" : "ar"}
            {coupon.maxUses != null ? ` av ${coupon.maxUses}` : " (obegränsad)"}
          </span>
        }
      />

      <div className="max-w-[640px] bg-surface-alt border border-border rounded-xl p-6 md:p-8">
        <CouponEditForm
          initial={{
            code: coupon.code,
            description: coupon.description ?? "",
            discountPercent: coupon.discountPercent,
            discountAmount: coupon.discountAmount
              ? coupon.discountAmount.toString()
              : "",
            startsAt: coupon.startsAt
              ? coupon.startsAt.toISOString().slice(0, 16)
              : "",
            expiresAt: coupon.expiresAt
              ? coupon.expiresAt.toISOString().slice(0, 16)
              : "",
            active: coupon.active,
            maxUses: coupon.maxUses,
          }}
          usedCount={coupon.usedCount}
        />
      </div>
    </>
  );
}
