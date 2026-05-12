import Link from "next/link";
import { Eyebrow } from "@/components/ui/typography";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { formatPriceSEK } from "@/lib/format";
import { getDashboardStats } from "@/lib/admin/stats";

const dateFmt = new Intl.DateTimeFormat("sv-SE", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const monthFmt = new Intl.DateTimeFormat("sv-SE", { month: "long" });

export default async function AdminOverview() {
  const s = await getDashboardStats();
  const monthName = monthFmt.format(new Date());
  const revenueDelta =
    s.revenuePrevMonth > 0
      ? Math.round(
          ((s.revenueThisMonth - s.revenuePrevMonth) / s.revenuePrevMonth) * 100
        )
      : null;
  const ordersDelta =
    s.paidOrdersPrevMonth > 0
      ? Math.round(
          ((s.paidOrdersThisMonth - s.paidOrdersPrevMonth) /
            s.paidOrdersPrevMonth) *
            100
        )
      : null;

  return (
    <>
      <AdminPageHeader
        eyebrow="Drift"
        title="Hur går det?"
        subtitle={`Översikt över ${monthName}. Klicka in på en order eller produkt för detaljer.`}
      />

      {/* Headline KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <Kpi
          label={`Intäkter ${monthName}`}
          value={formatPriceSEK(s.revenueThisMonth)}
          delta={revenueDelta}
        />
        <Kpi
          label={`Ordrar ${monthName}`}
          value={s.paidOrdersThisMonth.toString()}
          delta={ordersDelta}
        />
        <Kpi
          label="Att skicka"
          value={s.paidCount.toString()}
          accent={s.paidCount > 0}
        />
        <Kpi
          label="Att hantera"
          value={s.pendingCount.toString()}
          accent={s.pendingCount > 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
        {/* Recent orders */}
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-display text-2xl font-medium tracking-tight text-primary-deep">
              Senaste ordrar
            </h2>
            <Link
              href="/admin/ordrar"
              className="font-sans text-[13px] font-semibold text-primary border-b border-primary/40 pb-0.5 hover:border-primary"
            >
              Alla ordrar →
            </Link>
          </div>
          <ul className="bg-surface-alt border border-border rounded-2xl overflow-hidden">
            {s.recentOrders.map((o, i) => (
              <li
                key={o.id}
                className={i > 0 ? "border-t border-border-soft" : ""}
              >
                <Link
                  href={`/admin/ordrar/${o.orderNumber}`}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-4 hover:bg-surface-warm transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-display text-[14px] font-medium tracking-tight text-primary-deep">
                      {o.orderNumber}
                    </p>
                    <p className="font-sans text-[12px] text-ink-mute mt-0.5 truncate">
                      {o.email} · {dateFmt.format(o.createdAt)} · {o._count.items}{" "}
                      st
                    </p>
                  </div>
                  <OrderStatusBadge status={o.status} />
                  <span className="font-display text-[15px] font-medium text-primary-deep tracking-tight whitespace-nowrap min-w-[80px] text-right">
                    {formatPriceSEK(o.totalAmount.toString())}
                  </span>
                </Link>
              </li>
            ))}
            {s.recentOrders.length === 0 && (
              <li className="px-5 py-8 text-center font-sans text-[14px] text-ink-mute">
                Inga ordrar än.
              </li>
            )}
          </ul>
        </section>

        {/* Side panels */}
        <aside className="flex flex-col gap-6">
          <div className="bg-surface-alt border border-border rounded-2xl p-5">
            <h3 className="font-display text-xl font-medium tracking-tight text-primary-deep mb-4">
              Lågt lager
            </h3>
            {s.lowStock.length === 0 ? (
              <p className="font-sans text-[13px] text-ink-mute italic">
                Allt välfyllt — inga produkter under 5 st.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {s.lowStock.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-baseline justify-between gap-2"
                  >
                    <Link
                      href={`/admin/produkter/${p.slug}`}
                      className="font-sans text-[14px] text-primary-deep hover:text-primary truncate"
                    >
                      {p.name}
                    </Link>
                    <span
                      className={`font-display text-[14px] font-medium whitespace-nowrap ${
                        p.stock === 0 ? "text-[#B5523B]" : "text-accent-deep"
                      }`}
                    >
                      {p.stock} st
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-surface-alt border border-border rounded-2xl p-5">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="font-display text-xl font-medium tracking-tight text-primary-deep">
                Innehållshälsa
              </h3>
              <Link
                href="/admin/produkter"
                className="font-sans text-[12px] text-primary border-b border-primary/40 pb-px hover:border-primary"
              >
                Se →
              </Link>
            </div>
            <p className="font-sans text-[10.5px] uppercase tracking-[0.2em] font-semibold text-ink-mute mb-2">
              Produkter ({s.productCount})
            </p>
            <ul className="space-y-1.5 font-sans text-[13.5px] mb-4">
              <HealthRow color="bg-accent-deep" label="Komplett" count={s.productHealth.complete} total={s.productCount} />
              <HealthRow color="bg-[#C68A4F]" label="Delvis" count={s.productHealth.partial} total={s.productCount} />
              <HealthRow color="bg-[#B5523B]" label="Behöver åtgärd" count={s.productHealth["needs-work"]} total={s.productCount} />
            </ul>
            <p className="font-sans text-[10.5px] uppercase tracking-[0.2em] font-semibold text-ink-mute mb-2 mt-1">
              Kunskapsbank
            </p>
            <dl className="space-y-1.5 font-sans text-[13.5px]">
              <Stat label="Monografier" value={s.monographs.total.toString()} />
              <Stat
                label="Med källor"
                value={`${s.monographs.withReferences} / ${s.monographs.total}`}
              />
              <Stat
                label="Med relaterade"
                value={`${s.monographs.withRelated} / ${s.monographs.total}`}
              />
            </dl>
          </div>

          <div className="bg-surface-alt border border-border rounded-2xl p-5">
            <h3 className="font-display text-xl font-medium tracking-tight text-primary-deep mb-3">
              Bestånd
            </h3>
            <dl className="space-y-2 font-sans text-[14px]">
              <Stat label="Kunder" value={s.customerCount.toString()} />
              <Stat label="Produkter publicerade" value={s.productCount.toString()} />
              <Stat label="Ordrar totalt (alla år)" value={s.totalOrdersAllTime.toString()} />
            </dl>
          </div>
        </aside>
      </div>
    </>
  );
}

function Kpi({
  label,
  value,
  delta,
  accent,
}: {
  label: string;
  value: string;
  delta?: number | null;
  accent?: boolean;
}) {
  const isPositive = (delta ?? 0) >= 0;
  return (
    <div
      className={`bg-surface-alt rounded-2xl p-5 border ${
        accent ? "border-accent" : "border-border"
      }`}
    >
      <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-ink-mute font-semibold">
        {label}
      </p>
      <p className="mt-1.5 font-display text-3xl font-medium tracking-tight text-primary-deep">
        {value}
      </p>
      {delta !== undefined && delta !== null && (
        <p
          className={`mt-1 font-sans text-[12px] font-semibold ${
            isPositive ? "text-accent-deep" : "text-[#B5523B]"
          }`}
        >
          {isPositive ? "↑" : "↓"} {Math.abs(delta)} % vs föregående månad
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-ink-body">
      <dt>{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

function HealthRow({
  color,
  label,
  count,
  total,
}: {
  color: string;
  label: string;
  count: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <li className="flex items-center gap-2.5 text-ink-body">
      <span aria-hidden className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
      <span className="flex-1">{label}</span>
      <span className="font-semibold tabular-nums">{count}</span>
      <span className="text-ink-mute tabular-nums text-[12px] min-w-[36px] text-right">
        {pct} %
      </span>
    </li>
  );
}
