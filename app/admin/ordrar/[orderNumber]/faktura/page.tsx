import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPriceSEK } from "@/lib/format";
import { PrintButton } from "@/components/admin/print-button";

/**
 * Print-friendly invoice / kvitto for a single order.
 *
 * Renders an A4-sized sheet with:
 *  - Biomax HB seller block (Eken Hälsobutik, Kållered, org.nr)
 *  - Buyer block (shipping / billing address fallbacks)
 *  - Order meta (faktura-nr = orderNumber, datum, betalsätt, ref)
 *  - Itemised lines (SKU, qty, unit, line total)
 *  - Totals + VAT breakdown
 *
 * Print rules (`@media print` via Tailwind `print:` modifiers):
 *  - The admin chrome (sidebar/topbar) is part of /admin/layout.tsx —
 *    we hide it by lifting this sheet onto `position: fixed; inset: 0;
 *    background: white; z-index: 9999;` in print mode and using a
 *    `print:block`/`print:hidden` toggle for our own action bar.
 *  - All colour is desaturated to ink-black; surface tints removed so
 *    printers don't bleed amber backgrounds.
 *
 * The route lives under /admin/ordrar/[orderNumber]/faktura so it's
 * gated by the same admin middleware as the rest of the dashboard —
 * customers don't have access. (The customer-facing kvitto link is a
 * separate concern handled by the order-confirmation email.)
 */

const dateFmt = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export default async function AdminOrderInvoice({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: {
        select: {
          id: true,
          productName: true,
          productSku: true,
          variantLabel: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
        },
      },
      shippingAddress: true,
      billingAddress: true,
    },
  });
  if (!order) notFound();

  const billing = order.billingAddress ?? order.shippingAddress;
  const vatRatePct = (order.taxRateBp / 100).toString().replace(".", ",");

  // Derive net (ex VAT) from the stored gross totals. Order.subtotal is
  // already ex-VAT in our schema (see /lib/cart/totals.ts), so we use it
  // directly; if you ever flip the convention this is the single place
  // to revisit.
  const subtotalExVat = parseFloat(order.subtotal.toString());
  const vat = parseFloat(order.taxAmount.toString());
  const shipping = parseFloat(order.shippingAmount.toString());
  const discount = parseFloat(order.discountAmount.toString());
  const total = parseFloat(order.totalAmount.toString());

  return (
    <div className="invoice-sheet bg-white text-ink-body">
      {/* Action bar — hidden from print */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3 mb-6">
        <Link
          href={`/admin/ordrar/${order.orderNumber}`}
          className="inline-flex items-center gap-1 font-sans text-body text-primary hover:text-primary-deep transition-colors"
        >
          ← Tillbaka till order
        </Link>
        <PrintButton label="Skriv ut faktura" />
      </div>

      {/* The printable sheet */}
      <article className="invoice mx-auto bg-white text-[#111] font-sans">
        {/* Header — seller + invoice meta */}
        <header className="flex justify-between items-start gap-8 pb-6 border-b border-[#111]/15">
          <div>
            <p className="font-display text-[28px] font-medium tracking-tight text-[#111]">
              Biomax
            </p>
            <p className="text-caption leading-relaxed mt-1 text-[#333]">
              Biomax Handelsbolag · Eken Hälsobutik
              <br />
              Ekenleden 15A, 428 36 Kållered
              <br />
              Org.nr 969676-7939 · Innehar F-skattsedel
              <br />
              kontakt@biomax.nu · biomax.nu
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-[22px] font-medium tracking-tight text-[#111]">
              Faktura
            </p>
            <dl className="mt-2 text-caption grid grid-cols-[auto_auto] gap-x-3 gap-y-1 text-[#333] text-right">
              <dt className="text-[#666]">Fakturanr</dt>
              <dd className="tabular-nums font-semibold">
                {order.orderNumber}
              </dd>
              <dt className="text-[#666]">Datum</dt>
              <dd className="tabular-nums">{dateFmt.format(order.createdAt)}</dd>
              <dt className="text-[#666]">Betalsätt</dt>
              <dd>{order.paymentProvider}</dd>
              {order.paymentReference && (
                <>
                  <dt className="text-[#666]">Betalref</dt>
                  <dd className="font-mono text-micro break-all max-w-[180px]">
                    {order.paymentReference}
                  </dd>
                </>
              )}
              <dt className="text-[#666]">Status</dt>
              <dd>{order.status === "PAID" || order.status === "FULFILLED" ? "Betald" : order.status}</dd>
            </dl>
          </div>
        </header>

        {/* Parties */}
        <section className="grid grid-cols-2 gap-8 py-6 border-b border-[#111]/15">
          <div>
            <p className="text-micro uppercase tracking-[0.16em] font-semibold text-[#666] mb-2">
              Fakturaadress
            </p>
            {billing ? (
              <p className="text-small leading-relaxed text-[#111]">
                <strong className="font-semibold">{billing.fullName}</strong>
                <br />
                {billing.street}
                <br />
                {billing.postalCode} {billing.city}
                <br />
                {order.email}
              </p>
            ) : (
              <p className="text-small leading-relaxed text-[#111]">
                <strong className="font-semibold">{order.email}</strong>
              </p>
            )}
          </div>
          {order.shippingAddress && (
            <div>
              <p className="text-micro uppercase tracking-[0.16em] font-semibold text-[#666] mb-2">
                Leveransadress
              </p>
              <p className="text-small leading-relaxed text-[#111]">
                <strong className="font-semibold">
                  {order.shippingAddress.fullName}
                </strong>
                <br />
                {order.shippingAddress.street}
                <br />
                {order.shippingAddress.postalCode}{" "}
                {order.shippingAddress.city}
                {order.shippingAddress.phone && (
                  <>
                    <br />
                    {order.shippingAddress.phone}
                  </>
                )}
              </p>
            </div>
          )}
        </section>

        {/* Line items */}
        <section className="py-6">
          <table className="w-full text-caption border-collapse">
            <thead>
              <tr className="text-left text-[#666] uppercase tracking-[0.12em] text-micro font-semibold border-b border-[#111]/15">
                <th className="py-2 pr-3 font-semibold">Produkt</th>
                <th className="py-2 px-3 font-semibold w-[80px] text-right">
                  Antal
                </th>
                <th className="py-2 px-3 font-semibold w-[110px] text-right">
                  À-pris
                </th>
                <th className="py-2 pl-3 font-semibold w-[120px] text-right">
                  Summa
                </th>
              </tr>
            </thead>
            <tbody>
              {order.items.length > 0 ? (
                order.items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-[#111]/8 align-top"
                  >
                    <td className="py-2.5 pr-3">
                      <p className="font-semibold text-[#111]">
                        {item.productName}
                      </p>
                      <p className="text-micro text-[#666] mt-0.5">
                        {item.variantLabel && <>{item.variantLabel} · </>}
                        {item.productSku && <>SKU: {item.productSku}</>}
                      </p>
                    </td>
                    <td className="py-2.5 px-3 tabular-nums text-right">
                      {item.quantity}
                    </td>
                    <td className="py-2.5 px-3 tabular-nums text-right">
                      {formatPriceSEK(item.unitPrice.toString())}
                    </td>
                    <td className="py-2.5 pl-3 tabular-nums text-right font-semibold">
                      {formatPriceSEK(item.totalPrice.toString())}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="py-6 text-center text-[#666] italic"
                  >
                    Inga raditems sparade (importerad order — bara totalbelopp).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Totals */}
        <section className="flex justify-end pb-6">
          <dl className="w-[280px] text-small">
            <Row label="Delsumma (ex moms)" value={formatPriceSEK(subtotalExVat)} />
            {discount > 0 && (
              <Row
                label={
                  order.loyaltyPointsRedeemed
                    ? `Familjen Biomax · ${order.loyaltyPointsRedeemed.toLocaleString("sv-SE")} p`
                    : "Rabatt"
                }
                value={`−${formatPriceSEK(discount)}`}
              />
            )}
            <Row label="Frakt" value={formatPriceSEK(shipping)} />
            <Row label={`Moms (${vatRatePct} %)`} value={formatPriceSEK(vat)} />
            <div className="flex justify-between mt-3 pt-3 border-t-2 border-[#111] text-lead font-semibold text-[#111]">
              <dt>Att betala</dt>
              <dd className="tabular-nums">{formatPriceSEK(total)}</dd>
            </div>
          </dl>
        </section>

        {/* Footer note */}
        <footer className="pt-6 border-t border-[#111]/15 text-micro leading-relaxed text-[#666]">
          <p>
            Tack för din beställning. Vid frågor om denna faktura, kontakta oss
            på kontakt@biomax.nu och uppge fakturanr {order.orderNumber}.
          </p>
          <p className="mt-2">
            Returer enligt distansavtalslagen (14 dagars ångerrätt) — se
            biomax.nu/villkor.
          </p>
        </footer>
      </article>

      {/* Print stylesheet — overrides the admin shell so only .invoice
          prints. Scoped via `@media print` so the admin UI is unaffected
          on screen. */}
      <style>{`
        .invoice {
          max-width: 760px;
          padding: 32px 40px;
        }
        @media print {
          @page { size: A4; margin: 14mm; }
          html, body { background: white !important; }
          /* Hide everything in the admin shell except our sheet */
          body * { visibility: hidden !important; }
          .invoice-sheet, .invoice-sheet * { visibility: visible !important; }
          .invoice-sheet {
            position: absolute;
            inset: 0;
            margin: 0;
            padding: 0;
            background: white !important;
          }
          .invoice {
            box-shadow: none !important;
            border: 0 !important;
            padding: 0 !important;
            max-width: none !important;
          }
        }
      `}</style>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1 text-[#333]">
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
