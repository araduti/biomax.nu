import type { Metadata } from "next";
import Link from "next/link";
import { Display, Eyebrow } from "@/components/ui/typography";
import { ButtonLink } from "@/components/ui/button";
import { formatPriceSEK } from "@/lib/format";
import { currentUser } from "@/lib/session";
import { getOrdersForUser, statusDisplay } from "@/lib/account/orders";

export const metadata: Metadata = {
  title: "Mina ordrar",
  robots: { index: false, follow: false },
  alternates: { canonical: "/konto/ordrar" },
};

const dateFmt = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export default async function OrdersListPage() {
  const user = (await currentUser())!;
  const orders = await getOrdersForUser({
    userId: user.id,
    email: user.email,
  });

  return (
    <>
      <Eyebrow>Mina ordrar</Eyebrow>
      <Display as="h1" size="xl" className="mt-3 mb-3">
        {orders.length}{" "}
        {orders.length === 1 ? "beställning" : "beställningar"}
      </Display>
      <p className="font-sans text-base text-ink-mute leading-relaxed max-w-[640px] mb-8">
        Hela din orderhistorik hos Biomax — både från det nya systemet och från
        det tidigare.
      </p>

      {orders.length === 0 ? (
        <div className="bg-surface-alt border border-border rounded-2xl p-10 text-center">
          <p className="font-display italic text-2xl text-primary-deep mb-3">
            Inga ordrar
          </p>
          <p className="font-sans text-body text-ink-mute mb-6 max-w-[420px] mx-auto leading-relaxed">
            När du gör din första beställning hos Biomax dyker den upp här.
          </p>
          <ButtonLink href="/produkter" variant="primary" size="md">
            Utforska produkter
          </ButtonLink>
        </div>
      ) : (
        <ul className="bg-surface-alt border border-border rounded-2xl overflow-hidden">
          {orders.map((o, i) => {
            const status = statusDisplay(o.status);
            return (
              <li
                key={o.id}
                className={i > 0 ? "border-t border-border-soft" : ""}
              >
                <Link
                  href={`/konto/ordrar/${o.orderNumber}`}
                  className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-5 md:px-6 py-4 hover:bg-surface-warm transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-display text-body-lg font-medium tracking-tight text-primary-deep">
                      {o.orderNumber}
                    </p>
                    <p className="font-sans text-caption text-ink-mute mt-0.5">
                      {dateFmt.format(o.createdAt)} · {o._count.items}{" "}
                      {o._count.items === 1 ? "produkt" : "produkter"}
                      {o.legacySource ? " · arkiverad" : ""}
                    </p>
                  </div>
                  <span
                    className={`hidden md:inline font-sans text-micro font-semibold uppercase tracking-[0.18em] ${status.tone}`}
                  >
                    {status.label}
                  </span>
                  <span className="font-display text-lead font-medium text-primary-deep tracking-tight whitespace-nowrap text-right md:text-left min-w-[90px]">
                    {formatPriceSEK(o.totalAmount.toString())}
                  </span>
                  <span aria-hidden className="hidden md:inline text-primary">
                    →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
