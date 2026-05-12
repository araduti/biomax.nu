"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart-store";

/** Mounted on the confirmation page — clears the cart once after success. */
export function ClearCartOnMount() {
  const clear = useCart((s) => s.clear);
  useEffect(() => {
    clear();
  }, [clear]);
  return null;
}

type LastDelivery = {
  method: "home" | "pickup";
  servicePoint: {
    name: string;
    street: string;
    postalCode: string;
    city: string;
  } | null;
};

/**
 * Reads the delivery method + chosen ombud out of sessionStorage (stashed
 * by checkout-flow before redirect). Renders a small "where to pick up"
 * card so the customer can re-find their ombud after closing the tab.
 * Falls back to nothing if storage is empty or malformed.
 */
export function DeliveryReminder() {
  const [delivery, setDelivery] = useState<LastDelivery | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("biomax:lastDelivery");
      if (!raw) return;
      const parsed = JSON.parse(raw) as LastDelivery;
      setDelivery(parsed);
    } catch {
      // ignore
    }
  }, []);

  if (!delivery) return null;

  if (delivery.method === "home") {
    return (
      <div className="rounded-2xl border border-border bg-surface-warm/60 p-5">
        <p className="font-sans text-[11px] uppercase tracking-[0.18em] font-semibold text-ink-soft">
          Leverans
        </p>
        <p className="mt-2 font-display text-[17px] text-primary-deep tracking-tight">
          Hem till dörren
        </p>
        <p className="mt-1 font-sans text-[13.5px] text-ink-mute leading-relaxed">
          PostNord MyPack Home — paketet lämnas i din brevlåda eller på
          överenskommen plats.
        </p>
      </div>
    );
  }

  const sp = delivery.servicePoint;
  if (!sp) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface-warm/60 p-5">
      <p className="font-sans text-[11px] uppercase tracking-[0.18em] font-semibold text-ink-soft">
        Hämtas hos
      </p>
      <p className="mt-2 font-display text-[17px] text-primary-deep tracking-tight">
        {sp.name}
      </p>
      <p className="mt-1 font-sans text-[13.5px] text-ink-mute leading-relaxed">
        {sp.street}, {sp.postalCode} {sp.city}
      </p>
      <p className="mt-3 font-sans text-[12px] text-ink-soft leading-relaxed">
        Du får ett sms från PostNord när paketet finns att hämta. Hämtas inom
        14 dagar — efter det skickas det i retur.
      </p>
    </div>
  );
}
