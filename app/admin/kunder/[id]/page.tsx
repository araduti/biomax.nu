import { notFound } from "next/navigation";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { formatPriceSEK } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { GdprActions } from "@/components/admin/gdpr-actions";
import { CustomerRoleControl } from "@/components/admin/customer-role-control";
import { requireTenantRole } from "@/lib/admin/guard";
import { CopyButton } from "@/components/admin/copy-button";
import { AdminSummaryStrip } from "@/components/admin/admin-summary-strip";
import { getAccountBalance } from "@/lib/loyalty/account";
import {
  LOYALTY_PROGRAM_NAME,
  pointsToKr,
} from "@/lib/loyalty/constants";

const dateFmt = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export default async function AdminCustomerDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await requireTenantRole("admin");
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      addresses: { orderBy: { updatedAt: "desc" }, take: 5 },
    },
  });
  if (!user) notFound();

  const orders = await prisma.order.findMany({
    where: {
      OR: [{ userId: user.id }, { email: user.email.toLowerCase() }],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      totalAmount: true,
      createdAt: true,
      legacySource: true,
      _count: { select: { items: true } },
    },
  });
  const lifetime = orders.reduce(
    (sum, o) => sum + parseFloat(o.totalAmount.toString()),
    0
  );
  const loyalty = await getAccountBalance(user.id);
  const fullName =
    user.name ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.email;

  return (
    <>
      <Link
        href="/admin/kunder"
        className="inline-flex items-center gap-1 font-sans text-small text-primary hover:text-primary-deep transition-colors mb-4"
      >
        ← Alla kunder
      </Link>

      <p className="font-sans text-micro uppercase tracking-[0.16em] text-ink-mute font-semibold mb-2">
        Kund
      </p>
      <h1 className="font-sans text-[22px] md:text-[26px] font-semibold tracking-tight text-primary-deep leading-tight mb-2">
        {fullName}
      </h1>
      <div className="flex flex-wrap items-center gap-3 mb-7">
        <span className="font-sans text-body text-ink-body">{user.email}</span>
        <CopyButton value={user.email} label="Kopiera e-post" />
        {user.phone && (
          <>
            <span aria-hidden className="text-ink-soft">·</span>
            <span className="font-sans text-body text-ink-body">
              {user.phone}
            </span>
            <CopyButton value={user.phone} label="Kopiera tel" />
          </>
        )}
        {user.legacyWpId && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ink-mute/12 text-ink-mute font-sans text-caption font-semibold">
            <span aria-hidden>◌</span>
            Arkiverad från gamla biomax.nu
          </span>
        )}
      </div>

      <AdminSummaryStrip
        className="mb-8"
        stats={[
          { label: "Ordrar", value: orders.length.toString() },
          { label: "Totalt hos Biomax", value: formatPriceSEK(lifetime) },
          {
            label: "Roll",
            value: user.role === "admin" ? "Admin" : "Kund",
          },
          { label: "Skapad", value: dateFmt.format(user.createdAt) },
        ]}
      />

      <CustomerRoleControl
        userId={user.id}
        email={user.email}
        isAdmin={user.role === "admin"}
        isSelf={user.id === me.userId}
      />

      {loyalty && (
        <section className="mb-8 pb-5 border-b border-border-soft">
          <p className="font-sans text-micro uppercase tracking-[0.16em] font-semibold text-accent-deep">
            {LOYALTY_PROGRAM_NAME}
          </p>
          <p className="mt-1.5 font-sans text-[22px] font-semibold tracking-tight text-primary-deep tabular-nums leading-none">
            {loyalty.balance.toLocaleString("sv-SE")}
            <span className="font-sans text-small text-ink-mute font-normal ml-2">
              poäng · {formatPriceSEK(pointsToKr(loyalty.balance))} värde
            </span>
          </p>
          <p className="mt-1.5 font-sans text-caption text-ink-mute">
            Totalt tjänat {loyalty.lifetimeEarned.toLocaleString("sv-SE")}{" "}
            sedan {dateFmt.format(loyalty.enrolledAt)}
          </p>
        </section>
      )}

      {/* Single column with max-width — the previous 2-col grid
          stretched the Adresser sidebar to match Orderhistorik's height,
          creating big voids for customers with one address and many
          orders. Stacking removes the imbalance. */}
      <div className="flex flex-col gap-10 max-w-[920px]">
        <section>
          <h2 className="font-sans text-body-lg md:text-lead font-semibold tracking-tight text-primary-deep mb-3">
            Orderhistorik
          </h2>
          <ul className="border-y border-border-soft divide-y divide-border-soft">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/admin/ordrar/${o.orderNumber}`}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-1 py-3.5 hover:bg-surface-warm/60 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-sans text-small font-semibold tracking-tight text-primary-deep">
                      {o.orderNumber}
                    </p>
                    <p className="font-sans text-caption text-ink-mute mt-0.5">
                      {dateFmt.format(o.createdAt)} · {o._count.items} st
                      {o.legacySource ? " · arkiverad" : ""}
                    </p>
                  </div>
                  <OrderStatusBadge status={o.status} />
                  <span className="font-sans text-small font-semibold text-primary-deep tabular-nums whitespace-nowrap min-w-[80px] text-right">
                    {formatPriceSEK(o.totalAmount.toString())}
                  </span>
                </Link>
              </li>
            ))}
            {orders.length === 0 && (
              <li className="px-1 py-6 text-center font-sans text-small text-ink-mute italic">
                Inga ordrar.
              </li>
            )}
          </ul>
        </section>

        <section>
          <h2 className="font-sans text-body-lg md:text-lead font-semibold tracking-tight text-primary-deep mb-3">
            Adresser
          </h2>
          {user.addresses.length === 0 ? (
            <p className="font-sans text-small text-ink-mute italic">
              Inga sparade adresser.
            </p>
          ) : (
            <ul className="border-y border-border-soft divide-y divide-border-soft">
              {user.addresses.map((a) => (
                <li
                  key={a.id}
                  className="px-1 py-3.5 font-sans text-small text-ink-body leading-relaxed"
                >
                  <strong className="font-sans text-small font-semibold text-primary-deep">
                    {a.fullName}
                  </strong>
                  <br />
                  {a.street}
                  <br />
                  {a.postalCode} {a.city}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-12 pt-8 border-t border-border">
        <p className="font-sans text-micro uppercase tracking-[0.16em] font-semibold text-ink-soft mb-3">
          GDPR
        </p>
        <GdprActions userId={user.id} />
      </section>
    </>
  );
}

