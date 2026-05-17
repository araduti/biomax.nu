import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TopBar } from "@/components/site/top-bar";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Display, Eyebrow, Accent } from "@/components/ui/typography";
import { ButtonLink } from "@/components/ui/button";
import { formatPriceSEK } from "@/lib/format";
import {
  getOrderForConfirmation,
  ensureOrderFromKustomOrder,
} from "@/lib/checkout/order-actions";
import { getKlarnaOrder, isKlarnaConfigured } from "@/lib/klarna/client";
import { ClearCartOnMount, DeliveryReminder } from "./clear-cart";

export const metadata: Metadata = {
  title: "Tack för din beställning",
  robots: { index: false, follow: false },
  alternates: { canonical: "/checkout/bekraftelse" },
};

const STEPS: { title: string; body: string }[] = [
  {
    title: "Bekräftelse skickad",
    body: "Du får en orderbekräftelse via e-post inom någon minut. Kolla skräpposten om den dröjer.",
  },
  {
    title: "Vi packar i Kållered",
    body: "Vårt lager packar beställningar varje vardag. Det du beställer före kl 13 skickas oftast samma dag.",
  },
  {
    title: "PostNord tar över",
    body: "Du får en spårningslänk via e-post så snart paketet har lämnats in. Leverans inom 1–3 arbetsdagar.",
  },
  {
    title: "Frågor eller fel?",
    body: "Mejla kontakt@biomax.nu med ditt ordernummer så hjälper vi dig så snart vi kan.",
  },
];

function CheckmarkSeal() {
  return (
    <span
      aria-hidden
      className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/15 text-accent-deep mb-6"
    >
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  );
}

/**
 * Shown when payment succeeded but we can't render the full order yet
 * (Kustom read failed / Order row not visible — the push webhook
 * persists it out-of-band). Never 404 a customer who has paid.
 */
function PaymentReceivedFallback() {
  return (
    <>
      <TopBar />
      <Header />
      <ClearCartOnMount />
      <main className="bg-surface min-h-[60vh] py-14 md:py-20 px-6 md:px-8">
        <div className="max-w-[640px] mx-auto">
          <CheckmarkSeal />
          <Eyebrow className="text-accent-deep">Tack för ditt köp</Eyebrow>
          <Display as="h1" size="xl" className="mt-4 mb-4">
            Betalning <Accent>mottagen</Accent>
          </Display>
          <p className="font-sans text-base md:text-lg text-ink-body leading-relaxed">
            Vi har tagit emot din betalning. En orderbekräftelse med alla
            detaljer skickas till din e-post inom kort. Kolla gärna
            skräpposten om den dröjer.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href="/produkter" variant="primary" size="md">
              Fortsätt handla
            </ButtonLink>
            <ButtonLink href="/konto" variant="outline" size="md">
              Mina ordrar
            </ButtonLink>
          </div>
          <div className="mt-14 pt-8 border-t border-border-soft">
            <p className="font-sans text-[13px] text-ink-mute leading-relaxed">
              Frågor om din beställning? Mejla{" "}
              <Link
                href="mailto:kontakt@biomax.nu"
                className="text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent"
              >
                kontakt@biomax.nu
              </Link>
              .
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; klarna_order_id?: string }>;
}) {
  const params = await searchParams;
  let orderNumber = params.order;

  // Real Kustom flow: Kustom redirects here with ?klarna_order_id=.
  // Read the order back, then idempotently create our Order row (the
  // push webhook does the same — whichever lands first wins). If the
  // read fails we still show a graceful "payment received" page
  // because the webhook will persist the order out-of-band.
  const kustomOrderId = params.klarna_order_id;
  if (!orderNumber && kustomOrderId && isKlarnaConfigured()) {
    try {
      const kustomOrder = await getKlarnaOrder(kustomOrderId);
      const res = await ensureOrderFromKustomOrder(kustomOrder);
      if (res.ok) orderNumber = res.orderNumber;
    } catch (err) {
      console.error("[bekraftelse] Kustom read/ensure failed", err);
    }
    if (!orderNumber) return <PaymentReceivedFallback />;
  }

  if (!orderNumber) redirect("/");

  const order = await getOrderForConfirmation(orderNumber);
  if (!order) {
    // Real-flow row not visible yet (webhook still in flight) — don't
    // 404 a paying customer; the email + webhook will catch up.
    if (kustomOrderId) return <PaymentReceivedFallback />;
    redirect("/");
  }

  return (
    <>
      <TopBar />
      <Header />
      <ClearCartOnMount />
      <main className="bg-surface min-h-[60vh] py-14 md:py-20 px-6 md:px-8">
        <div className="max-w-[820px] mx-auto">
          <CheckmarkSeal />
          <Eyebrow className="text-accent-deep">
            Tack — vi har din beställning
          </Eyebrow>
          <Display as="h1" size="xl" className="mt-4 mb-4">
            Beställning <Accent>bekräftad</Accent>
          </Display>
          <p className="font-sans text-base md:text-lg text-ink-body leading-relaxed max-w-[640px]">
            Vi har skickat en bekräftelse till{" "}
            <strong className="font-semibold">{order.email}</strong>.
            Ordernummer{" "}
            <code className="font-mono text-[15px] bg-surface-warm px-1.5 py-0.5 rounded">
              {order.orderNumber}
            </code>
            .
          </p>

          {/* Next-steps timeline + delivery reminder side-by-side on wide screens */}
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start">
            <section>
              <h2 className="font-display text-xl md:text-2xl font-medium tracking-tight text-primary-deep mb-5">
                Vad händer nu?
              </h2>
              <ol className="space-y-5">
                {STEPS.map((step, i) => (
                  <li key={i} className="flex gap-4">
                    <span
                      aria-hidden
                      className="flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-deep text-surface font-display text-[15px] font-medium tabular-nums"
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 pt-0.5">
                      <p className="font-display text-[16px] font-medium text-primary-deep tracking-tight">
                        {step.title}
                      </p>
                      <p className="mt-1 font-sans text-[14px] text-ink-mute leading-relaxed">
                        {step.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <aside>
              <DeliveryReminder />
            </aside>
          </div>

          {/* Order summary */}
          <section className="mt-14">
            <h2 className="font-display text-xl md:text-2xl font-medium tracking-tight text-primary-deep mb-5">
              Din beställning
            </h2>
            <div className="bg-surface-alt border border-border rounded-2xl overflow-hidden">
              <ul className="px-6 md:px-8 divide-y divide-border-soft">
                {order.items.map((item, i) => (
                  <li
                    key={i}
                    className="py-4 flex items-baseline justify-between gap-3 font-sans"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-[15px] font-medium text-primary-deep tracking-tight truncate">
                        {item.productName}
                      </p>
                      <p className="text-[13px] text-ink-mute mt-0.5">
                        {item.quantity} ×{" "}
                        {formatPriceSEK(item.unitPrice.toString())}
                      </p>
                    </div>
                    <span className="text-[14px] font-semibold text-ink-body whitespace-nowrap">
                      {formatPriceSEK(item.totalPrice.toString())}
                    </span>
                  </li>
                ))}
              </ul>

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
            </div>
          </section>

          {/* CTAs */}
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href="/produkter" variant="primary" size="md">
              Fortsätt handla
            </ButtonLink>
            <ButtonLink href="/konto" variant="outline" size="md">
              Mina ordrar
            </ButtonLink>
            <ButtonLink href="/kunskap" variant="ghost" size="md">
              Läs vidare i kunskapsbanken
            </ButtonLink>
          </div>

          {/* Support footer */}
          <div className="mt-14 pt-8 border-t border-border-soft">
            <p className="font-sans text-[13px] text-ink-mute leading-relaxed">
              Något som inte stämmer i beställningen? Mejla{" "}
              <Link
                href="mailto:kontakt@biomax.nu"
                className="text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent"
              >
                kontakt@biomax.nu
              </Link>{" "}
              med ditt ordernummer så hjälper vi dig så snart vi kan.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
