import type { OrderStatus } from "@prisma/client";

const STYLES: Record<
  OrderStatus,
  { label: string; bg: string; fg: string }
> = {
  PENDING: { label: "Väntar", bg: "bg-surface-warm", fg: "text-ink-mute" },
  PAID: { label: "Betald", bg: "bg-accent/15", fg: "text-accent-deep" },
  FULFILLED: { label: "Skickad", bg: "bg-primary/10", fg: "text-primary-deep" },
  CANCELLED: { label: "Avbruten", bg: "bg-[#B5523B]/10", fg: "text-[#B5523B]" },
  REFUNDED: { label: "Återbetald", bg: "bg-ink-soft/15", fg: "text-ink-mute" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const s = STYLES[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full font-sans text-[10px] uppercase tracking-[0.18em] font-bold ${s.bg} ${s.fg}`}
    >
      {s.label}
    </span>
  );
}
