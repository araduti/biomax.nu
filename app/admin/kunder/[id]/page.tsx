import { notFound } from "next/navigation";
import Link from "next/link";
import { Display, Eyebrow } from "@/components/ui/typography";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { formatPriceSEK } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { GdprActions } from "@/components/admin/gdpr-actions";
import { CopyButton } from "@/components/admin/copy-button";
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
        className="inline-flex items-center gap-1 font-sans text-[13.5px] text-primary hover:text-primary-deep transition-colors mb-4"
      >
        ← Alla kunder
      </Link>

      <Eyebrow>Kund</Eyebrow>
      <Display as="h1" size="xl" className="mt-3 mb-3">
        {fullName}
      </Display>
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <span className="font-sans text-[15.5px] text-ink-body">{user.email}</span>
        <CopyButton value={user.email} label="Kopiera e-post" />
        {user.phone && (
          <>
            <span aria-hidden className="text-ink-soft">·</span>
            <span className="font-sans text-[15.5px] text-ink-body">
              {user.phone}
            </span>
            <CopyButton value={user.phone} label="Kopiera tel" />
          </>
        )}
        {user.legacyWpId && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ink-mute/12 text-ink-mute font-sans text-[12.5px] font-semibold">
            <span aria-hidden>◌</span>
            Arkiverad från gamla biomax.nu
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat label="Ordrar" value={orders.length.toString()} />
        <Stat label="Totalt hos Biomax" value={formatPriceSEK(lifetime)} />
        <Stat
          label="Roll"
          value={user.role === "admin" ? "Admin" : "Kund"}
        />
        <Stat
          label="Skapad"
          value={dateFmt.format(user.createdAt)}
        />
      </div>

      {loyalty && (
        <section className="mb-8 bg-surface-warm border border-accent/30 rounded-2xl p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <p className="font-sans text-[11px] uppercase tracking-[0.22em] font-semibold text-accent-deep">
                {LOYALTY_PROGRAM_NAME}
              </p>
              <p className="mt-2 font-display text-[26px] font-medium tracking-tight text-primary-deep">
                {loyalty.balance.toLocaleString("sv-SE")} poäng
                <span className="ml-3 font-sans text-[13px] text-ink-mute font-normal">
                  ({formatPriceSEK(pointsToKr(loyalty.balance))} värde)
                </span>
              </p>
              <p className="mt-1 font-sans text-[12.5px] text-ink-mute">
                Totalt tjänat {loyalty.lifetimeEarned.toLocaleString("sv-SE")}{" "}
                sedan {dateFmt.format(loyalty.enrolledAt)}
              </p>
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        <section>
          <h2 className="font-display text-2xl font-medium tracking-tight text-primary-deep mb-4">
            Orderhistorik
          </h2>
          <div className="bg-surface-alt border border-border rounded-2xl overflow-hidden">
            <ul>
              {orders.map((o, i) => (
                <li
                  key={o.id}
                  className={i > 0 ? "border-t border-border-soft" : ""}
                >
                  <Link
                    href={`/admin/ordrar/${o.orderNumber}`}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-4 hover:bg-surface-warm transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-display text-[14px] font-medium tracking-tight text-primary-deep">
                        {o.orderNumber}
                      </p>
                      <p className="font-sans text-[12px] text-ink-mute mt-0.5">
                        {dateFmt.format(o.createdAt)} · {o._count.items} st
                        {o.legacySource ? " · arkiverad" : ""}
                      </p>
                    </div>
                    <OrderStatusBadge status={o.status} />
                    <span className="font-display text-[14px] font-medium text-primary-deep tracking-tight whitespace-nowrap min-w-[80px] text-right">
                      {formatPriceSEK(o.totalAmount.toString())}
                    </span>
                  </Link>
                </li>
              ))}
              {orders.length === 0 && (
                <li className="px-5 py-8 text-center font-sans text-[14px] text-ink-mute italic">
                  Inga ordrar.
                </li>
              )}
            </ul>
          </div>
        </section>

        <aside>
          <h2 className="font-display text-2xl font-medium tracking-tight text-primary-deep mb-4">
            Adresser
          </h2>
          {user.addresses.length === 0 ? (
            <p className="font-sans text-[13px] text-ink-mute italic">
              Inga sparade adresser.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {user.addresses.map((a) => (
                <li
                  key={a.id}
                  className="bg-surface-alt border border-border rounded-2xl p-4 font-sans text-[13px] text-ink-body leading-relaxed"
                >
                  <strong className="font-display text-[14px] text-primary-deep">
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
        </aside>
      </div>

      <section className="mt-12 pt-8 border-t border-border">
        <p className="font-sans text-[11px] uppercase tracking-[0.18em] font-semibold text-ink-soft mb-3">
          GDPR
        </p>
        <GdprActions userId={user.id} />
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-alt border border-border rounded-xl p-4">
      <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-ink-mute font-semibold">
        {label}
      </p>
      <p className="mt-1.5 font-display text-xl font-medium tracking-tight text-primary-deep break-words">
        {value}
      </p>
    </div>
  );
}
