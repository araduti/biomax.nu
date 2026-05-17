import type { OrderStatus } from "@prisma/client";
import { AdminStatusPill, type StatusKind } from "./admin-status-pill";

/**
 * Order status pill — text + icon, never colour-only.
 *
 * Now a thin wrapper around `<AdminStatusPill>` so all status chips
 * in admin share one spec (radius, size, type weight, palette). The
 * icon character is preserved per status because ~8% of men have
 * red-green colourblindness and the icon carries the redundant signal:
 *
 *   ⏳  Väntar     PENDING    warn  (amber)
 *   ✓   Betald     PAID       ok    (sage)
 *   📦  Skickad    FULFILLED  info  (primary blue)
 *   ↩   Avbruten   CANCELLED  error (rust)
 *   ⟲   Återbetald REFUNDED   muted (ink-mute)
 */
const STATUS_MAP: Record<
  OrderStatus,
  { kind: StatusKind; icon: string; label: string }
> = {
  PENDING: { kind: "warn", icon: "⏳", label: "Väntar" },
  PAID: { kind: "ok", icon: "✓", label: "Betald" },
  FULFILLED: { kind: "info", icon: "📦", label: "Skickad" },
  CANCELLED: { kind: "error", icon: "↩", label: "Avbruten" },
  REFUNDED: { kind: "muted", icon: "⟲", label: "Återbetald" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const s = STATUS_MAP[status];
  return (
    <AdminStatusPill kind={s.kind} icon={s.icon}>
      {s.label}
    </AdminStatusPill>
  );
}
