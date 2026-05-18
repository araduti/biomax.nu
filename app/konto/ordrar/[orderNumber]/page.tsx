import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Display, Eyebrow } from "@/components/ui/typography";
import { ButtonLink } from "@/components/ui/button";
import { formatPriceSEK } from "@/lib/format";
import { currentUser } from "@/lib/session";
import { getOrderForUser, statusDisplay } from "@/lib/account/orders";
import { OrderSelfServicePanel } from "@/components/account/order-self-service-panel";
import { ReturnRequestForm } from "@/components/account/return-request-form";

export const metadata: Metadata = {
  title: "Order",
  robots: { index: false, follow: false },
};

const dateFmt = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const user = (await currentUser())!;
  const order = await getOrderForUser({
    userId: user.id,
    email: user.email,
    orderNumber,
  });
  if (!order) notFound();

  const status = statusDisplay(order.status);
  const isLegacy = !!order.legacySource;
  const hasItems = order.items.length > 0;

  return (
    <>
      <Link
        href="/konto/ordrar"
        className="inline-flex items-center gap-1 font-sans text-small text-primary hover:text-primary-deep transition-colors mb-4"
      >
        ← Alla ordrar
      </Link>

      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <Eyebrow>Ordernummer</Eyebrow>
          <Display as="h1" size="xl" className="mt-3">
            {order.orderNumber}
          </Display>
          <p className="mt-2 font-sans text-base text-ink-mute">
            {dateFmt.format(order.createdAt)}
            {isLegacy ? " · arkiverad från gamla biomax.nu" : ""}
          </p>
        </div>
        <span
          className={`font-sans text-caption font-semibold uppercase tracking-[0.18em] ${status.tone}`}
        >
          {status.label}
        </span>
      </div>

      {/* Items */}
      <section className="mt-10 bg-surface-alt border border-border rounded-2xl overflow-hidden">
        <h2 className="px-6 md:px-8 py-4 border-b border-border-soft font-sans text-micro uppercase tracking-[0.22em] text-ink-mute font-semibold">
          Innehåll
        </h2>

        {hasItems ? (
          <ul className="divide-y divide-border-soft">
            {order.items.map((item) => (
              <li
                key={item.id}
                className="flex gap-4 px-6 md:px-8 py-5 items-center"
              >
                {item.product?.imageUrl ? (
                  <Link
                    href={`/produkter/${item.product.slug}`}
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
                  {item.product ? (
                    <Link
                      href={`/produkter/${item.product.slug}`}
                      className="font-display text-body-lg font-medium tracking-tight text-primary-deep hover:text-primary transition-colors line-clamp-2"
                    >
                      {item.productName}
                    </Link>
                  ) : (
                    <p className="font-display text-body-lg font-medium tracking-tight text-primary-deep line-clamp-2">
                      {item.productName}
                    </p>
                  )}
                  <p className="font-sans text-caption text-ink-mute mt-0.5">
                    {item.quantity} ×{" "}
                    {formatPriceSEK(item.unitPrice.toString())}
                  </p>
                </div>
                <span className="font-sans text-body font-semibold text-ink-body whitespace-nowrap">
                  {formatPriceSEK(item.totalPrice.toString())}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-6 md:px-8 py-8 text-center">
            <p className="font-sans text-body text-ink-mute italic leading-relaxed max-w-[480px] mx-auto">
              Innehållet för denna order finns inte tillgängligt i det nya
              systemet (importerad från gamla biomax.nu — bara totalbelopp och
              datum bevarades). Kontakta oss om du behöver detaljer.
            </p>
          </div>
        )}

        {/* Totals */}
        <dl className="px-6 md:px-8 py-5 border-t border-border space-y-2 font-sans text-body">
          <div className="flex justify-between text-ink-body">
            <dt>Delsumma</dt>
            <dd className="font-semibold">
              {formatPriceSEK(order.subtotal.toString())}
            </dd>
          </div>
          {order.loyaltyPointsRedeemed && order.loyaltyPointsRedeemed > 0 && (
            <div className="flex justify-between text-accent-deep font-semibold">
              <dt>
                Familjen Biomax ·{" "}
                {order.loyaltyPointsRedeemed.toLocaleString("sv-SE")} p
              </dt>
              <dd>−{formatPriceSEK(order.discountAmount.toString())}</dd>
            </div>
          )}
          <div className="flex justify-between text-ink-mute">
            <dt>Frakt</dt>
            <dd>
              {parseFloat(order.shippingAmount.toString()) === 0 ? (
                <span className="text-accent-deep font-semibold">Fri</span>
              ) : (
                formatPriceSEK(order.shippingAmount.toString())
              )}
            </dd>
          </div>
          <div className="flex justify-between text-ink-mute">
            <dt>
              Varav moms (
              {(order.taxRateBp / 100).toString().replace(".", ",")} %)
            </dt>
            <dd className="tabular-nums">
              {formatPriceSEK(order.taxAmount.toString())}
            </dd>
          </div>
          <div className="flex justify-between text-primary-deep font-display text-lg pt-3 border-t border-border-soft mt-2">
            <dt>Totalt</dt>
            <dd className="font-medium">
              {formatPriceSEK(order.totalAmount.toString())}
            </dd>
          </div>
          {order.loyaltyPointsAwarded && order.loyaltyPointsAwarded > 0 && (
            <p className="pt-3 font-sans text-caption text-accent-deep">
              ✓ Du tjänade {order.loyaltyPointsAwarded.toLocaleString("sv-SE")}{" "}
              poäng på den här ordern.
            </p>
          )}
        </dl>
      </section>

      {/* Address + payment side-by-side when available */}
      {(order.shippingAddress || order.paymentProvider) && (
        <section className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {order.shippingAddress && (
            <div className="bg-surface-alt border border-border rounded-2xl p-6">
              <p className="font-sans text-micro uppercase tracking-[0.22em] text-ink-mute font-semibold mb-3">
                Levereras till
              </p>
              <p className="font-sans text-body text-ink-body leading-relaxed">
                {order.shippingAddress.fullName}
                <br />
                {order.shippingAddress.street}
                <br />
                {order.shippingAddress.postalCode} {order.shippingAddress.city}
              </p>
            </div>
          )}
          <div className="bg-surface-alt border border-border rounded-2xl p-6">
            <p className="font-sans text-micro uppercase tracking-[0.22em] text-ink-mute font-semibold mb-3">
              Betalning
            </p>
            <p className="font-sans text-body text-ink-body leading-relaxed">
              {order.paymentProvider === "KLARNA"
                ? "Klarna"
                : order.paymentProvider === "STRIPE"
                  ? "Stripe"
                  : "Manuell"}
              <br />
              <span className="text-ink-mute text-caption">
                {order.paymentReference || "—"}
              </span>
            </p>
          </div>
        </section>
      )}

      {/* Returns request — only surfaces from FULFILLED onward, gated
          by the 14-day window. Server-side validation re-checks. */}
      {order.status === "FULFILLED" && order.items.length > 0 && (
        <div className="mt-10 pt-6 border-t border-border">
          <p className="font-sans text-micro uppercase tracking-[0.22em] text-ink-soft font-semibold mb-4">
            Returer
          </p>
          <ReturnRequestForm
            orderId={order.id}
            lines={order.items.map((it) => ({
              id: it.id,
              productName: it.productName,
              quantity: it.quantity,
            }))}
          />
        </div>
      )}

      {/* Self-service actions — only meaningful while the order is in
          PAID state (i.e. not yet packed). Returns are surfaced from
          FULFILLED onward via lib/orders/return-actions. */}
      <OrderSelfServicePanel
        orderId={order.id}
        orderNumber={order.orderNumber}
        status={order.status}
        shippingAddress={
          order.shippingAddress
            ? {
                fullName: order.shippingAddress.fullName,
                street: order.shippingAddress.street,
                postalCode: order.shippingAddress.postalCode,
                city: order.shippingAddress.city,
                phone: order.shippingAddress.phone,
              }
            : null
        }
      />

      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="/produkter" variant="primary" size="md">
          Handla igen
        </ButtonLink>
        <ButtonLink href="/konto/ordrar" variant="outline" size="md">
          Tillbaka till ordrar
        </ButtonLink>
      </div>
    </>
  );
}
