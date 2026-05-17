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
import { upsertCartSnapshot } from "@/lib/cart-snapshot/actions";
import { ServicePointPicker } from "@/components/checkout/service-point-picker";
import { KustomCheckout } from "@/components/checkout/kustom-checkout";
import { LoyaltyRedeem } from "@/components/checkout/loyalty-redeem";
import { MemberGreeting } from "@/components/checkout/member-greeting";
import type { TrustpilotSummary } from "@/lib/integrations/trustpilot";
import { pointsToKr, pointsFromKr } from "@/lib/loyalty/constants";
import { CURRENT_VAT_BP } from "@/lib/checkout/vat";
import type { ServicePoint } from "@/lib/postnord/types";
import { useShippingConfig } from "@/lib/site/shipping-config-context";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  trustpilot = null,
  recommendations = [],
}: {
  klarnaConfigured: boolean;
  user: SessionUser | null;
  trustpilot?: TrustpilotSummary | null;
  recommendations?: {
    slug: string;
    name: string;
    sub: string;
    imageUrl: string;
    priceKr: number;
  }[];
}) {
  const router = useRouter();
  const items = useCart((s) => s.items);
  const count = useCart(selectCartCount);
  const subtotal = useCart(selectCartSubtotal);
  const hydrated = useCart((s) => s.hydrated);
  const clear = useCart((s) => s.clear);
  const setQuantity = useCart((s) => s.setQuantity);
  const { flatSek, freeThresholdSek } = useShippingConfig();

  const qualifiesForFree =
    freeThresholdSek !== null && subtotal >= freeThresholdSek;
  const shipping = qualifiesForFree ? 0 : flatSek;
  // Loyalty redemption — client state; server re-validates in placeOrder.
  // We deliberately scope the cap based on `subtotal` (not total) so the
  // discount can't make the order line items go negative; shipping/tax
  // stay payable.
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  // Authoritative total read back from the Kustom iframe (incl. the
  // shipping the customer picked in-iframe). null until first read.
  // Customer-selected shipping (kr) read back from the Kustom iframe.
  // null until they pick delivery. Totalt is computed client-side from
  // subtotal − rabatt + this, so it updates instantly on qty/points.
  const [kustomShippingKr, setKustomShippingKr] = useState<
    number | null
  >(null);
  const loyaltyDiscount = loyaltyPoints > 0 ? pointsToKr(loyaltyPoints) : 0;
  const total = subtotal - loyaltyDiscount + shipping;
  // Moms breakdown for the summary — same formula as server-side in
  // lib/checkout/order-actions.ts: VAT = gross × rate / (10000 + rate).
  // Display-only; the gross prices already include moms (Swedish PIL
  // convention). Standard Swedish e-comm pattern is "Varav moms".
  const vatRatePct = (CURRENT_VAT_BP / 100).toString().replace(".", ",");
  const vatAmount =
    Math.round(((total * CURRENT_VAT_BP) / (10000 + CURRENT_VAT_BP)) * 100) /
    100;

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
        variantId: i.variantId,
        bundleId: i.bundleId,
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
      loyaltyPointsToRedeem: loyaltyPoints > 0 ? loyaltyPoints : undefined,
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
      {/* Breadcrumb (prototype parity) */}
      <nav
        aria-label="Brödsmulor"
        className="mb-6 font-sans text-[13px] text-ink-mute"
      >
        <Link href="/varukorg" className="hover:text-ink-body">
          Varukorg
        </Link>
        <span className="mx-2 text-ink-soft">·</span>
        <span className="text-ink-body">Kassan</span>
        <span className="mx-2 text-ink-soft">·</span>
        <span>Bekräftelse</span>
      </nav>

      <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <Eyebrow>Kassan</Eyebrow>
          <Display as="h1" size="xl" className="mt-3">
            Slutför ditt köp
          </Display>
        </div>
        <p className="font-sans text-[13px] text-ink-mute flex items-center gap-1.5 pb-1">
          <svg
            aria-hidden
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            className="text-accent-deep"
          >
            <rect
              x="5"
              y="11"
              width="14"
              height="9"
              rx="2"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M8 11V8a4 4 0 0 1 8 0v3"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
          Säker betalning via Kustom
        </p>
      </div>

      {klarnaConfigured && <MemberGreeting firstName={user?.firstName} />}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-10 lg:gap-14 items-start">
        {/* Form column. Kustom (real) mode: the iframe collects
            identity, address, delivery and payment itself — we render
            only the iframe. Stub mode keeps the full local form. */}
        {klarnaConfigured ? (
          <div className="min-w-0">
            <fieldset className="bg-surface-alt border border-border rounded-2xl p-6 md:p-8">
              <legend className="px-2 -ml-2 font-sans text-[11px] uppercase tracking-[0.22em] font-semibold text-ink-mute">
                Kassa
              </legend>
              <p className="mt-3 font-sans text-[13px] text-ink-mute leading-relaxed">
                Fyll i dina uppgifter, välj leveranssätt och betala i
                kassan nedan.
              </p>

              {/* Express-pay strip (prototype parity). Real Kustom
                  Elements when configured (env key); otherwise the
                  mock-styled buttons render DISABLED with a "snart"
                  note — Express is tabled (ADR 0021) until Kustom
                  provisions EXPRESS_CHECKOUT. */}
              <div className="mt-6">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <div>
                    <Eyebrow className="text-accent-deep">
                      Snabb-betala
                    </Eyebrow>
                    <p className="mt-1.5 font-display text-[20px] font-medium tracking-tight text-primary-deep">
                      Hoppa över formuläret
                    </p>
                  </div>
                  <p className="font-sans text-[12px] text-ink-mute text-right leading-snug">
                    90% slutför snabbare
                    <br />
                    med förifyllda uppgifter
                  </p>
                </div>

                {process.env.NEXT_PUBLIC_KUSTOM_ELEMENTS_KEY ? (
                  <div className="mt-4">
                    <kustom-express-buttons locale="sv-SE" />
                  </div>
                ) : (
                  <>
                    <div className="mt-4 grid grid-cols-3 gap-2.5">
                      <button
                        type="button"
                        disabled
                        className="h-12 rounded-lg bg-ink text-surface font-sans text-[15px] font-semibold inline-flex items-center justify-center opacity-60 cursor-not-allowed"
                      >
                        Apple&nbsp;Pay
                      </button>
                      <button
                        type="button"
                        disabled
                        className="h-12 rounded-lg bg-surface-alt border border-border text-ink-body font-sans text-[15px] font-semibold inline-flex items-center justify-center gap-1.5 opacity-60 cursor-not-allowed"
                      >
                        <span aria-hidden className="font-bold">
                          G
                        </span>{" "}
                        Pay
                      </button>
                      <button
                        type="button"
                        disabled
                        className="h-12 rounded-lg font-sans text-[14px] font-semibold text-ink opacity-60 cursor-not-allowed"
                        style={{ background: "#FFA8CD" }}
                      >
                        Klarna Express
                      </button>
                    </div>
                    <p className="mt-2 font-sans text-[11px] text-ink-soft">
                      Snabb-betala aktiveras snart.
                    </p>
                  </>
                )}

                <div className="mt-5 flex items-center gap-3 text-ink-mute">
                  <span className="flex-1 h-px bg-border" />
                  <span className="font-sans text-[12px]">
                    eller fyll i nedan
                  </span>
                  <span className="flex-1 h-px bg-border" />
                </div>
              </div>

              <KustomCheckout
                cart={items.map((i) => ({
                  productId: i.productId,
                  variantId: i.variantId,
                  quantity: i.quantity,
                }))}
                loyaltyPoints={loyaltyPoints}
                onShipping={setKustomShippingKr}
              />
            </fieldset>
          </div>
        ) : (
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
                onBlur={() => {
                  // Capture cart snapshot for abandoned-cart flow once we
                  // have a valid email + at least one item. Best-effort —
                  // failure is logged server-side, no UI surface.
                  if (
                    EMAIL_RE.test(email) &&
                    items.length > 0 &&
                    typeof window !== "undefined"
                  ) {
                    void upsertCartSnapshot({
                      email,
                      items: items.map((i) => ({
                        productId: i.productId,
                        variantId: i.variantId,
                        quantity: i.quantity,
                      })),
                    });
                  }
                }}
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

            {(
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
                    className="font-sans text-[13px] text-status-error bg-status-error/10 px-3 py-2 rounded-md mb-4"
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

                {/* Trust strip — research note: Swedish ecom converts
                    measurably better with these signals visible right at
                    the submit point. We never list a badge we can't back
                    up; "Trygg E-handel" lands here once the application
                    is approved. */}
                <ul className="mt-5 grid grid-cols-2 gap-3 font-sans text-[12px] text-ink-mute leading-snug">
                  <li className="flex gap-2">
                    <span aria-hidden className="text-accent-deep mt-0.5">✓</span>
                    <span>Familjeägt sedan 2001, Kållered</span>
                  </li>
                  <li className="flex gap-2">
                    <span aria-hidden className="text-accent-deep mt-0.5">✓</span>
                    <span>Snabb leverans i Sverige med PostNord</span>
                  </li>
                  <li className="flex gap-2">
                    <span aria-hidden className="text-accent-deep mt-0.5">✓</span>
                    <span>Säker betalning med Klarna</span>
                  </li>
                  <li className="flex gap-2">
                    <span aria-hidden className="text-accent-deep mt-0.5">✓</span>
                    <span>14 dagars öppet köp, fri retur</span>
                  </li>
                </ul>
              </div>
            )}
          </fieldset>
        </form>
        )}

        {/* Right column — cart panel + trust strip (mockup parity) */}
        <div className="min-w-0 flex flex-col gap-5">
        {/* Cart panel scrolls with the page (carries the totals). */}
        <aside className="bg-surface-alt border border-border rounded-2xl p-6 md:p-7">
          <div className="flex items-baseline justify-between mb-5">
            <div>
              <Eyebrow>Din beställning</Eyebrow>
              <p className="mt-1.5 font-display text-[22px] font-medium tracking-tight text-primary-deep">
                {count} {count === 1 ? "produkt" : "produkter"}
              </p>
            </div>
            <Link
              href="/varukorg"
              className="font-sans text-[12px] text-ink-mute underline decoration-ink-mute/40 underline-offset-[3px] hover:text-ink-body"
            >
              Redigera kundvagn
            </Link>
          </div>
          <ul className="flex flex-col gap-4 mb-6">
            {items.map((i) => (
              <li key={i.productId} className="flex gap-3 items-start">
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
                    {formatPriceSEK(i.price)} / st
                  </p>
                  <div className="mt-1.5 inline-flex items-center rounded-full border border-border">
                    <button
                      type="button"
                      aria-label={`Minska antal ${i.name}`}
                      disabled={i.quantity <= 1}
                      onClick={() =>
                        setQuantity(
                          i.productId,
                          i.variantId ?? null,
                          i.quantity - 1,
                          i.bundleId ?? null
                        )
                      }
                      className="w-7 h-7 grid place-items-center text-ink-body text-[15px] disabled:opacity-30 disabled:cursor-not-allowed hover:text-primary-deep"
                    >
                      −
                    </button>
                    <span className="px-2 font-sans text-[13px] font-medium tabular-nums min-w-[1.5rem] text-center">
                      {i.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label={`Öka antal ${i.name}`}
                      disabled={i.quantity >= 99}
                      onClick={() =>
                        setQuantity(
                          i.productId,
                          i.variantId ?? null,
                          i.quantity + 1,
                          i.bundleId ?? null
                        )
                      }
                      className="w-7 h-7 grid place-items-center text-ink-body text-[15px] disabled:opacity-30 disabled:cursor-not-allowed hover:text-primary-deep"
                    >
                      +
                    </button>
                  </div>
                </div>
                <span className="font-sans text-[14px] font-semibold text-ink-body whitespace-nowrap self-start">
                  {formatPriceSEK(parseFloat(i.price) * i.quantity)}
                </span>
              </li>
            ))}
          </ul>

          {/* Points slot — inside the cart panel between line items
              and totals (prototype parity). Kustom mode only; stub
              mode renders its own LoyaltyRedeem below. */}
          {user && klarnaConfigured && (
            <div
              id="loyalty-redeem"
              className="mb-5 pt-5 border-t border-border-soft scroll-mt-8"
            >
              <LoyaltyRedeem
                subtotalKr={subtotal}
                value={loyaltyPoints}
                onChange={setLoyaltyPoints}
              />
              <p className="mt-2 font-sans text-[12px] text-ink-soft">
                Rabatten uppdateras automatiskt i kassan en liten stund
                efter att du ändrat poängen.
              </p>
            </div>
          )}

          {klarnaConfigured ? (
            /* Value panel — Kustom owns the authoritative summary and
               total in its iframe (show_subtotal_detail). The sidebar
               doesn't duplicate it; it reassures and nudges. */
            <>
              {/* Totals. Delsumma + Poängrabatt + Totalt are computed
                  client-side (instant on qty/points). Frakt is the
                  customer-selected shipping read back from the iframe
                  (changes only when they pick delivery). Until they
                  pick, total shows "räknas i kassan". */}
              {(() => {
                const known = kustomShippingKr != null;
                const shippingKr = kustomShippingKr;
                const totalKr = known
                  ? subtotal - loyaltyDiscount + (kustomShippingKr ?? 0)
                  : null;
                return (
                  <>
                    <div className="pt-5 border-t border-border-soft font-sans text-[14px] text-ink-body">
                      <div className="flex justify-between py-1">
                        <span>Delsumma</span>
                        <span className="tabular-nums">
                          {formatPriceSEK(subtotal)}
                        </span>
                      </div>
                      {known && (
                        <div className="flex justify-between py-1 text-ink-mute">
                          <span>Frakt</span>
                          <span className="tabular-nums">
                            {shippingKr === 0 ? (
                              <span className="text-accent-deep font-semibold">
                                Fri
                              </span>
                            ) : (
                              formatPriceSEK(shippingKr as number)
                            )}
                          </span>
                        </div>
                      )}
                      {loyaltyPoints > 0 && (
                        <div className="flex justify-between py-1 text-accent-deep font-semibold">
                          <span>
                            Poängrabatt (
                            {loyaltyPoints.toLocaleString("sv-SE")} p)
                          </span>
                          <span className="tabular-nums">
                            −{formatPriceSEK(pointsToKr(loyaltyPoints))}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-border flex items-baseline justify-between">
                      <span className="font-display text-[20px] font-medium text-primary-deep">
                        Totalt
                      </span>
                      {known ? (
                        <span className="font-display text-[26px] font-medium tracking-tight tabular-nums text-primary-deep">
                          {formatPriceSEK(totalKr as number)}
                        </span>
                      ) : (
                        <span className="font-display text-[16px] text-ink-mute">
                          räknas i kassan
                        </span>
                      )}
                    </div>
                    <p className="mt-1 font-sans text-[11px] text-ink-soft text-right">
                      {known
                        ? "Inkl. frakt & moms · säker betalning via Kustom"
                        : "Frakt och slutsumma visas i kassan · säker betalning via Kustom"}
                    </p>
                  </>
                );
              })()}


              {/* Earn-back hint — cream pill (mockup parity) */}
              <div className="mt-5 flex items-center gap-2.5 rounded-xl bg-surface-warm border border-accent/20 px-4 py-3">
                <span aria-hidden className="text-accent-deep text-[15px]">
                  ✦
                </span>
                <span className="font-sans text-[12.5px] text-ink-body leading-snug">
                  Du samlar ca{" "}
                  <strong className="text-primary-deep tabular-nums">
                    {pointsFromKr(
                      Math.max(0, subtotal - pointsToKr(loyaltyPoints))
                    ).toLocaleString("sv-SE")}
                  </strong>{" "}
                  poäng i Familjen Biomax på det här köpet.
                </span>
              </div>
            </>
          ) : (
            <>
              <LoyaltyRedeem
                subtotalKr={subtotal}
                value={loyaltyPoints}
                onChange={setLoyaltyPoints}
              />

              <dl className="space-y-2.5 font-sans text-[14px] pt-5 border-t border-border-soft">
                <div className="flex justify-between text-ink-body">
                  <dt>Delsumma</dt>
                  <dd className="font-semibold">
                    {formatPriceSEK(subtotal)}
                  </dd>
                </div>
                {loyaltyDiscount > 0 && (
                  <div className="flex justify-between text-accent-deep font-semibold">
                    <dt>
                      Familjen Biomax ·{" "}
                      {loyaltyPoints.toLocaleString("sv-SE")} p
                    </dt>
                    <dd>−{formatPriceSEK(loyaltyDiscount)}</dd>
                  </div>
                )}
                <div className="flex justify-between text-ink-mute">
                  <dt>Frakt</dt>
                  <dd>
                    {shipping === 0 ? (
                      <span className="text-accent-deep font-semibold">
                        Fri ✓
                      </span>
                    ) : (
                      formatPriceSEK(shipping)
                    )}
                  </dd>
                </div>
                <div className="flex justify-between text-ink-mute">
                  <dt>Varav moms ({vatRatePct} %)</dt>
                  <dd className="tabular-nums">
                    {formatPriceSEK(vatAmount)}
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
                Priser inkl. moms · faktura skickas efter köp
              </p>
            </>
          )}
        </aside>

        {/* Reassurance group — pins once the cart panel (with the
            totals) has scrolled past, so the iframe's totals and ours
            are never on screen together. */}
        <div className="lg:sticky lg:top-8 flex flex-col gap-5">
        {klarnaConfigured && (
          <div className="bg-surface-alt border border-border rounded-2xl p-5 md:p-6">
            <ul className="grid grid-cols-2 gap-x-5 gap-y-4">
              {[
                {
                  t: "Snabb leverans",
                  s: "1–3 vardagar med PostNord",
                },
                {
                  t: "14 dagars öppet köp",
                  s: "Fri retur via PostNord",
                },
                {
                  t: "Svanenmärkt frakt",
                  s: "Klimatneutralt val",
                },
                trustpilot
                  ? {
                      t: `${trustpilot.rating
                        .toFixed(1)
                        .replace(".", ",")} av 5 på Trustpilot`,
                      s: `${trustpilot.count.toLocaleString("sv-SE")} omdömen`,
                    }
                  : {
                      t: "Familjeägt sedan 2001",
                      s: "Hälsofackhandel i Kållered",
                    },
              ].map((it) => (
                <li key={it.t} className="flex gap-2.5 items-start">
                  <span
                    aria-hidden
                    className="mt-0.5 w-7 h-7 rounded-full bg-surface-warm text-accent-deep grid place-items-center flex-shrink-0 text-[13px] font-semibold"
                  >
                    ✓
                  </span>
                  <div>
                    <p className="font-sans text-[13px] font-medium text-primary-deep leading-tight">
                      {it.t}
                    </p>
                    <p className="font-sans text-[11.5px] text-ink-mute mt-0.5 leading-snug">
                      {it.s}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {klarnaConfigured &&
          trustpilot &&
          trustpilot.reviews.length > 0 && (
            <div className="bg-surface-alt border border-border rounded-2xl p-5 md:p-6">
              <Eyebrow className="text-accent-deep">
                Vad kunderna säger
              </Eyebrow>
              <p className="mt-1.5 mb-4 font-display text-[18px] font-medium tracking-tight text-primary-deep">
                {trustpilot.rating.toFixed(1).replace(".", ",")} av 5 på
                Trustpilot
              </p>
              <ul className="flex flex-col gap-4">
                {trustpilot.reviews.map((r) => (
                  <li
                    key={r.id}
                    className="border-t border-border-soft pt-3 first:border-0 first:pt-0"
                  >
                    <div
                      aria-hidden
                      className="text-accent-deep text-[12px] tracking-[0.15em]"
                    >
                      {"★".repeat(Math.round(r.stars))}
                    </div>
                    <p className="mt-1 font-sans text-[13px] font-semibold text-primary-deep leading-snug">
                      {r.title}
                    </p>
                    <p className="mt-1 font-sans text-[12.5px] text-ink-mute leading-relaxed line-clamp-3">
                      {r.text}
                    </p>
                    <p className="mt-1.5 font-sans text-[11.5px] text-ink-soft">
                      {r.name}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {klarnaConfigured && recommendations.length > 0 && (
            <div className="bg-surface-alt border border-border rounded-2xl p-5 md:p-6">
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <Eyebrow className="text-accent-deep">Lägg till</Eyebrow>
                  <p className="mt-1.5 font-display text-[17px] font-medium tracking-tight text-primary-deep">
                    Andra köper också
                  </p>
                </div>
                <Link
                  href="/produkter"
                  className="font-sans text-[12px] text-ink-mute hover:text-ink-body"
                >
                  Visa alla
                </Link>
              </div>
              <ul className="flex flex-col gap-3">
                {recommendations.map((p) => (
                  <li
                    key={p.slug}
                    className="flex gap-3 items-center border-t border-border-soft pt-3 first:border-0 first:pt-0"
                  >
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-surface-warm flex-shrink-0">
                      <Image
                        src={p.imageUrl || "/products/_placeholder.svg"}
                        alt={p.name}
                        fill
                        sizes="48px"
                        className="object-cover mix-blend-darken"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-sans text-[13px] font-medium text-primary-deep leading-tight truncate">
                        {p.name}
                      </p>
                      <p className="font-sans text-[11.5px] text-ink-mute mt-0.5 truncate">
                        {p.sub}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-sans text-[13px] font-semibold tabular-nums text-ink-body">
                        {formatPriceSEK(p.priceKr)}
                      </div>
                      <Link
                        href={`/produkter/${p.slug}`}
                        className="font-sans text-[12px] font-semibold text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent"
                      >
                        Visa
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        </div>
      </div>

      {klarnaConfigured && (
        <section className="mt-12 max-w-[820px]">
          <Eyebrow className="text-accent-deep">Vanliga frågor</Eyebrow>
          <Display as="h2" size="md" className="mt-2 mb-5">
            Innan du betalar
          </Display>
          <div className="divide-y divide-border-soft border-y border-border-soft">
            {[
              {
                q: "När får jag mitt paket?",
                a: "Beställningar som läggs före kl 13 på vardagar packas oftast samma dag. PostNord levererar normalt inom 1–3 arbetsdagar i Sverige.",
              },
              {
                q: "Hur fungerar Familjen Biomax-poäng?",
                a: "Du tjänar poäng på varje köp och kan lösa in dem som rabatt direkt i kassan. 100 poäng = 10 kr. Rabatten uppdateras automatiskt när du drar i reglaget.",
              },
              {
                q: "Kan jag ångra mitt köp?",
                a: "Ja. Du har 14 dagars öppet köp och fri retur via PostNord. Kontakta oss på kontakt@biomax.nu så hjälper vi dig.",
              },
              {
                q: "Är betalningen säker?",
                a: "Betalningen hanteras av Kustom med Klarna, kort och Swish. All betalningsinformation krypteras — vi lagrar aldrig dina kortuppgifter.",
              },
            ].map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex items-center justify-between cursor-pointer list-none font-sans text-[15px] font-medium text-primary-deep">
                  {f.q}
                  <span
                    aria-hidden
                    className="ml-4 text-ink-mute transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-2 font-sans text-[14px] text-ink-mute leading-relaxed">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
