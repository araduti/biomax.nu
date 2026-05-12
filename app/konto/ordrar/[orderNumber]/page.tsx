import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Display, Eyebrow } from "@/components/ui/typography";
import { ButtonLink } from "@/components/ui/button";
import { formatPriceSEK } from "@/lib/format";
import { currentUser } from "@/lib/session";
import { getOrderForUser, statusDisplay } from "@/lib/account/orders";

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
        className="inline-flex items-center gap-1 font-sans text-[13px] text-primary hover:text-primary-deep transition-colors mb-4"
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
          className={`font-sans text-[12px] font-semibold uppercase tracking-[0.18em] ${status.tone}`}
        >
          {status.label}
        </span>
      </div>

      {/* Items */}
      <section className="mt-10 bg-surface-alt border border-border rounded-2xl overflow-hidden">
        <h2 className="px-6 md:px-8 py-4 border-b border-border-soft font-sans text-[10px] uppercase tracking-[0.22em] text-ink-mute font-semibold">
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
                      className="font-display text-[15px] font-medium tracking-tight text-primary-deep hover:text-primary transition-colors line-clamp-2"
                    >
                      {item.productName}
                    </Link>
                  ) : (
                    <p className="font-display text-[15px] font-medium tracking-tight text-primary-deep line-clamp-2">
                      {item.productName}
                    </p>
                  )}
                  <p className="font-sans text-[12px] text-ink-mute mt-0.5">
                    {item.quantity} ×{" "}
                    {formatPriceSEK(item.unitPrice.toString())}
                  </p>
                </div>
                <span className="font-sans text-[14px] font-semibold text-ink-body whitespace-nowrap">
                  {formatPriceSEK(item.totalPrice.toString())}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-6 md:px-8 py-8 text-center">
            <p className="font-sans text-[14px] text-ink-mute italic leading-relaxed max-w-[480px] mx-auto">
              Innehållet för denna order finns inte tillgängligt i det nya
              systemet (importerad från gamla biomax.nu — bara totalbelopp och
              datum bevarades). Kontakta oss om du behöver detaljer.
            </p>
          </div>
        )}

        {/* Totals */}
        <dl className="px-6 md:px-8 py-5 border-t border-border space-y-2 font-sans text-[14px]">
          <div className="flex justify-between text-ink-body">
            <dt>Delsumma</dt>
            <dd className="font-semibold">
              {formatPriceSEK(order.subtotal.toString())}
            </dd>
          </div>
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
          <div className="flex justify-between text-primary-deep font-display text-lg pt-3 border-t border-border-soft mt-2">
            <dt>Totalt</dt>
            <dd className="font-medium">
              {formatPriceSEK(order.totalAmount.toString())}
            </dd>
          </div>
        </dl>
      </section>

      {/* Address + payment side-by-side when available */}
      {(order.shippingAddress || order.paymentProvider) && (
        <section className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {order.shippingAddress && (
            <div className="bg-surface-alt border border-border rounded-2xl p-6">
              <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-ink-mute font-semibold mb-3">
                Levereras till
              </p>
              <p className="font-sans text-[14px] text-ink-body leading-relaxed">
                {order.shippingAddress.fullName}
                <br />
                {order.shippingAddress.street}
                <br />
                {order.shippingAddress.postalCode} {order.shippingAddress.city}
              </p>
            </div>
          )}
          <div className="bg-surface-alt border border-border rounded-2xl p-6">
            <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-ink-mute font-semibold mb-3">
              Betalning
            </p>
            <p className="font-sans text-[14px] text-ink-body leading-relaxed">
              {order.paymentProvider === "KLARNA"
                ? "Klarna"
                : order.paymentProvider === "STRIPE"
                  ? "Stripe"
                  : "Manuell"}
              <br />
              <span className="text-ink-mute text-[12px]">
                {order.paymentReference || "—"}
              </span>
            </p>
          </div>
        </section>
      )}

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
