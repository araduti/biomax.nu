import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Display, Eyebrow } from "@/components/ui/typography";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { OrderStatusUpdate } from "@/components/admin/order-status-update";
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

  return (
    <>
      <Link
        href="/admin/ordrar"
        className="inline-flex items-center gap-1 font-sans text-[13px] text-primary hover:text-primary-deep transition-colors mb-4"
      >
        ← Alla ordrar
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
        <div>
          <Eyebrow>Ordernummer</Eyebrow>
          <Display as="h1" size="xl" className="mt-3">
            {order.orderNumber}
          </Display>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>
      <p className="font-sans text-base text-ink-mute mb-8">
        {dateFmt.format(order.createdAt)}
        {order.legacySource ? ` · arkiverad (${order.legacySource})` : ""}
      </p>

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
        {/* Items */}
        <section className="bg-surface-alt border border-border rounded-2xl overflow-hidden">
          <h2 className="px-6 py-4 border-b border-border-soft font-sans text-[10px] uppercase tracking-[0.22em] text-ink-mute font-semibold">
            Innehåll · {order.items.length} produkter
          </h2>
          {order.items.length > 0 ? (
            <ul className="divide-y divide-border-soft">
              {order.items.map((item) => (
                <li key={item.id} className="flex gap-4 px-6 py-5 items-center">
                  {item.product?.imageUrl ? (
                    <Link
                      href={`/admin/produkter/${item.product.slug}`}
                      className="relative w-16 h-16 rounded-lg overflow-hidden bg-surface-warm flex-shrink-0"
                    >
                      <Image
                        src={item.product.imageUrl}
                        alt={item.productName}
                        fill
                        sizes="64px"
                        className="object-cover mix-blend-darken"
                      />
                    </Link>
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-surface-warm flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-[15px] font-medium tracking-tight text-primary-deep line-clamp-2">
                      {item.productName}
                    </p>
                    <p className="font-sans text-[12px] text-ink-mute mt-0.5">
                      {item.productSku && (
                        <>
                          SKU: {item.productSku} ·{" "}
                        </>
                      )}
                      {item.quantity} × {formatPriceSEK(item.unitPrice.toString())}
                    </p>
                  </div>
                  <span className="font-sans text-[14px] font-semibold text-ink-body whitespace-nowrap">
                    {formatPriceSEK(item.totalPrice.toString())}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-6 py-8 text-center font-sans text-[14px] text-ink-mute italic max-w-[480px] mx-auto">
              Inga raditems sparade (importerad order — bara totalbelopp).
            </p>
          )}

          <dl className="px-6 py-5 border-t border-border space-y-2 font-sans text-[14px]">
            <div className="flex justify-between text-ink-body">
              <dt>Delsumma</dt>
              <dd className="font-semibold">
                {formatPriceSEK(order.subtotal.toString())}
              </dd>
            </div>
            <div className="flex justify-between text-ink-mute">
              <dt>Frakt</dt>
              <dd>{formatPriceSEK(order.shippingAmount.toString())}</dd>
            </div>
            <div className="flex justify-between text-ink-mute">
              <dt>Moms ({(order.taxRateBp / 100).toString().replace(".", ",")} %)</dt>
              <dd>{formatPriceSEK(order.taxAmount.toString())}</dd>
            </div>
            <div className="flex justify-between text-primary-deep font-display text-lg pt-3 border-t border-border-soft mt-2">
              <dt>Totalt</dt>
              <dd className="font-medium">
                {formatPriceSEK(order.totalAmount.toString())}
              </dd>
            </div>
          </dl>
        </section>

        {/* Customer + meta sidebar */}
        <aside className="flex flex-col gap-4">
          <div className="bg-surface-alt border border-border rounded-2xl p-5">
            <h3 className="font-sans text-[10px] uppercase tracking-[0.22em] text-ink-mute font-semibold mb-3">
              Kund
            </h3>
            {order.user ? (
              <Link
                href={`/admin/kunder/${order.user.id}`}
                className="font-display text-[16px] font-medium tracking-tight text-primary-deep hover:text-primary transition-colors"
              >
                {order.user.name ?? order.user.email}
              </Link>
            ) : (
              <p className="font-display text-[16px] font-medium text-primary-deep">
                Gästbeställning
              </p>
            )}
            <p className="font-sans text-[13px] text-ink-mute mt-1 break-all">
              {order.email}
            </p>
            {order.marketingConsent && (
              <p className="font-sans text-[11px] text-accent-deep font-semibold mt-2">
                ✓ Nyhetsbrev
              </p>
            )}
          </div>

          {order.shippingAddress && (
            <div className="bg-surface-alt border border-border rounded-2xl p-5">
              <h3 className="font-sans text-[10px] uppercase tracking-[0.22em] text-ink-mute font-semibold mb-3">
                Levereras till
              </h3>
              <p className="font-sans text-[14px] text-ink-body leading-relaxed">
                {order.shippingAddress.fullName}
                <br />
                {order.shippingAddress.street}
                <br />
                {order.shippingAddress.postalCode}{" "}
                {order.shippingAddress.city}
                {order.shippingAddress.phone && (
                  <>
                    <br />
                    <span className="text-ink-mute">{order.shippingAddress.phone}</span>
                  </>
                )}
              </p>
            </div>
          )}

          <div className="bg-surface-alt border border-border rounded-2xl p-5">
            <h3 className="font-sans text-[10px] uppercase tracking-[0.22em] text-ink-mute font-semibold mb-3">
              Betalning
            </h3>
            <p className="font-sans text-[14px] text-ink-body">
              {order.paymentProvider}
              <br />
              <span className="font-sans text-[12px] text-ink-mute break-all">
                {order.paymentReference || "—"}
              </span>
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
