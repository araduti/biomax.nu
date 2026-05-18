import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TopBar } from "@/components/site/top-bar";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Display, Eyebrow } from "@/components/ui/typography";
import { formatPriceSEK } from "@/lib/format";
import { currentUser } from "@/lib/session";
import { resolveSubscriptionTarget } from "@/lib/subscriptions/actions";
import { intervalLabelSwedish } from "@/lib/subscriptions/constants";
import { SubscriptionCheckout } from "@/components/checkout/subscription-checkout";

export const metadata: Metadata = {
  title: "Starta prenumeration",
  robots: { index: false, follow: false },
  alternates: { canonical: "/prenumerera/kassa" },
};

export default async function SubscriptionCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{
    productId?: string;
    variantId?: string;
    interval?: string;
  }>;
}) {
  const params = await searchParams;
  const productId = params.productId;
  const variantId = params.variantId || null;
  const intervalDays = Number(params.interval);

  if (!productId || ![30, 60, 90].includes(intervalDays)) {
    redirect("/produkter");
  }

  const user = await currentUser();
  if (!user) {
    const next = encodeURIComponent(
      `/prenumerera/kassa?productId=${productId}${
        variantId ? `&variantId=${variantId}` : ""
      }&interval=${intervalDays}`
    );
    redirect(`/logga-in?next=${next}`);
  }

  const resolved = await resolveSubscriptionTarget({
    productId,
    variantId,
    quantity: 1,
    intervalDays,
  });
  if (!resolved.ok) {
    redirect(`/produkter`);
  }
  const t = resolved.target;
  const discounted =
    Math.round(t.listUnitPrice * (1 - t.discountPercent / 100) * 100) / 100;

  return (
    <>
      <TopBar />
      <Header />
      <main className="bg-surface min-h-[60vh] py-12 md:py-16 px-6 md:px-8">
        <div className="max-w-[760px] mx-auto">
          <Eyebrow className="text-accent-deep">Prenumeration</Eyebrow>
          <Display as="h1" size="xl" className="mt-3 mb-4">
            Slutför din första leverans
          </Display>
          <p className="font-sans text-base text-ink-body leading-relaxed max-w-[560px]">
            Du betalar för din första leverans nu. Därefter förnyas
            prenumerationen automatiskt{" "}
            <strong className="font-semibold">
              {intervalLabelSwedish(t.intervalDays).toLowerCase()}
            </strong>{" "}
            — avsluta när du vill, utan kostnad.
          </p>

          <div className="mt-7 rounded-2xl border border-border bg-surface-alt p-5 md:p-6">
            <div className="flex items-baseline justify-between gap-4">
              <div className="min-w-0">
                <p className="font-display text-lead font-medium tracking-tight text-primary-deep truncate">
                  {t.productName}
                </p>
                <p className="mt-0.5 font-sans text-small text-ink-mute">
                  {intervalLabelSwedish(t.intervalDays)} · −
                  {t.discountPercent} % på varje leverans
                </p>
              </div>
              <div className="text-right whitespace-nowrap">
                <span className="font-display text-[20px] font-medium text-primary-deep">
                  {formatPriceSEK(discounted)}
                </span>{" "}
                <span className="font-sans text-small text-ink-soft line-through">
                  {formatPriceSEK(t.listUnitPrice)}
                </span>
                <p className="font-sans text-caption text-ink-soft">
                  per leverans
                </p>
              </div>
            </div>
          </div>

          <SubscriptionCheckout
            productId={productId}
            variantId={variantId}
            intervalDays={intervalDays}
          />

          <p className="mt-6 font-sans text-caption text-ink-mute leading-relaxed">
            Frågor om prenumerationer? Mejla{" "}
            <Link
              href="mailto:kontakt@biomax.nu"
              className="text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent"
            >
              kontakt@biomax.nu
            </Link>
            . Du hanterar prenumerationen under{" "}
            <Link
              href="/konto/prenumerationer"
              className="text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent"
            >
              Mina prenumerationer
            </Link>
            .
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
