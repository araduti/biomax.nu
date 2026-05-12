import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CouponCreateForm } from "@/components/admin/coupon-create-form";

export const metadata = { title: "Rabattkoder" };
export const dynamic = "force-dynamic";

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("sv-SE");
}

function describeDiscount(c: {
  discountPercent: number | null;
  discountAmount: { toString: () => string } | null;
}): string {
  if (c.discountPercent != null) return `${c.discountPercent}%`;
  if (c.discountAmount != null) return `${c.discountAmount.toString()} kr`;
  return "—";
}

export default async function AdminCouponsPage() {
  const coupons = await prisma.coupon.findMany({
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
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
  });

  const activeCount = coupons.filter((c) => c.active).length;

  return (
    <>
      <AdminPageHeader
        eyebrow="Drift"
        title={`${coupons.length} rabattkoder`}
        subtitle={`${activeCount} aktiva. Använd för kampanjer, partner-koder och retentionsutskick. Använda koder kan inte tas bort — avaktivera dem istället så historiken bevaras.`}
        crumbs={[
          { label: "Drift", href: "/admin" },
          { label: "Rabattkoder" },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="bg-surface-alt border border-border rounded-2xl overflow-hidden">
          {coupons.length === 0 ? (
            <p className="p-6 font-sans text-[14px] text-ink-mute italic">
              Inga rabattkoder än — skapa den första till höger.
            </p>
          ) : (
            <ul>
              {coupons.map((c, i) => {
                const exhausted =
                  c.maxUses != null && c.usedCount >= c.maxUses;
                const expired = c.expiresAt && c.expiresAt < new Date();
                const dim = !c.active || exhausted || expired;
                return (
                  <li
                    key={c.code}
                    className={i > 0 ? "border-t border-border-soft" : ""}
                  >
                    <Link
                      href={`/admin/kuponger/${c.code}`}
                      className={`grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-4 hover:bg-surface-warm transition-colors ${
                        dim ? "opacity-60" : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-[13px] font-semibold text-primary-deep">
                            {c.code}
                          </code>
                          <span className="font-sans text-[11px] text-ink-soft">
                            {describeDiscount(c)}
                          </span>
                          {!c.active && (
                            <span className="font-sans text-[10px] uppercase tracking-[0.14em] text-[#B5523B] font-semibold">
                              inaktiv
                            </span>
                          )}
                          {expired && c.active && (
                            <span className="font-sans text-[10px] uppercase tracking-[0.14em] text-[#7A4D2A] font-semibold">
                              utgången
                            </span>
                          )}
                          {exhausted && (
                            <span className="font-sans text-[10px] uppercase tracking-[0.14em] text-[#7A4D2A] font-semibold">
                              uttömd
                            </span>
                          )}
                        </div>
                        {c.description && (
                          <p className="mt-1 font-sans text-[12px] text-ink-mute truncate">
                            {c.description}
                          </p>
                        )}
                      </div>
                      <span className="font-sans text-[11.5px] text-ink-soft tabular-nums whitespace-nowrap">
                        {c.usedCount}
                        {c.maxUses != null ? ` / ${c.maxUses}` : ""} använd
                      </span>
                      <span className="font-sans text-[11.5px] text-ink-soft tabular-nums whitespace-nowrap">
                        {formatDate(c.startsAt)} – {formatDate(c.expiresAt)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <aside className="bg-surface-alt border border-border rounded-2xl p-5">
          <h2 className="font-display text-[18px] font-medium tracking-tight text-primary-deep mb-1">
            Ny rabattkod
          </h2>
          <p className="font-sans text-[12.5px] text-ink-mute mb-4 leading-relaxed">
            Antingen procent eller fast belopp — inte båda.
          </p>
          <CouponCreateForm />
        </aside>
      </div>
    </>
  );
}
