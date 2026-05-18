import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { prisma } from "@/lib/prisma";
import { formatPriceSEK } from "@/lib/format";
import { ReturnAdminRow } from "@/components/admin/return-admin-row";

export const metadata = { title: "Returer" };

const dateFmt = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const STATUS_LABEL = {
  REQUESTED: "Inkommen",
  APPROVED: "Godkänd",
  RECEIVED: "Mottagen",
  REFUNDED: "Återbetald",
  REJECTED: "Avvisad",
} as const;

const STATUS_TONE = {
  REQUESTED: "bg-status-warn/15 text-status-low",
  APPROVED: "bg-accent-deep/12 text-accent-deep",
  RECEIVED: "bg-primary/12 text-primary-deep",
  REFUNDED: "bg-ink-soft/12 text-ink-soft",
  REJECTED: "bg-status-error/12 text-status-error",
} as const;

/**
 * Admin returns moderation queue.
 *
 * Lists every Return row, newest first. Per row:
 *   - status badge + order link + customer email
 *   - items being returned (qty)
 *   - quick-action buttons: Approve / Reject / Mark received /
 *     Record refund (with amount + reference fields).
 *
 * All mutations call into lib/orders/return-actions which audit-logs.
 */
export default async function AdminReturnsPage() {
  const returns = await prisma.return.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      order: { select: { orderNumber: true, email: true, totalAmount: true } },
      items: {
        include: {
          orderItem: { select: { productName: true } },
        },
      },
    },
  });

  return (
    <>
      <AdminPageHeader
        eyebrow="Drift"
        title="Returer"
        crumbs={[{ label: "Drift", href: "/admin" }, { label: "Returer" }]}
        subtitle={`${returns.length} ${returns.length === 1 ? "retur" : "returer"} totalt.`}
      />

      {returns.length === 0 ? (
        <p className="font-sans text-body text-ink-mute italic">
          Inga returer registrerade.
        </p>
      ) : (
        <ul className="space-y-4">
          {returns.map((r) => (
            <ReturnAdminRow
              key={r.id}
              data={{
                id: r.id,
                returnNumber: r.returnNumber,
                status: r.status,
                statusLabel: STATUS_LABEL[r.status],
                statusTone: STATUS_TONE[r.status],
                createdAt: dateFmt.format(r.createdAt),
                reason: r.reason,
                internalNote: r.internalNote,
                refundAmount: r.refundAmount?.toString() ?? null,
                refundReference: r.refundReference,
                orderNumber: r.order.orderNumber,
                customerEmail: r.order.email,
                orderTotal: formatPriceSEK(r.order.totalAmount.toString()),
                items: r.items.map((i) => ({
                  productName: i.orderItem.productName,
                  quantity: i.quantity,
                })),
              }}
            />
          ))}
        </ul>
      )}
    </>
  );
}
