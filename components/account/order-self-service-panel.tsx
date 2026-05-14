"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  updateShippingAddress,
  cancelOrder,
} from "@/lib/orders/self-service-actions";

type Address = {
  fullName: string;
  street: string;
  postalCode: string;
  city: string;
  phone: string | null;
};

/**
 * Self-service controls on /konto/ordrar/[orderNumber] for orders that
 * are still PAID (not yet packed):
 *   - "Ändra leveransadress"
 *   - "Avbryt köpet"
 *
 * Both collapse to an inline confirmation flow. Outside the PAID
 * window the panel renders a single instructional sentence pointing at
 * support — we never silently disable, the customer needs to see why.
 */
export function OrderSelfServicePanel({
  orderId,
  orderNumber,
  status,
  shippingAddress,
}: {
  orderId: string;
  orderNumber: string;
  status: string;
  shippingAddress: Address | null;
}) {
  const editable = status === "PAID";

  if (!editable) {
    return (
      <div className="mt-8 pt-6 border-t border-border-soft font-sans text-[13px] text-ink-mute leading-relaxed">
        {status === "PENDING"
          ? "Vi väntar fortfarande på betalningsbekräftelse. När den kommit kan du justera leveransadress eller avbryta innan paketet packas."
          : status === "FULFILLED"
            ? "Paketet är packat och på väg. Behöver du ändra något — eller önskar du returnera — mejla kontakt@biomax.nu och uppge ordernummer."
            : "Inga självserviceåtgärder tillgängliga för den här ordern. Mejla kontakt@biomax.nu om du behöver hjälp."}
      </div>
    );
  }

  return (
    <div className="mt-10 pt-6 border-t border-border">
      <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-ink-soft font-semibold mb-4">
        Hantera ordern
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AddressEditor orderId={orderId} shippingAddress={shippingAddress} />
        <CancelOrderControl orderId={orderId} orderNumber={orderNumber} />
      </div>
    </div>
  );
}

function AddressEditor({
  orderId,
  shippingAddress,
}: {
  orderId: string;
  shippingAddress: Address | null;
}) {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState(shippingAddress?.fullName ?? "");
  const [street, setStreet] = useState(shippingAddress?.street ?? "");
  const [postalCode, setPostalCode] = useState(
    shippingAddress?.postalCode ?? ""
  );
  const [city, setCity] = useState(shippingAddress?.city ?? "");
  const [phone, setPhone] = useState(shippingAddress?.phone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit() {
    setError(null);
    start(async () => {
      const result = await updateShippingAddress({
        orderId,
        fullName,
        street,
        postalCode,
        city,
        phone: phone || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="bg-surface-alt border border-border rounded-2xl p-5">
      <p className="font-display text-base font-medium text-primary-deep mb-1">
        Ändra leveransadress
      </p>
      <p className="font-sans text-[12.5px] text-ink-mute mb-4 leading-relaxed">
        Möjligt innan paketet är packat. Efter det — mejla oss.
      </p>
      {!open ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
        >
          Ändra adress
        </Button>
      ) : (
        <div className="space-y-3">
          <Input
            label="Namn"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={pending}
          />
          <Input
            label="Gatuadress"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            disabled={pending}
          />
          <div className="grid grid-cols-[120px_1fr] gap-3">
            <Input
              label="Postnr"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              disabled={pending}
            />
            <Input
              label="Ort"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={pending}
            />
          </div>
          <Input
            label="Telefon (valfritt)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={pending}
          />
          {error && (
            <p
              role="alert"
              className="font-sans text-[12.5px] text-[#B5523B]"
            >
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <Button type="button" onClick={submit} disabled={pending}>
              {pending ? "Sparar…" : "Spara"}
            </Button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
              disabled={pending}
              className="font-sans text-[13px] text-ink-soft hover:text-ink-body"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CancelOrderControl({
  orderId,
  orderNumber,
}: {
  orderId: string;
  orderNumber: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit() {
    setError(null);
    start(async () => {
      const result = await cancelOrder({
        orderId,
        reason: reason || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="bg-surface-alt border border-border rounded-2xl p-5">
      <p className="font-display text-base font-medium text-primary-deep mb-1">
        Avbryt köpet
      </p>
      <p className="font-sans text-[12.5px] text-ink-mute mb-4 leading-relaxed">
        Vi frigör lagret. Återbetalning av betalningen sker via support
        (mejla efter att du avbrutit).
      </p>
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="font-sans text-[13px] text-[#B5523B] underline decoration-[#B5523B]/40 underline-offset-[3px] hover:decoration-[#B5523B]"
        >
          Avbryt ordern
        </button>
      ) : (
        <div className="space-y-3">
          <p className="font-sans text-[13px] text-ink-body">
            Bekräfta att du vill avbryta order {orderNumber}.
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Valfritt — berätta varför, det hjälper oss bli bättre."
            rows={2}
            maxLength={240}
            className="w-full px-3 py-2 bg-surface border border-border rounded-md font-sans text-[13.5px]"
          />
          {error && (
            <p
              role="alert"
              className="font-sans text-[12.5px] text-[#B5523B]"
            >
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="px-4 py-1.5 rounded-md bg-[#B5523B] text-surface hover:bg-[#9F4630] font-sans text-[13px] font-semibold transition-colors"
            >
              {pending ? "Avbryter…" : "Ja, avbryt"}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setReason("");
                setError(null);
              }}
              disabled={pending}
              className="font-sans text-[13px] text-ink-soft hover:text-ink-body"
            >
              Nej, behåll
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
