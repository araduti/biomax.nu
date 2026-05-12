"use client";

import Link from "next/link";
import { useCart, selectCartCount, selectCartSubtotal } from "@/lib/cart-store";
import { Display, Eyebrow } from "@/components/ui/typography";
import { ButtonLink } from "@/components/ui/button";
import { formatPriceSEK } from "@/lib/format";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { CartLine } from "./cart-line";

const FREE_SHIPPING_THRESHOLD = 499;

const crumbs = [
  { label: "Hem", href: "/" },
  { label: "Varukorg", href: "/varukorg" },
];

export function CartPageContents() {
  const items = useCart((s) => s.items);
  const count = useCart(selectCartCount);
  const subtotal = useCart(selectCartSubtotal);
  const hydrated = useCart((s) => s.hydrated);
  const remainingForFreeShip = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  if (!hydrated) {
    return (
      <div className="max-w-[1240px] mx-auto px-6 md:px-8 pt-8 pb-16">
        <Breadcrumb crumbs={crumbs} />
        <div className="mt-8 h-[400px] animate-pulse bg-surface-warm rounded-xl" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-[1240px] mx-auto px-6 md:px-8 pt-8 pb-24">
        <Breadcrumb crumbs={crumbs} />
        <div className="mt-12 text-center max-w-[480px] mx-auto py-16">
          <Eyebrow>Varukorg</Eyebrow>
          <Display as="h1" size="xl" className="mt-3 mb-4">
            Tom varukorg
          </Display>
          <p className="font-sans text-base text-ink-mute leading-relaxed mb-8">
            Lägg till en produkt så ser du den här. Snabb leverans och
            Klarna-betalning vid kassan.
          </p>
          <ButtonLink href="/produkter" variant="primary" size="lg">
            Utforska produkter
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1240px] mx-auto px-6 md:px-8 pt-8 pb-24">
      <Breadcrumb crumbs={crumbs} />
      <div className="mt-8 mb-12">
        <Eyebrow>Varukorg</Eyebrow>
        <Display as="h1" size="xl" className="mt-3">
          Din varukorg
        </Display>
        <p className="mt-2 font-sans text-base text-ink-mute">
          {count} {count === 1 ? "produkt" : "produkter"}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-12 items-start">
        {/* Lines */}
        <ul className="bg-surface-alt border border-border rounded-2xl px-6 md:px-8">
          {items.map((item) => (
            <CartLine key={item.productId} item={item} variant="page" />
          ))}
        </ul>

        {/* Summary sidebar */}
        <aside className="bg-surface-alt border border-border rounded-2xl p-6 md:p-7 lg:sticky lg:top-8">
          <Eyebrow className="mb-4">Sammanfattning</Eyebrow>
          <dl className="space-y-3 font-sans text-[14px]">
            <div className="flex justify-between text-ink-body">
              <dt>Delsumma</dt>
              <dd className="font-semibold">{formatPriceSEK(subtotal)}</dd>
            </div>
            <div className="flex justify-between text-ink-mute">
              <dt>Frakt</dt>
              <dd>
                {subtotal >= FREE_SHIPPING_THRESHOLD ? (
                  <span className="text-accent-deep font-semibold">Fri ✓</span>
                ) : (
                  "Beräknas i kassan"
                )}
              </dd>
            </div>
          </dl>

          {remainingForFreeShip > 0 && subtotal > 0 && (
            <div className="mt-5 p-3 rounded-lg bg-surface-warm">
              <p className="font-sans text-[12px] text-ink-body leading-relaxed">
                <strong className="font-semibold">
                  {formatPriceSEK(remainingForFreeShip)}
                </strong>{" "}
                kvar till fri frakt över {formatPriceSEK(FREE_SHIPPING_THRESHOLD)}
              </p>
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-border flex items-baseline justify-between">
            <span className="font-display text-xl text-primary-deep">
              Att betala
            </span>
            <Display size="md" as="span">
              {formatPriceSEK(subtotal)}
            </Display>
          </div>
          <p className="mt-1 font-sans text-[11px] text-ink-soft">
            Inkl. moms · Klarna · Faktura 30 dagar
          </p>

          <ButtonLink
            href="/checkout"
            variant="primary"
            size="lg"
            className="w-full mt-6"
          >
            Gå till kassan
          </ButtonLink>
          <Link
            href="/produkter"
            className="block text-center mt-3 font-sans text-[13px] text-primary hover:text-primary-deep transition-colors"
          >
            Fortsätt handla
          </Link>
        </aside>
      </div>
    </div>
  );
}
