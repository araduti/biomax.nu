import type { Metadata } from "next";
import Link from "next/link";
import { Display, Eyebrow } from "@/components/ui/typography";
import { ButtonLink } from "@/components/ui/button";
import { formatPriceSEK } from "@/lib/format";
import { currentUser } from "@/lib/session";
import { getOrdersForUser, statusDisplay } from "@/lib/account/orders";

export const metadata: Metadata = {
  title: "Mitt konto",
  robots: { index: false, follow: false },
  alternates: { canonical: "/konto" },
};

const dateFmt = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export default async function AccountOverview() {
  const user = (await currentUser())!; // layout already guards
  const orders = await getOrdersForUser({
    userId: user.id,
    email: user.email,
  });
  const recent = orders.slice(0, 4);
  const lifetimeSpend = orders.reduce(
    (sum, o) => sum + parseFloat(o.totalAmount.toString()),
    0
  );

  return (
    <>
      <Eyebrow>Översikt</Eyebrow>
      <Display as="h1" size="xl" className="mt-3 mb-2">
        Hej, {(user as { firstName?: string | null }).firstName || user.name?.split(" ")[0] || "vän"}
      </Display>
      <p className="font-sans text-base text-ink-mute leading-relaxed max-w-[640px]">
        Härifrån ser du dina ordrar, hanterar dina uppgifter och håller koll på
        dina favoriter.
      </p>

      {/* Quick stats */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-4">
        <Stat
          label="Antal ordrar"
          value={orders.length.toString()}
        />
        <Stat
          label="Totalt hos Biomax"
          value={formatPriceSEK(lifetimeSpend)}
        />
        <Stat
          label="E-post"
          value={user.email}
          smallValue
        />
      </div>

      {/* Recent orders */}
      <section className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-5">
          <h2 className="font-display text-2xl font-medium tracking-tight text-primary-deep">
            Senaste ordrar
          </h2>
          {orders.length > 4 && (
            <Link
              href="/konto/ordrar"
              className="font-sans text-[13px] font-semibold text-primary border-b border-primary/40 pb-0.5 hover:border-primary"
            >
              Visa alla ({orders.length}) →
            </Link>
          )}
        </div>

        {orders.length === 0 ? (
          <div className="bg-surface-alt border border-border rounded-2xl p-8 text-center">
            <p className="font-display italic text-xl text-primary-deep mb-3">
              Inga ordrar ännu
            </p>
            <p className="font-sans text-[14px] text-ink-mute mb-6 max-w-[420px] mx-auto leading-relaxed">
              När du gör din första beställning hos Biomax dyker den upp här.
            </p>
            <ButtonLink href="/produkter" variant="primary" size="md">
              Utforska produkter
            </ButtonLink>
          </div>
        ) : (
          <ul className="bg-surface-alt border border-border rounded-2xl overflow-hidden">
            {recent.map((o, i) => {
              const status = statusDisplay(o.status);
              return (
                <li
                  key={o.id}
                  className={i > 0 ? "border-t border-border-soft" : ""}
                >
                  <Link
                    href={`/konto/ordrar/${o.orderNumber}`}
                    className="flex flex-wrap items-center justify-between gap-4 px-5 md:px-6 py-4 hover:bg-surface-warm transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-[15px] font-medium tracking-tight text-primary-deep">
                        {o.orderNumber}
                      </p>
                      <p className="font-sans text-[12px] text-ink-mute mt-0.5">
                        {dateFmt.format(o.createdAt)} · {o._count.items}{" "}
                        {o._count.items === 1 ? "produkt" : "produkter"}
                        {o.legacySource ? " · arkiverad" : ""}
                      </p>
                    </div>
                    <span
                      className={`font-sans text-[12px] font-semibold uppercase tracking-[0.18em] ${status.tone}`}
                    >
                      {status.label}
                    </span>
                    <span className="font-display text-[16px] font-medium text-primary-deep tracking-tight whitespace-nowrap min-w-[80px] text-right">
                      {formatPriceSEK(o.totalAmount.toString())}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Welcome-back note for legacy customers */}
      {orders.some((o) => o.legacySource) && (
        <section className="mt-10 bg-surface-warm border border-border rounded-2xl p-6">
          <Eyebrow className="text-accent-deep">Välkommen tillbaka</Eyebrow>
          <p className="mt-3 font-sans text-[14px] text-ink-body leading-relaxed max-w-[600px]">
            Vi ser att du har handlat hos oss tidigare — ditt orderhistorik
            från gamla biomax.nu finns kvar och visas ovan. Tack för att du
            stannar med oss.
          </p>
        </section>
      )}
    </>
  );
}

function Stat({
  label,
  value,
  smallValue = false,
}: {
  label: string;
  value: string;
  smallValue?: boolean;
}) {
  return (
    <div className="bg-surface-alt border border-border rounded-xl p-4">
      <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-ink-mute font-semibold">
        {label}
      </p>
      <p
        className={
          smallValue
            ? "mt-1.5 font-sans text-[14px] text-primary-deep break-all"
            : "mt-1.5 font-display text-2xl font-medium tracking-tight text-primary-deep"
        }
      >
        {value}
      </p>
    </div>
  );
}
