import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { prisma } from "@/lib/prisma";
import { PacklistaControls } from "@/components/admin/packlista-controls";
import { PacklistaOrderCard } from "@/components/admin/packlista-order-card";

export const metadata = { title: "Packlista" };

const dateFmt = new Intl.DateTimeFormat("sv-SE", {
  day: "numeric",
  month: "long",
});

type RouteParams = {
  searchParams: Promise<{ date?: string }>;
};

/**
 * Packing list — "ordrar att packa" by default, optionally narrowed to
 * a date.
 *
 * The old default ("today's orders") meant the page was empty on most
 * mornings (no orders placed in the last 12h) even though there were
 * PAID orders sitting in the queue from yesterday or the day before.
 * Now the page answers "what should I pack right now?" — every PAID
 * non-legacy order, oldest first, with an optional `?date=` filter for
 * audit / re-print.
 */
export default async function PacklistaPage({ searchParams }: RouteParams) {
  const params = await searchParams;
  const dateStr = (params.date ?? "").trim();

  let dateFilter: { gte: Date; lt: Date } | null = null;
  if (dateStr) {
    const day = new Date(`${dateStr}T00:00:00Z`);
    if (Number.isNaN(day.getTime())) {
      return (
        <p className="font-sans text-[14px] text-[#B5523B]">
          Ogiltigt datum. Använd ?date=YYYY-MM-DD.
        </p>
      );
    }
    const dayStart = new Date(day);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
    dateFilter = { gte: dayStart, lt: dayEnd };
  }

  const orders = await prisma.order.findMany({
    where: {
      status: "PAID",
      legacySource: null,
      ...(dateFilter ? { createdAt: dateFilter } : {}),
    },
    // Oldest first — warehouse packs FIFO so the customer who's
    // waited longest ships first.
    orderBy: { createdAt: "asc" },
    include: {
      items: {
        include: {
          product: { select: { slug: true, imageUrl: true } },
        },
      },
      shippingAddress: true,
    },
  });

  const totalLines = orders.reduce((s, o) => s + o.items.length, 0);
  const dayLabel = dateStr ? dateFmt.format(new Date(`${dateStr}T00:00:00Z`)) : null;

  const titleLabel = dayLabel
    ? `Packlista · ${dayLabel}`
    : orders.length === 0
      ? "Inga ordrar väntar"
      : `Packlista · ${orders.length} att packa`;

  return (
    <>
      <AdminPageHeader
        eyebrow="Beställningar"
        title={titleLabel}
        crumbs={[
          { label: "Beställningar", href: "/admin/ordrar" },
          { label: "Packlista" },
        ]}
        subtitle={
          dayLabel
            ? `${orders.length} ${orders.length === 1 ? "order" : "ordrar"} · ${totalLines} rad${totalLines === 1 ? "" : "er"} för ${dayLabel}.`
            : orders.length === 0
              ? "Alla betalda ordrar är redan packade. Bra jobbat."
              : `${totalLines} rad${totalLines === 1 ? "" : "er"} att packa. Äldsta ordern överst — packa i den ordningen.`
        }
      />

      <PacklistaControls
        defaultDate={dateStr || ""}
        showAllHref="/admin/packlista"
      />

      {orders.length === 0 ? (
        <p className="font-sans text-[14.5px] text-ink-mute italic">
          {dayLabel
            ? `Inga betalda ordrar för ${dayLabel}.`
            : "Inga betalda ordrar väntar på packning."}
        </p>
      ) : (
        <div className="space-y-8">
          {orders.map((o) => (
            <PacklistaOrderCard
              key={o.id}
              order={{
                id: o.id,
                orderNumber: o.orderNumber,
                email: o.email,
                isSubscription: Boolean(o.subscriptionId),
                shippingAddress: o.shippingAddress
                  ? {
                      fullName: o.shippingAddress.fullName,
                      street: o.shippingAddress.street,
                      postalCode: o.shippingAddress.postalCode,
                      city: o.shippingAddress.city,
                    }
                  : null,
                items: o.items.map((it) => ({
                  id: it.id,
                  productName: it.productName,
                  productSku: it.productSku,
                  quantity: it.quantity,
                  imageUrl: it.product?.imageUrl ?? "",
                })),
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
