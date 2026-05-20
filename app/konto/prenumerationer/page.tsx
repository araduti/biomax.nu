import Link from "next/link";
import { hostTenantScope } from "@/lib/tenant/db";
import { currentUser } from "@/lib/session";
import { Display, Eyebrow } from "@/components/ui/typography";
import { formatPriceSEK } from "@/lib/format";
import { intervalLabelSwedish } from "@/lib/subscriptions/constants";
import { SubscriptionRow } from "@/components/account/subscription-row";

export const metadata = { title: "Prenumerationer" };

export default async function SubscriptionsPage() {
  // Auth: layout already redirects unauthenticated users; this is a guard.
  const user = await currentUser();
  if (!user) return null;

  const subs = await hostTenantScope((tx) =>
    tx.subscription.findMany({
      where: { userId: user.id },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        shippingAddress: { select: { fullName: true, street: true, city: true } },
        lines: {
          include: {
            product: {
              select: { slug: true, name: true, imageUrl: true, variants: { select: { id: true, label: true, price: true } } },
            },
          },
        },
      },
    })
  );

  return (
    <>
      <Eyebrow>Mina prenumerationer</Eyebrow>
      <Display as="h1" size="lg" className="mt-2">
        Mina prenumerationer
      </Display>
      <p className="mt-3 font-sans text-body text-ink-mute max-w-[620px] leading-relaxed">
        Få dina favoriter automatiskt — du sparar 10 % på varje leverans och
        kan pausa eller avsluta när du vill, utan kostnad.
      </p>

      {subs.length === 0 ? (
        <div className="mt-10 p-8 rounded-2xl border border-border bg-surface-warm/60 text-center">
          <p className="font-display text-xl text-primary-deep">
            Du har inga prenumerationer än
          </p>
          <p className="mt-2 font-sans text-body text-ink-mute max-w-[440px] mx-auto leading-relaxed">
            Slå på &quot;Prenumerera&quot; på en produktsida för att lägga upp en
            återkommande leverans.
          </p>
          <Link
            href="/produkter"
            className="mt-5 inline-flex items-center px-5 py-2.5 rounded-md bg-primary-deep text-surface font-sans text-small font-semibold hover:bg-primary-deep/90 transition-colors"
          >
            Utforska produkter
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-5">
          {subs.map((s) => {
            const linesForUi = s.lines.map((l) => {
              const variant = l.variantId
                ? l.product.variants.find((v) => v.id === l.variantId) ?? null
                : null;
              return {
                id: l.id,
                productSlug: l.product.slug,
                productName: l.product.name,
                productImageUrl: l.product.imageUrl,
                variantLabel: variant?.label ?? null,
                quantity: l.quantity,
                unitPriceAtCreate: parseFloat(l.unitPriceAtCreate.toString()),
              };
            });
            return (
              <SubscriptionRow
                key={s.id}
                subscription={{
                  id: s.id,
                  status: s.status,
                  intervalDays: s.intervalDays,
                  discountPercent: s.discountPercent,
                  nextOrderAt: s.nextOrderAt.toISOString(),
                  intervalLabel: intervalLabelSwedish(s.intervalDays),
                  lines: linesForUi,
                  shippingAddressLine: s.shippingAddress
                    ? `${s.shippingAddress.fullName} · ${s.shippingAddress.street}, ${s.shippingAddress.city}`
                    : null,
                }}
              />
            );
          })}
        </ul>
      )}

      {subs.length > 0 && (
        <p className="mt-8 font-sans text-caption text-ink-soft leading-relaxed max-w-[520px]">
          Prenumerationer förnyas automatiskt enligt valt intervall. Vi
          mejlar inför varje leverans så du kan ändra eller pausa innan den
          packas. Priser räknas om från aktuella produktpriser vid varje
          förnyelse.
        </p>
      )}
    </>
  );
}
