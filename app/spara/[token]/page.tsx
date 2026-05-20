import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/site/top-bar";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Display, Eyebrow } from "@/components/ui/typography";
import { formatPriceSEK } from "@/lib/format";
import { hostTenantScope } from "@/lib/tenant/db";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";

export const metadata: Metadata = {
  title: "Spåra beställning",
  robots: { index: false, follow: false },
};

const dateFmt = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

type RouteParams = { params: Promise<{ token: string }> };

const POSTNORD_TRACKING = "https://www.postnord.se/vara-verktyg/spara-brev-paket-pall";

/**
 * Public order-tracking page — token-protected so a guest can hit it
 * from the order-confirmation email without logging in. Read-only;
 * mutations live on /konto/ordrar/[orderNumber] (authenticated).
 *
 * The token is 32 chars of base64url randomness generated at order
 * creation. We never expose `orderNumber` in the URL; guessing one
 * doesn't get you the other.
 */
export default async function TrackOrderPage({ params }: RouteParams) {
  const { token } = await params;
  if (!token || token.length < 16) notFound();

  const order = await hostTenantScope((tx) =>
    tx.order.findUnique({
      where: { trackingToken: token },
      include: {
        items: {
          include: {
            product: { select: { slug: true, imageUrl: true } },
          },
        },
        shippingAddress: true,
      },
    })
  );
  if (!order) notFound();

  const fulfilled = order.status === "FULFILLED";
  const trackingHref = order.trackingNumber
    ? `${POSTNORD_TRACKING}?shipmentId=${encodeURIComponent(order.trackingNumber)}`
    : null;

  return (
    <>
      <TopBar />
      <Header />
      <main className="bg-surface min-h-[60vh]">
        <div className="max-w-[860px] mx-auto px-6 md:px-8 py-12 md:py-16">
          <Eyebrow className="mb-3">Beställning · {order.orderNumber}</Eyebrow>
          <Display as="h1" size="lg" className="mb-6">
            Din leverans
          </Display>

          <div className="flex flex-wrap items-baseline gap-4 mb-8">
            <OrderStatusBadge status={order.status} />
            <p className="font-sans text-small text-ink-mute">
              Beställd {dateFmt.format(order.createdAt)}
            </p>
          </div>

          {/* Tracking link — only when shipment is booked. */}
          {trackingHref ? (
            <div className="bg-surface-alt border border-border rounded-2xl p-5 md:p-6 mb-8">
              <p className="font-sans text-micro uppercase tracking-[0.18em] font-semibold text-ink-soft mb-1">
                {order.carrier === "POSTNORD" ? "PostNord" : (order.carrier ?? "Frakt")}
              </p>
              <p className="font-display text-xl font-medium text-primary-deep mb-2">
                Kollinummer:{" "}
                <code className="font-mono text-base">{order.trackingNumber}</code>
              </p>
              <Link
                href={trackingHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 rounded-md bg-primary-deep text-surface font-sans text-small font-semibold hover:bg-primary-deep/90 transition-colors"
              >
                Spåra hos PostNord →
              </Link>
            </div>
          ) : (
            <div className="bg-surface-warm border border-border rounded-2xl p-5 md:p-6 mb-8">
              <p className="font-sans text-body text-ink-body leading-relaxed">
                {fulfilled
                  ? "Vi har packat och skickat din beställning — så snart PostNord scannat in paketet får du en spårningslänk här."
                  : "Vi packar din beställning så snart vi kan. Du får ett spårningsnummer här när paketet skickas, samt ett mejl när det är inscannat hos PostNord."}
              </p>
              {order.servicePointName && (
                <p className="mt-3 font-sans text-small text-ink-mute">
                  Leverans till ombud:{" "}
                  <strong className="text-primary-deep">
                    {order.servicePointName}
                  </strong>
                </p>
              )}
            </div>
          )}

          {/* Address + items */}
          {order.shippingAddress && (
            <section className="mb-8">
              <p className="font-sans text-micro uppercase tracking-[0.18em] font-semibold text-ink-soft mb-2">
                Levereras till
              </p>
              <p className="font-sans text-body text-ink-body leading-relaxed">
                {order.shippingAddress.fullName}
                <br />
                {order.shippingAddress.street}
                <br />
                {order.shippingAddress.postalCode}{" "}
                {order.shippingAddress.city}
              </p>
            </section>
          )}

          <section className="mb-8">
            <p className="font-sans text-micro uppercase tracking-[0.18em] font-semibold text-ink-soft mb-3">
              Innehåll
            </p>
            <ul className="bg-surface-alt border border-border rounded-2xl divide-y divide-border-soft">
              {order.items.map((it) => (
                <li key={it.id} className="flex gap-4 items-center px-5 py-4">
                  <div className="relative w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-surface-warm">
                    <Image
                      src={it.product?.imageUrl || "/products/_placeholder.svg"}
                      alt={it.productName}
                      fill
                      sizes="56px"
                      className="object-cover mix-blend-darken"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-body-lg font-medium text-primary-deep leading-tight">
                      {it.productName}
                    </p>
                    <p className="font-sans text-caption text-ink-mute mt-0.5">
                      {it.quantity} st · {formatPriceSEK(it.unitPrice.toString())}/st
                    </p>
                  </div>
                  <p className="font-display text-base text-primary-deep tabular-nums">
                    {formatPriceSEK(it.totalPrice.toString())}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-right font-sans text-body text-ink-body">
              Totalt:{" "}
              <strong className="font-display text-lg text-primary-deep tabular-nums ml-2">
                {formatPriceSEK(order.totalAmount.toString())}
              </strong>
            </p>
          </section>

          <div className="border-t border-border pt-6 font-sans text-small text-ink-mute leading-relaxed">
            <p>
              Har du frågor om din beställning? Mejla{" "}
              <a
                href="mailto:kontakt@biomax.nu"
                className="text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent"
              >
                kontakt@biomax.nu
              </a>{" "}
              och uppge ordernummer {order.orderNumber}.
            </p>
            {order.userId && (
              <p className="mt-2">
                Inloggade kunder kan även hantera beställningen från{" "}
                <Link
                  href={`/konto/ordrar/${order.orderNumber}`}
                  className="text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent"
                >
                  Mina ordrar
                </Link>
                .
              </p>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
