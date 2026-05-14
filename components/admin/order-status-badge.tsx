import type { OrderStatus } from "@prisma/client";

/**
 * Order status pill — text + icon, never colour-only.
 *
 * Reasoning: ~8% of men have red-green colourblindness, and blue-yellow
 * distinction degrades with age. The previous version was a tiny 10 px
 * uppercase pill where state was decoded by a faint background hue
 * (`bg-accent/15`). Inside admin we promote to 13 px sentence-case with
 * an icon character carrying the redundant signal.
 *
 *   ⏳  Väntar     PENDING    amber
 *   ✓   Betald     PAID       sage green
 *   📦  Skickad    FULFILLED  primary blue
 *   ↩   Avbruten   CANCELLED  brick red
 *   ⟲   Återbetald REFUNDED   ink-mute grey
 */
const STYLES: Record<
  OrderStatus,
  { label: string; icon: string; bg: string; fg: string }
> = {
  PENDING: { label: "Väntar", icon: "⏳", bg: "bg-[#C68A4F]/15", fg: "text-[#8A5A2C]" },
  PAID: { label: "Betald", icon: "✓", bg: "bg-accent/15", fg: "text-accent-deep" },
  FULFILLED: { label: "Skickad", icon: "📦", bg: "bg-primary/10", fg: "text-primary-deep" },
  CANCELLED: { label: "Avbruten", icon: "↩", bg: "bg-[#B5523B]/10", fg: "text-[#B5523B]" },
  REFUNDED: { label: "Återbetald", icon: "⟲", bg: "bg-ink-soft/15", fg: "text-ink-mute" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const s = STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-sans text-[13px] font-semibold ${s.bg} ${s.fg}`}
    >
      <span aria-hidden className="text-[14px] leading-none">
        {s.icon}
      </span>
      {s.label}
    </span>
  );
}
