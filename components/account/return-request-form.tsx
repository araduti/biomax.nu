"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requestReturn } from "@/lib/orders/return-actions";

type Line = {
  id: string;
  productName: string;
  quantity: number;
};

/**
 * Customer-initiated return request. Renders inline on the order
 * detail page (FULFILLED status, within the 14-day window).
 *
 * UX: a row per OrderItem with a number stepper (0 → max). Submitting
 * with all zeroes is silently a no-op. Reason is optional.
 */
export function ReturnRequestForm({
  orderId,
  lines,
}: {
  orderId: string;
  lines: Line[];
}) {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function setLineQty(orderItemId: string, n: number, max: number) {
    setQty((prev) => ({
      ...prev,
      [orderItemId]: Math.max(0, Math.min(max, n)),
    }));
  }

  function submit() {
    setError(null);
    const items = Object.entries(qty)
      .filter(([, q]) => q > 0)
      .map(([orderItemId, q]) => ({ orderItemId, quantity: q }));
    if (items.length === 0) {
      setError("Välj minst en produkt att returnera.");
      return;
    }
    start(async () => {
      const result = await requestReturn({
        orderId,
        items,
        reason: reason || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(result.returnNumber);
      setOpen(false);
      router.refresh();
    });
  }

  if (success) {
    return (
      <div className="bg-accent/8 border border-accent-deep/30 rounded-2xl p-5">
        <p className="font-display text-base font-medium text-primary-deep">
          Retur registrerad — {success}
        </p>
        <p className="mt-1 font-sans text-small text-ink-body">
          Vi mejlar instruktioner för returfrakten inom någon dag.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-alt border border-border rounded-2xl p-5">
      <p className="font-display text-base font-medium text-primary-deep mb-1">
        Returnera produkter
      </p>
      <p className="font-sans text-caption text-ink-mute mb-4 leading-relaxed">
        14 dagars öppet köp. Vi skickar instruktioner för retur efter att
        du registrerat ärendet.
      </p>
      {!open ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
        >
          Påbörja retur
        </Button>
      ) : (
        <div>
          <ul className="space-y-3 mb-4">
            {lines.map((line) => (
              <li
                key={line.id}
                className="flex items-center justify-between gap-3"
              >
                <span className="font-sans text-small text-ink-body">
                  {line.productName}{" "}
                  <span className="text-ink-soft">(max {line.quantity})</span>
                </span>
                <div className="inline-flex items-center border border-border rounded-full bg-surface overflow-hidden">
                  <button
                    type="button"
                    onClick={() =>
                      setLineQty(
                        line.id,
                        (qty[line.id] ?? 0) - 1,
                        line.quantity
                      )
                    }
                    disabled={pending}
                    className="w-7 h-7 inline-flex items-center justify-center text-ink-body hover:bg-surface-warm"
                  >
                    −
                  </button>
                  <span className="min-w-[24px] text-center font-sans text-small font-semibold">
                    {qty[line.id] ?? 0}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setLineQty(
                        line.id,
                        (qty[line.id] ?? 0) + 1,
                        line.quantity
                      )
                    }
                    disabled={pending}
                    className="w-7 h-7 inline-flex items-center justify-center text-ink-body hover:bg-surface-warm"
                  >
                    +
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <label className="block mb-4">
            <span className="block font-sans text-caption font-semibold text-ink-soft mb-1.5">
              Anledning (valfritt)
            </span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Hjälper oss förstå om något var fel — eller bara att produkten inte passade."
              className="w-full px-3 py-2 bg-surface border border-border rounded-md font-sans text-small"
            />
          </label>
          {error && (
            <p
              role="alert"
              className="mb-3 font-sans text-caption text-status-error"
            >
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <Button type="button" onClick={submit} disabled={pending}>
              {pending ? "Skickar…" : "Begär retur"}
            </Button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
              disabled={pending}
              className="font-sans text-small text-ink-soft hover:text-ink-body"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
