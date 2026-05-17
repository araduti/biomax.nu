import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { OrdrarList } from "@/components/admin/ordrar-list";
import { prisma } from "@/lib/prisma";
import type { OrderStatus, Prisma } from "@prisma/client";

/**
 * Status filters. `paid` is the default ("att packa") because that's
 * the morning question — what needs to be sent today. `archive`
 * surfaces the WordPress-imported history, which would otherwise
 * dominate the list with years-old PENDING rows that aren't actionable.
 */
type FilterSlug =
  | "paid"
  | "fulfilled"
  | "cancelled"
  | "refunded"
  | "all"
  | "archive";

const FILTERS: {
  slug: FilterSlug;
  label: string;
  status?: OrderStatus | OrderStatus[];
  legacyOnly?: boolean;
}[] = [
  { slug: "paid", label: "Att packa", status: "PAID" },
  { slug: "fulfilled", label: "Skickade", status: "FULFILLED" },
  { slug: "cancelled", label: "Avbrutna", status: "CANCELLED" },
  { slug: "refunded", label: "Återbetalda", status: "REFUNDED" },
  { slug: "all", label: "Alla nya" },
  { slug: "archive", label: "Arkiv (WP)", legacyOnly: true },
];

export const metadata = { title: "Ordrar" };

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status: statusParam, q } = await searchParams;
  const activeFilter =
    FILTERS.find((f) => f.slug === statusParam) ?? FILTERS[0];

  const where: Prisma.OrderWhereInput = {};
  if (activeFilter.legacyOnly) {
    where.legacySource = { not: null };
  } else {
    // Default behaviour: exclude legacy-imported orders so the list
    // shows fulfillable, recent work. The 2015–2021 WP-imported rows
    // are reachable via the "Arkiv"-tab.
    where.legacySource = null;
    if (activeFilter.status) {
      where.status = Array.isArray(activeFilter.status)
        ? { in: activeFilter.status }
        : activeFilter.status;
    }
  }
  if (q) {
    where.OR = [
      { orderNumber: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const [orders, total, perFilterCounts] = await Promise.all([
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
    // Per-filter totals for the tab counters. Two parallel queries:
    // status grouping for the non-legacy bucket + a single count for
    // the archive bucket.
    Promise.all([
      prisma.order.groupBy({
        by: ["status"],
        where: { legacySource: null },
        _count: { _all: true },
      }),
      prisma.order.count({ where: { legacySource: { not: null } } }),
    ]),
  ]);

  const [statusGroups, archiveCount] = perFilterCounts;
  const countByStatus = new Map<OrderStatus, number>();
  let nonLegacyTotal = 0;
  for (const g of statusGroups) {
    countByStatus.set(g.status, g._count._all);
    nonLegacyTotal += g._count._all;
  }
  const countForFilter = (f: (typeof FILTERS)[number]): number => {
    if (f.legacyOnly) return archiveCount;
    if (!f.status) return nonLegacyTotal;
    if (Array.isArray(f.status))
      return f.status.reduce((s, st) => s + (countByStatus.get(st) ?? 0), 0);
    return countByStatus.get(f.status) ?? 0;
  };

  // Title stays clean ("Ordrar · Att packa") so the eye reads category
  // first; the live count moves to the muted secondary `metric` slot so
  // it reads as supporting data rather than competing for the H1.
  const titleBase = activeFilter.legacyOnly
    ? "Arkiv"
    : "Ordrar";
  const titleSuffix = activeFilter.legacyOnly ? "" : ` · ${activeFilter.label}`;
  const metricLabel =
    total === 0
      ? "Inga"
      : `${total.toLocaleString("sv-SE")} ${total === 1 ? "order" : "ordrar"}`;

  return (
    <>
      <AdminPageHeader
        eyebrow="Beställningar"
        title={`${titleBase}${titleSuffix}`}
        metric={metricLabel}
        subtitle={
          activeFilter.slug === "paid"
            ? "Ordrar som väntar på att packas. Klicka in på en order för att boka frakt eller markera som skickad."
            : activeFilter.legacyOnly
              ? "Importerade ordrar från det gamla WordPress-systemet (2015–2021). Bevaras för bokföring; ingen åtgärd behövs."
              : "Filtrera på status, sök på ordernummer eller e-post."
        }
        crumbs={[
          { label: "Beställningar", href: "/admin/ordrar" },
          { label: activeFilter.label },
        ]}
      />

      {/* Filter tabs + count chips */}
      <div className="flex flex-col md:flex-row gap-4 md:items-center mb-6">
        <nav aria-label="Filter" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const isActive = f.slug === activeFilter.slug;
            const count = countForFilter(f);
            const href =
              `/admin/ordrar?status=${f.slug}${
                q ? `&q=${encodeURIComponent(q)}` : ""
              }`;
            return (
              <Link
                key={f.slug}
                href={href}
                className={
                  isActive
                    ? "inline-flex items-center gap-2 px-4 min-h-11 rounded-full bg-primary-deep text-surface font-sans text-[13.5px] font-semibold"
                    : "inline-flex items-center gap-2 px-4 min-h-11 rounded-full bg-surface-alt border-2 border-border text-ink-body font-sans text-[13.5px] font-semibold hover:border-primary/40"
                }
              >
                <span>{f.label}</span>
                {count > 0 && (
                  <span
                    className={
                      isActive
                        ? "inline-flex items-center justify-center min-w-[24px] h-5 px-1.5 rounded-full bg-surface/25 text-surface font-sans text-[11.5px] font-bold tabular-nums"
                        : "inline-flex items-center justify-center min-w-[24px] h-5 px-1.5 rounded-full bg-ink-mute/15 text-ink-mute font-sans text-[11.5px] font-bold tabular-nums"
                    }
                  >
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <form action="/admin/ordrar" method="get" className="md:ml-auto">
          <input type="hidden" name="status" value={activeFilter.slug} />
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Sök ordernr eller e-post"
            className="h-12 px-4 rounded-lg border-2 border-border bg-surface-alt font-sans text-[15px] text-ink placeholder:text-ink-soft outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 min-w-[280px]"
          />
        </form>
      </div>

      {/* List — client component handles hover quick-actions,
          keyboard nav (↑/↓/j/k between rows), and bulk selection +
          sticky bulk-action toolbar. Server still owns data fetching;
          the list just consumes plain-shape rows. */}
      <div className="bg-surface-alt border border-border rounded-xl overflow-hidden">
        {orders.length === 0 ? (
          <p className="px-5 py-12 text-center font-sans text-[14.5px] text-ink-mute">
            {activeFilter.slug === "paid"
              ? "Inga ordrar väntar på packning just nu."
              : "Inga ordrar matchar filtret."}
          </p>
        ) : (
          <OrdrarList
            orders={orders.map((o) => ({
              id: o.id,
              orderNumber: o.orderNumber,
              email: o.email,
              status: o.status,
              totalAmount: o.totalAmount.toString(),
              createdAt: o.createdAt,
              legacySource: o.legacySource,
              itemCount: o._count.items,
            }))}
          />
        )}
        {total > orders.length && (
          <p className="px-5 py-3 border-t border-border-soft font-sans text-[13px] text-ink-mute text-center">
            Visar {orders.length} av {total} ordrar. Avgränsa med filter
            eller sökning för att se fler.
          </p>
        )}
      </div>
    </>
  );
}
