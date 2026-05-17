import type { OrderStatus } from "@prisma/client";

/**
 * Order-status state machine — the single source of truth for which
 * transitions are legal. Previously this map lived only inside
 * lib/admin/order-actions.ts, so the refund path (lib/orders/return-
 * actions.ts) could flip an order to REFUNDED from ANY state (e.g. a
 * CANCELLED order), risking double-refund / double-fulfilment.
 */
export const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["PAID", "CANCELLED"],
  PAID: ["FULFILLED", "CANCELLED", "REFUNDED"],
  FULFILLED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export function canTransitionOrder(
  from: OrderStatus,
  to: OrderStatus
): boolean {
  return VALID_ORDER_TRANSITIONS[from].includes(to);
}
