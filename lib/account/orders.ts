import { prisma } from "@/lib/prisma";

/**
 * All orders belonging to a user — matched by either userId (new orders /
 * imported orders where _customer_user was set) OR email (legacy guest /
 * pre-account orders, plus any imports where userId wasn't linked).
 *
 * This is what makes the 2,778 imported customers see their order history
 * the moment they claim their account via password reset.
 */
export async function getOrdersForUser(opts: {
  userId: string;
  email: string;
}) {
  return prisma.order.findMany({
    where: {
      OR: [{ userId: opts.userId }, { email: opts.email.toLowerCase() }],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      currency: true,
      subtotal: true,
      shippingAmount: true,
      totalAmount: true,
      createdAt: true,
      legacySource: true,
      paymentProvider: true,
      _count: { select: { items: true } },
    },
  });
}

/** Single order, scoped to the user (by id or email). */
export async function getOrderForUser(opts: {
  userId: string;
  email: string;
  orderNumber: string;
}) {
  return prisma.order.findFirst({
    where: {
      orderNumber: opts.orderNumber,
      OR: [{ userId: opts.userId }, { email: opts.email.toLowerCase() }],
    },
    include: {
      items: {
        select: {
          id: true,
          productName: true,
          productSku: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
          product: { select: { slug: true, imageUrl: true } },
        },
      },
      shippingAddress: true,
      billingAddress: true,
    },
  });
}

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  PENDING: { label: "Väntar", tone: "text-ink-mute" },
  PAID: { label: "Betald", tone: "text-accent-deep" },
  FULFILLED: { label: "Skickad", tone: "text-accent-deep" },
  CANCELLED: { label: "Avbruten", tone: "text-ink-soft" },
  REFUNDED: { label: "Återbetald", tone: "text-ink-soft" },
};

export function statusDisplay(status: string) {
  return (
    STATUS_LABELS[status] ?? { label: status, tone: "text-ink-mute" }
  );
}
