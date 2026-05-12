"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { updateOrderStatus } from "@/lib/admin/order-actions";

const TRANSITIONS: Record<
  OrderStatus,
  { to: OrderStatus; label: string; variant: "primary" | "outline" }[]
> = {
  PENDING: [
    { to: "PAID", label: "Markera som betald", variant: "primary" },
    { to: "CANCELLED", label: "Avbryt", variant: "outline" },
  ],
  PAID: [
    { to: "FULFILLED", label: "Markera som skickad", variant: "primary" },
    { to: "REFUNDED", label: "Återbetala", variant: "outline" },
    { to: "CANCELLED", label: "Avbryt", variant: "outline" },
  ],
  FULFILLED: [{ to: "REFUNDED", label: "Återbetala", variant: "outline" }],
  CANCELLED: [],
  REFUNDED: [],
};

export function OrderStatusUpdate({
  orderNumber,
  status,
}: {
  orderNumber: string;
  status: OrderStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const transitions = TRANSITIONS[status];

  if (transitions.length === 0) {
    return (
      <p className="font-sans text-[13px] text-ink-mute italic">
        Inga ytterligare statusändringar tillgängliga.
      </p>
    );
  }

  function go(next: OrderStatus, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setError(null);
    startTransition(async () => {
      const result = await updateOrderStatus(orderNumber, next);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {transitions.map((t) => (
          <Button
            key={t.to}
            type="button"
            variant={t.variant}
            size="md"
            disabled={pending}
            onClick={() =>
              go(
                t.to,
                t.to === "CANCELLED" || t.to === "REFUNDED"
                  ? `Bekräfta: ${t.label}?`
                  : undefined
              )
            }
          >
            {t.label}
          </Button>
        ))}
      </div>
      {error && (
        <p
          role="alert"
          className="mt-3 font-sans text-[13px] text-[#B5523B] bg-[#B5523B]/10 px-3 py-2 rounded-md"
        >
          {error}
        </p>
      )}
    </div>
  );
}
