import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { formatPriceSEK } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type { OrderStatus, Prisma } from "@prisma/client";

const dateFmt = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const STATUSES: { slug: string; label: string; status?: OrderStatus }[] = [
  { slug: "all", label: "Alla" },
  { slug: "pending", label: "Väntar", status: "PENDING" },
  { slug: "paid", label: "Att skicka", status: "PAID" },
  { slug: "fulfilled", label: "Skickade", status: "FULFILLED" },
  { slug: "cancelled", label: "Avbrutna", status: "CANCELLED" },
];

export const metadata = { title: "Ordrar" };

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status: statusParam, q } = await searchParams;
  const activeFilter = STATUSES.find((s) => s.slug === statusParam) ?? STATUSES[0];

  const where: Prisma.OrderWhereInput = {};
  if (activeFilter.status) where.status = activeFilter.status;
  if (q) {
    where.OR = [
      { orderNumber: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 60,
      select: {
        id: true,
        orderNumber: true,
        email: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        legacySource: true,
        _count: { select: { items: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return (
    <>
      <AdminPageHeader
        eyebrow="Drift"
        title={`${total} ${total === 1 ? "order" : "ordrar"}`}
        subtitle="Filtrera på status, sök på ordernummer eller e-post."
      />

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 md:items-center mb-6">
        <nav className="flex flex-wrap gap-2">
          {STATUSES.map((s) => {
            const isActive = s.slug === activeFilter.slug;
            const href =
              s.slug === "all"
                ? `/admin/ordrar${q ? `?q=${encodeURIComponent(q)}` : ""}`
                : `/admin/ordrar?status=${s.slug}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
            return (
              <Link
                key={s.slug}
                href={href}
                className={
                  isActive
                    ? "px-4 py-2 rounded-full bg-primary text-surface text-[13px] font-semibold tracking-wide"
                    : "px-4 py-2 rounded-full bg-surface-alt border border-border text-ink-body text-[13px] font-medium tracking-wide hover:border-primary/40"
                }
              >
                {s.label}
              </Link>
            );
          })}
        </nav>
        <form action="/admin/ordrar" method="get" className="md:ml-auto">
          {activeFilter.slug !== "all" && (
            <input type="hidden" name="status" value={activeFilter.slug} />
          )}
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Sök ordernr eller e-post"
            className="h-10 px-4 rounded-lg border border-border bg-surface-alt font-sans text-[14px] text-ink placeholder:text-ink-soft outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 min-w-[280px]"
          />
        </form>
      </div>

      {/* Table */}
      <div className="bg-surface-alt border border-border rounded-2xl overflow-hidden">
        <ul>
          {orders.map((o, i) => (
            <li
              key={o.id}
              className={i > 0 ? "border-t border-border-soft" : ""}
            >
              <Link
                href={`/admin/ordrar/${o.orderNumber}`}
                className="grid grid-cols-[1.4fr_2fr_auto_auto_auto] items-center gap-4 px-5 py-4 hover:bg-surface-warm transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-display text-[14px] font-medium tracking-tight text-primary-deep">
                    {o.orderNumber}
                  </p>
                  <p className="font-sans text-[11px] text-ink-mute mt-0.5">
                    {dateFmt.format(o.createdAt)}
                    {o.legacySource ? " · arkiverad" : ""}
                  </p>
                </div>
                <p className="font-sans text-[13px] text-ink-body truncate">
                  {o.email}
                </p>
                <p className="font-sans text-[12px] text-ink-mute whitespace-nowrap">
                  {o._count.items} st
                </p>
                <OrderStatusBadge status={o.status} />
                <p className="font-display text-[14px] font-medium text-primary-deep tracking-tight whitespace-nowrap min-w-[80px] text-right">
                  {formatPriceSEK(o.totalAmount.toString())}
                </p>
              </Link>
            </li>
          ))}
          {orders.length === 0 && (
            <li className="px-5 py-12 text-center font-sans text-[14px] text-ink-mute">
              Inga ordrar matchar filtret.
            </li>
          )}
        </ul>
        {total > orders.length && (
          <p className="px-5 py-3 border-t border-border-soft font-sans text-[12px] text-ink-mute text-center">
            Visar {orders.length} av {total} ordrar. Avgränsa med filter eller
            sökning för att se fler.
          </p>
        )}
      </div>
    </>
  );
}
