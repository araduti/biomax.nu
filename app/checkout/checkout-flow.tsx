"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  useCart,
  selectCartCount,
  selectCartSubtotal,
} from "@/lib/cart-store";
import { Display, Eyebrow } from "@/components/ui/typography";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatPriceSEK } from "@/lib/format";
import { placeOrder } from "@/lib/checkout/order-actions";
import { ServicePointPicker } from "@/components/checkout/service-point-picker";
import type { ServicePoint } from "@/lib/postnord/types";

const FREE_SHIP = 499;
const SHIP_FEE = 49;

type SessionUser = {
  email: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
};

export function CheckoutFlow({
  klarnaConfigured,
  user,
}: {
  klarnaConfigured: boolean;
  user: SessionUser | null;
}) {
  const router = useRouter();
  const items = useCart((s) => s.items);
  const count = useCart(selectCartCount);
  const subtotal = useCart(selectCartSubtotal);
  const hydrated = useCart((s) => s.hydrated);
  const clear = useCart((s) => s.clear);

  const shipping = subtotal >= FREE_SHIP ? 0 : SHIP_FEE;
  const total = subtotal + shipping;

  const [email, setEmail] = useState(user?.email ?? "");
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [street, setStreet] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<"home" | "pickup">(
    "pickup"
  );
  const [servicePoint, setServicePoint] = useState<ServicePoint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Once hydrated, redirect away if cart is empty
  useEffect(() => {
    if (hydrated && items.length === 0) {
      router.replace("/varukorg");
    }
  }, [hydrated, items.length, router]);

  if (!hydrated) {
    return (
      <div className="max-w-[1240px] mx-auto px-6 md:px-8 py-12">
        <div className="h-[400px] animate-pulse bg-surface-warm rounded-xl" />
      </div>
    );
  }

  if (items.length === 0) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !firstName || !lastName || !street || !postalCode || !city) {
      setError("Fyll i alla obligatoriska fält.");
      return;
    }
    if (deliveryMethod === "pickup" && !servicePoint) {
      setError("Välj ett PostNord-ombud eller byt till hemleverans.");
      return;
    }
    if (!termsAccepted) {
      setError("Du måste godkänna köpvillkoren innan du slutför köpet.");
      return;
    }
    setPending(true);
    const result = await placeOrder({
      cart: items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
      })),
      customer: {
        email,
        firstName,
        lastName,
        phone: phone || undefined,
      },
      shipping: { street, postalCode, city },
      marketingConsent,
    });
    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }
    // Stash chosen delivery method + service-point in sessionStorage so the
    // confirmation page can show the pickup reminder without persisting it
    // to the Order (that lands in Phase B).
    try {
      sessionStorage.setItem(
        "biomax:lastDelivery",
        JSON.stringify({
          method: deliveryMethod,
          servicePoint:
            deliveryMethod === "pickup" && servicePoint
              ? {
                  name: servicePoint.name,
                  street: servicePoint.street,
                  postalCode: servicePoint.postalCode,
                  city: servicePoint.city,
                }
              : null,
        })
      );
    } catch {
      // sessionStorage can throw in private-mode Safari — non-fatal.
    }

    // Stub mode: order is already created and PAID. Clear cart, redirect.
    clear();
    router.push(`/checkout/bekraftelse?order=${result.orderNumber}`);
  }

  return (
    <div className="max-w-[1240px] mx-auto px-6 md:px-8 py-10 lg:py-14">
      <div className="mb-10">
        <Eyebrow>Kassan</Eyebrow>
        <Display as="h1" size="xl" className="mt-3">
          Slutför ditt köp
        </Display>
        <p className="mt-2 font-sans text-sm text-ink-mute">
          {count} {count === 1 ? "produkt" : "produkter"} ·{" "}
          {formatPriceSEK(total)}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-10 lg:gap-14">
        {/* Form column */}
        <form onSubmit={handleSubmit} method="post" action="#" noValidate>
          {/* Customer info */}
          <fieldset className="bg-surface-alt border border-border rounded-2xl p-6 md:p-8 mb-6">
            <legend className="px-2 -ml-2 font-sans text-[11px] uppercase tracking-[0.22em] font-semibold text-ink-mute">
              Dina uppgifter
            </legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Input
                label="Förnamn"
                name="firstName"
                autoComplete="given-name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <Input
                label="Efternamn"
                name="lastName"
                autoComplete="family-name"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
              <Input
                label="E-post"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="md:col-span-2"
              />
              <Input
                label="Telefon"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="md:col-span-2"
                hint="För leveransaviseringar."
              />
            </div>
          </fieldset>

          {/* Shipping */}
          <fieldset className="bg-surface-alt border border-border rounded-2xl p-6 md:p-8 mb-6">
            <legend className="px-2 -ml-2 font-sans text-[11px] uppercase tracking-[0.22em] font-semibold text-ink-mute">
              Leveransadress
            </legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <Input
                label="Gatuadress"
                name="street"
                autoComplete="street-address"
                required
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="md:col-span-3"
              />
              <Input
                label="Postnummer"
                name="postalCode"
                autoComplete="postal-code"
                required
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
              />
              <Input
                label="Stad"
                name="city"
                autoComplete="address-level2"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="md:col-span-2"
              />
            </div>
            <p className="mt-3 font-sans text-[12px] text-ink-soft">
              Vi levererar endast inom Sverige.
            </p>
          </fieldset>

          {/* Delivery method — PostNord */}
          <fieldset className="bg-surface-alt border border-border rounded-2xl p-6 md:p-8 mb-6">
            <legend className="px-2 -ml-2 font-sans text-[11px] uppercase tracking-[0.22em] font-semibold text-ink-mute">
              Leveranssätt
            </legend>
            <div className="space-y-3 mt-4">
              <label
                className={`flex items-start gap-3 cursor-pointer rounded-xl border p-4 transition-colors ${
                  deliveryMethod === "pickup"
                    ? "border-accent-deep bg-accent/5"
                    : "border-border bg-surface hover:border-border-soft"
                }`}
              >
                <input
                  type="radio"
                  name="delivery-method"
                  value="pickup"
                  checked={deliveryMethod === "pickup"}
                  onChange={() => setDeliveryMethod("pickup")}
                  className="mt-1 w-4 h-4"
                />
                <span>
                  <span className="block font-sans text-[14px] font-semibold text-primary-deep">
                    Hämta hos PostNord-ombud
                  </span>
                  <span className="block mt-0.5 font-sans text-[12.5px] text-ink-mute">
                    Du får ett sms när paketet finns att hämta. Hämtas inom 14 dagar.
                  </span>
                </span>
              </label>
              <label
                className={`flex items-start gap-3 cursor-pointer rounded-xl border p-4 transition-colors ${
                  deliveryMethod === "home"
                    ? "border-accent-deep bg-accent/5"
                    : "border-border bg-surface hover:border-border-soft"
                }`}
              >
                <input
                  type="radio"
                  name="delivery-method"
                  value="home"
                  checked={deliveryMethod === "home"}
                  onChange={() => {
                    setDeliveryMethod("home");
                    setServicePoint(null);
                  }}
                  className="mt-1 w-4 h-4"
                />
                <span>
                  <span className="block font-sans text-[14px] font-semibold text-primary-deep">
                    Hem till dörren
                  </span>
                  <span className="block mt-0.5 font-sans text-[12.5px] text-ink-mute">
                    PostNord MyPack Home — levereras till adressen ovan.
                  </span>
                </span>
              </label>
            </div>

            {deliveryMethod === "pickup" && (
              <div className="mt-6 pt-6 border-t border-border-soft">
                <p className="font-sans text-[12px] uppercase tracking-[0.18em] font-semibold text-ink-soft mb-3">
                  Välj ombud
                </p>
                <ServicePointPicker
                  defaultPostalCode={postalCode}
                  selectedId={servicePoint?.id ?? null}
                  onSelect={setServicePoint}
                />
              </div>
            )}
          </fieldset>

          {/* Payment */}
          <fieldset className="bg-surface-alt border border-border rounded-2xl p-6 md:p-8 mb-6">
            <legend className="px-2 -ml-2 font-sans text-[11px] uppercase tracking-[0.22em] font-semibold text-ink-mute">
              Betalning
            </legend>

            {klarnaConfigured ? (
              <div
                id="klarna-checkout-container"
                className="mt-4 min-h-[400px]"
              >
                {/* Klarna iframe injected here when KLARNA_USERNAME/PASSWORD are set */}
              </div>
            ) : (
              <div className="mt-4">
                <div
                  className="rounded-xl border-2 border-dashed border-accent bg-surface-warm p-6 mb-5"
                  role="status"
                >
                  <p className="font-sans text-[10px] uppercase tracking-[0.22em] font-bold text-primary mb-2">
                    Klarna sandbox — ej konfigurerad
                  </p>
                  <p className="font-sans text-[14px] text-ink-mute leading-relaxed">
                    Klarnas riktiga betalningsfönster visas här när
                    KLARNA_USERNAME och KLARNA_PASSWORD är satta i
                    <code className="font-mono text-[12px] mx-1 px-1.5 py-0.5 bg-surface-alt rounded">
                      .env.local
                    </code>
                    . Knappen nedan skapar en testorder i databasen så att
                    du kan klicka igenom flödet.
                  </p>
                </div>

                <label className="flex items-start gap-3 mb-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={marketingConsent}
                    onChange={(e) => setMarketingConsent(e.target.checked)}
                    className="mt-1 w-4 h-4"
                  />
                  <span className="font-sans text-[13px] text-ink-body leading-relaxed">
                    Jag vill få nyhetsbrev från Biomax — forskning, urval och
                    erbjudanden. Avregistrera när som helst.
                  </span>
                </label>

                <label className="flex items-start gap-3 mb-5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    required
                    aria-required="true"
                    className="mt-1 w-4 h-4"
                  />
                  <span className="font-sans text-[13px] text-ink-body leading-relaxed">
                    Jag har läst och godkänner{" "}
                    <Link
                      href="/villkor"
                      target="_blank"
                      className="text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent"
                    >
                      köp- och leveransvillkoren
                    </Link>{" "}
                    samt{" "}
                    <Link
                      href="/integritet"
                      target="_blank"
                      className="text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent"
                    >
                      integritetspolicyn
                    </Link>
                    .{" "}
                    <span className="text-ink-mute">(obligatoriskt)</span>
                  </span>
                </label>

                {error && (
                  <p
                    role="alert"
                    className="font-sans text-[13px] text-[#B5523B] bg-[#B5523B]/10 px-3 py-2 rounded-md mb-4"
                  >
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={pending || !termsAccepted}
                >
                  {pending
                    ? klarnaConfigured
                      ? "Bearbetar betalning…"
                      : "Skapar testorder…"
                    : klarnaConfigured
                      ? `Slutför köp · ${formatPriceSEK(total)}`
                      : `Slutför testorder · ${formatPriceSEK(total)}`}
                </Button>
              </div>
            )}
          </fieldset>
        </form>

        {/* Summary sidebar */}
        <aside className="bg-surface-alt border border-border rounded-2xl p-6 md:p-7 lg:sticky lg:top-8 h-fit">
          <Eyebrow className="mb-4">Din beställning</Eyebrow>
          <ul className="flex flex-col gap-4 mb-6">
            {items.map((i) => (
              <li key={i.productId} className="flex gap-3 items-center">
                <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-surface-warm flex-shrink-0">
                  <Image
                    src={i.imageUrl || "/products/_placeholder.svg"}
                    alt={i.name}
                    fill
                    sizes="56px"
                    className="object-cover mix-blend-darken"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-[15px] font-medium tracking-tight text-primary-deep leading-tight line-clamp-2">
                    {i.name}
                  </p>
                  <p className="font-sans text-[12px] text-ink-mute mt-0.5">
                    {i.quantity} × {formatPriceSEK(i.price)}
                  </p>
                </div>
                <span className="font-sans text-[14px] font-semibold text-ink-body whitespace-nowrap">
                  {formatPriceSEK(parseFloat(i.price) * i.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="space-y-2.5 font-sans text-[14px] pt-5 border-t border-border-soft">
            <div className="flex justify-between text-ink-body">
              <dt>Delsumma</dt>
              <dd className="font-semibold">{formatPriceSEK(subtotal)}</dd>
            </div>
            <div className="flex justify-between text-ink-mute">
              <dt>Frakt</dt>
              <dd>
                {shipping === 0 ? (
                  <span className="text-accent-deep font-semibold">Fri ✓</span>
                ) : (
                  formatPriceSEK(shipping)
                )}
              </dd>
            </div>
          </dl>

          <div className="mt-5 pt-5 border-t border-border flex items-baseline justify-between">
            <span className="font-display text-xl text-primary-deep">
              Att betala
            </span>
            <Display size="md" as="span">
              {formatPriceSEK(total)}
            </Display>
          </div>
          <p className="mt-1 font-sans text-[11px] text-ink-soft">
            Inkl. 6 % moms (kosttillskott)
          </p>
        </aside>
      </div>
    </div>
  );
}
