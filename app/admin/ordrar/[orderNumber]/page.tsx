import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { ShipmentControls } from "@/components/admin/shipment-controls";
import { OrderStatusUpdate } from "@/components/admin/order-status-update";
import { CopyButton } from "@/components/admin/copy-button";
import { formatPriceSEK } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const dateFmt = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AdminOrderDetail({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: {
        select: {
          id: true,
          productName: true,
          productSku: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
          product: { select: { slug: true, imageUrl: true } },
        },
      },
      user: {
        select: { id: true, email: true, name: true, firstName: true, lastName: true },
      },
      shippingAddress: true,
      billingAddress: true,
    },
  });
  if (!order) notFound();

  const addressLines = order.shippingAddress
    ? [
        order.shippingAddress.fullName,
        order.shippingAddress.street,
        `${order.shippingAddress.postalCode} ${order.shippingAddress.city}`,
        order.shippingAddress.phone ?? "",
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  return (
    <>
      <AdminPageHeader
        eyebrow="Beställningar"
        title={order.orderNumber}
        crumbs={[
          { label: "Beställningar", href: "/admin/ordrar" },
          { label: order.orderNumber },
        ]}
        subtitle={
          <span className="inline-flex flex-wrap items-baseline gap-3">
            <OrderStatusBadge status={order.status} />
            <span>
              {dateFmt.format(order.createdAt)}
              {order.legacySource
                ? ` · arkiverad (${order.legacySource})`
                : ""}
            </span>
          </span>
        }
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <Link
          href={`/admin/ordrar/${order.orderNumber}/faktura`}
          className="inline-flex items-center gap-2 h-11 px-4 rounded-lg border border-border bg-surface-alt font-sans text-[14px] font-semibold text-primary-deep hover:bg-surface-warm transition-colors"
        >
          <span aria-hidden>📄</span>
          Skriv ut faktura
        </Link>
      </div>

      {/* Status actions */}
      <section className="bg-surface-alt border border-border rounded-2xl p-6 mb-6">
        <h2 className="font-display text-xl font-medium tracking-tight text-primary-deep mb-4">
          Hantera order
        </h2>
        <OrderStatusUpdate
          orderNumber={order.orderNumber}
          status={order.status}
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        {/* Items + totals */}
        <section className="bg-surface-alt border border-border rounded-2xl overflow-hidden">
          <h2 className="px-6 py-4 border-b border-border-soft font-sans text-[12px] uppercase tracking-[0.22em] text-ink-mute font-semibold">
            Innehåll · {order.items.length} produkter
          </h2>
          {order.items.length > 0 ? (
            <ul className="divide-y divide-border-soft">
              {order.items.map((item) => (
                <li
                  key={item.id}
                  className="flex gap-4 px-6 py-5 items-center min-h-[88px]"
                >
                  {item.product?.imageUrl ? (
                    <Link
                      href={`/admin/produkter/${item.product.slug}`}
                      className="relative w-20 h-20 rounded-lg overflow-hidden bg-surface-warm flex-shrink-0"
                    >
                      <Image
                        src={item.product.imageUrl}
                        alt={item.productName}
                        fill
                        sizes="80px"
                        className="object-cover mix-blend-darken"
                      />
                    </Link>
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-surface-warm flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-[16px] font-medium tracking-tight text-primary-deep line-clamp-2">
                      {item.productName}
                    </p>
                    <p className="font-sans text-[13px] text-ink-mute mt-1">
                      {item.productSku && <>SKU: {item.productSku} · </>}
                      {item.quantity} ×{" "}
                      {formatPriceSEK(item.unitPrice.toString())}
                    </p>
                  </div>
                  <span className="font-display text-[16px] font-medium text-primary-deep tabular-nums whitespace-nowrap">
                    {formatPriceSEK(item.totalPrice.toString())}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-6 py-8 text-center font-sans text-[14.5px] text-ink-mute italic max-w-[480px] mx-auto">
              Inga raditems sparade (importerad order — bara totalbelopp).
            </p>
          )}

          <dl className="px-6 py-5 border-t border-border space-y-2.5 font-sans text-[15px]">
            <div className="flex justify-between text-ink-body">
              <dt>Delsumma</dt>
              <dd className="font-semibold tabular-nums">
                {formatPriceSEK(order.subtotal.toString())}
              </dd>
            </div>
            {order.loyaltyPointsRedeemed && order.loyaltyPointsRedeemed > 0 && (
              <div className="flex justify-between text-accent-deep font-semibold">
                <dt>
                  Familjen Biomax ·{" "}
                  {order.loyaltyPointsRedeemed.toLocaleString("sv-SE")} p
                </dt>
                <dd className="tabular-nums">
                  −{formatPriceSEK(order.discountAmount.toString())}
                </dd>
              </div>
            )}
            <div className="flex justify-between text-ink-mute">
              <dt>Frakt</dt>
              <dd className="tabular-nums">
                {formatPriceSEK(order.shippingAmount.toString())}
              </dd>
            </div>
            <div className="flex justify-between text-ink-mute">
              <dt>
                Moms ({(order.taxRateBp / 100).toString().replace(".", ",")} %)
              </dt>
              <dd className="tabular-nums">
                {formatPriceSEK(order.taxAmount.toString())}
              </dd>
            </div>
            <div className="flex justify-between text-primary-deep font-display text-[20px] pt-3 border-t border-border-soft mt-3">
              <dt>Totalt</dt>
              <dd className="font-medium tabular-nums">
                {formatPriceSEK(order.totalAmount.toString())}
              </dd>
            </div>
          </dl>
        </section>

        {/* Customer + address + payment sidebar */}
        <aside className="flex flex-col gap-4">
          <div className="bg-surface-alt border border-border rounded-2xl p-5">
            <div className="flex items-baseline justify-between gap-2 mb-3">
              <h3 className="font-sans text-[12px] uppercase tracking-[0.22em] text-ink-mute font-semibold">
                Kund
              </h3>
              <CopyButton value={order.email} label="Kopiera e-post" />
            </div>
            {order.user ? (
              <Link
                href={`/admin/kunder/${order.user.id}`}
                className="font-display text-[17px] font-medium tracking-tight text-primary-deep hover:text-primary transition-colors"
              >
                {order.user.name ?? order.user.email}
              </Link>
            ) : (
              <p className="font-display text-[17px] font-medium text-primary-deep">
                Gästbeställning
              </p>
            )}
            <p className="font-sans text-[14px] text-ink-mute mt-1 break-all">
              {order.email}
            </p>
            {order.marketingConsent && (
              <p className="font-sans text-[12.5px] text-accent-deep font-semibold mt-2">
                ✓ Nyhetsbrev
              </p>
            )}
          </div>

          {order.shippingAddress && (
            <div className="bg-surface-alt border border-border rounded-2xl p-5">
              <div className="flex items-baseline justify-between gap-2 mb-3">
                <h3 className="font-sans text-[12px] uppercase tracking-[0.22em] text-ink-mute font-semibold">
                  Levereras till
                </h3>
                <CopyButton value={addressLines} label="Kopiera adress" />
              </div>
              <p className="font-sans text-[15px] text-ink-body leading-relaxed">
                <strong className="font-semibold text-primary-deep">
                  {order.shippingAddress.fullName}
                </strong>
                <br />
                {order.shippingAddress.street}
                <br />
                {order.shippingAddress.postalCode}{" "}
                {order.shippingAddress.city}
                {order.shippingAddress.phone && (
                  <>
                    <br />
                    <span className="text-ink-mute">
                      {order.shippingAddress.phone}
                    </span>
                  </>
                )}
              </p>
            </div>
          )}

          <div className="bg-surface-alt border border-border rounded-2xl p-5">
            <h3 className="font-sans text-[12px] uppercase tracking-[0.22em] text-ink-mute font-semibold mb-3">
              Betalning
            </h3>
            <p className="font-sans text-[15px] text-ink-body">
              {order.paymentProvider}
            </p>
            {order.paymentReference ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <code className="font-mono text-[12.5px] text-ink-mute break-all">
                  {order.paymentReference}
                </code>
                <CopyButton
                  value={order.paymentReference}
                  label="Kopiera ref"
                />
              </div>
            ) : (
              <p className="mt-2 font-sans text-[13px] text-ink-soft">—</p>
            )}
          </div>
        </aside>
      </div>

      <ShipmentControls
        orderId={order.id}
        orderNumber={order.orderNumber}
        status={order.status}
        trackingNumber={order.trackingNumber}
        labelPdfUrl={order.labelPdfUrl}
        carrier={order.carrier}
      />
    </>
  );
}
