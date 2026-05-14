import Link from "next/link";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { formatPriceSEK } from "@/lib/format";
import { getDashboardStats } from "@/lib/admin/stats";
import { getAdminBadges } from "@/lib/admin/badges";
import { getRecentActivity } from "@/lib/admin/activity-feed";

const dateFmt = new Intl.DateTimeFormat("sv-SE", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const monthFmt = new Intl.DateTimeFormat("sv-SE", { month: "long" });

/**
 * Admin overview ("Översikt") — action-first.
 *
 * Answers "vad behöver jag göra?" before "hur går det?":
 *  1. Att göra nu — counts of items waiting on a human, each linked
 *     to the queue. Empty zone hides when nothing's pending.
 *  2. Denna månad — compact trend strip (revenue, orders, AOV). One
 *     row each; the old 4-card KPI wall wasted screen real estate
 *     compared to its signal.
 *  3. Senaste ordrar — five most recent non-legacy orders.
 *  4. Lågt lager — PUBLISHED products only, variant-aware. The
 *     previous query surfaced DRAFT items at 0 stock.
 *
 * Removed from this page:
 *  - Innehållshälsa (mixed product-SEO + kunskapsbank counts) → moved
 *    to /admin/seo and /admin/innehall.
 *  - Bestånd (total customers + lifetime orders) → /admin/rapporter.
 *  - The four big KPI cards at the top — replaced by the compact
 *    trend strip below.
 */
export default async function AdminOverview() {
  const [s, badges, activity] = await Promise.all([
    getDashboardStats(),
    getAdminBadges(),
    getRecentActivity(8),
  ]);
  const monthName = monthFmt.format(new Date());

  const revenueDelta =
    s.revenuePrevMonth > 0
      ? Math.round(
          ((s.revenueThisMonth - s.revenuePrevMonth) / s.revenuePrevMonth) *
            100
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

  const totalActions =
    badges.ordersToPack +
    badges.returnsToProcess +
    badges.reviewsToModerate +
    badges.productsLowStock;

  return (
    <>
      <AdminPageHeader
        eyebrow="Översikt"
        title={
          totalActions > 0
            ? `${totalActions} att hantera`
            : "Allt är under kontroll"
        }
        subtitle={
          totalActions > 0
            ? "Saker som väntar på dig nedan. Klicka på en rad för att gå direkt dit."
            : "Inget kräver din uppmärksamhet just nu — bra jobbat."
        }
      />

      {/* ── 1. ATT GÖRA NU ─────────────────────────────────────── */}
      {totalActions > 0 && (
        <section className="mb-12">
          <p className="font-sans text-[11px] uppercase tracking-[0.22em] font-semibold text-ink-soft mb-3">
            Att göra nu
          </p>
          <ul className="space-y-2">
            <ActionRow
              count={badges.ordersToPack}
              labelPlural="ordrar att packa"
              labelSingular="order att packa"
              href="/admin/packlista"
              cta="Öppna packlista"
            />
            <ActionRow
              count={badges.returnsToProcess}
              labelPlural="returer väntar på godkännande"
              labelSingular="retur väntar på godkännande"
              href="/admin/returer"
              cta="Granska returer"
            />
            <ActionRow
              count={badges.reviewsToModerate}
              labelPlural="recensioner att granska"
              labelSingular="recension att granska"
              href="/admin/recensioner"
              cta="Granska recensioner"
            />
            <ActionRow
              count={badges.productsLowStock}
              labelPlural="produkter låga i lagret"
              labelSingular="produkt låg i lagret"
              href="/admin/lager"
              cta="Visa lager"
            />
          </ul>
        </section>
      )}

      {/* ── 2. DENNA MÅNAD ─────────────────────────────────────── */}
      <section className="mb-12">
        <p className="font-sans text-[11px] uppercase tracking-[0.22em] font-semibold text-ink-soft mb-3">
          Denna månad · {monthName}
        </p>
        <dl className="bg-surface-alt border border-border rounded-2xl divide-y divide-border-soft">
          <TrendRow
            label="Intäkter"
            value={formatPriceSEK(s.revenueThisMonth)}
            delta={revenueDelta}
          />
          <TrendRow
            label="Betalda ordrar"
            value={s.paidOrdersThisMonth.toString()}
            delta={ordersDelta}
          />
          <TrendRow
            label="Snittordervärde"
            value={
              s.paidOrdersThisMonth > 0
                ? formatPriceSEK(s.revenueThisMonth / s.paidOrdersThisMonth)
                : "—"
            }
            delta={null}
          />
        </dl>
      </section>

      {/* ── 3 + 4. RECENT ORDERS + LOW STOCK ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <p className="font-sans text-[11px] uppercase tracking-[0.22em] font-semibold text-ink-soft">
              Senaste ordrar
            </p>
            <Link
              href="/admin/ordrar"
              className="font-sans text-[13px] font-semibold text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent"
            >
              Alla ordrar →
            </Link>
          </div>
          {s.recentOrders.length === 0 ? (
            <p className="font-sans text-[14px] text-ink-mute italic">
              Inga ordrar än.
            </p>
          ) : (
            <ul className="bg-surface-alt border border-border rounded-2xl divide-y divide-border-soft">
              {s.recentOrders.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/admin/ordrar/${o.orderNumber}`}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-4 hover:bg-surface-warm transition-colors min-h-[72px]"
                  >
                    <div className="min-w-0">
                      <p className="font-display text-[15px] font-medium text-primary-deep">
                        {o.orderNumber}
                      </p>
                      <p className="font-sans text-[13px] text-ink-mute truncate">
                        {o.email} · {dateFmt.format(o.createdAt)} ·{" "}
                        {o._count.items} st
                      </p>
                    </div>
                    <OrderStatusBadge status={o.status} />
                    <p className="font-display text-[15px] font-medium text-primary-deep tabular-nums whitespace-nowrap">
                      {formatPriceSEK(o.totalAmount.toString())}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="flex items-baseline justify-between mb-3">
            <p className="font-sans text-[11px] uppercase tracking-[0.22em] font-semibold text-ink-soft">
              Lågt lager
            </p>
            <Link
              href="/admin/lager"
              className="font-sans text-[13px] font-semibold text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent"
            >
              Visa lager →
            </Link>
          </div>
          {s.lowStock.length === 0 ? (
            <p className="font-sans text-[14px] text-ink-mute italic">
              Inga publicerade produkter under tröskeln.
            </p>
          ) : (
            <ul className="bg-surface-alt border border-border rounded-2xl divide-y divide-border-soft">
              {s.lowStock.map((p, i) => (
                <li key={`${p.kind}-${p.sku}-${i}`}>
                  <Link
                    href={`/admin/produkter/${p.slug}`}
                    className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-surface-warm transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-display text-[14.5px] font-medium text-primary-deep truncate">
                        {p.name}
                      </p>
                      <p className="font-sans text-[12.5px] text-ink-mute">
                        {p.sku}
                      </p>
                    </div>
                    <p
                      className={`font-display text-base font-semibold tabular-nums whitespace-nowrap ${
                        p.stock === 0 ? "text-[#B5523B]" : "text-[#8A5A2C]"
                      }`}
                    >
                      {p.stock === 0 ? "Slut" : `${p.stock} st`}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ── 5. Senaste aktivitet ──────────────────────────────── */}
      {activity.length > 0 && (
        <section className="mt-12">
          <p className="font-sans text-[11px] uppercase tracking-[0.22em] font-semibold text-ink-soft mb-3">
            Senaste aktivitet
          </p>
          <ul className="bg-surface-alt border border-border rounded-2xl divide-y divide-border-soft">
            {activity.map((row) => (
              <li
                key={row.id}
                className="px-5 py-3.5 grid grid-cols-[1fr_auto] items-baseline gap-4"
              >
                <p className="font-sans text-[14.5px] text-ink-body min-w-0">
                  <strong className="font-semibold text-primary-deep">
                    {row.actorName}
                  </strong>
                  : {row.actionLabel.toLowerCase()}
                  {row.entityLabel && (
                    <>
                      {" "}
                      <span className="text-ink-soft">·</span>{" "}
                      {row.entityHref ? (
                        <Link
                          href={row.entityHref}
                          className="text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent"
                        >
                          {row.entityLabel}
                        </Link>
                      ) : (
                        <span className="text-primary-deep">
                          {row.entityLabel}
                        </span>
                      )}
                    </>
                  )}
                </p>
                <p className="font-sans text-[12.5px] text-ink-mute whitespace-nowrap">
                  {dateFmt.format(row.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

/* ── Helpers ────────────────────────────────────────────────── */

function ActionRow({
  count,
  labelPlural,
  labelSingular,
  href,
  cta,
}: {
  count: number;
  labelPlural: string;
  labelSingular: string;
  href: string;
  cta: string;
}) {
  if (count === 0) return null;
  return (
    <li>
      <Link
        href={href}
        className="flex flex-wrap items-center gap-4 bg-surface-alt border border-border rounded-2xl px-5 py-4 hover:border-[#C68A4F]/60 hover:bg-[#C68A4F]/5 transition-colors min-h-[72px]"
      >
        <span className="inline-flex items-center justify-center min-w-[44px] h-11 px-3 rounded-full bg-[#C68A4F] text-surface font-display text-xl font-medium tabular-nums">
          {count}
        </span>
        <span className="flex-1 font-sans text-[15.5px] text-ink-body">
          {count === 1 ? labelSingular : labelPlural}
        </span>
        <span className="font-sans text-[13.5px] font-semibold text-primary-deep">
          {cta} →
        </span>
      </Link>
    </li>
  );
}

function TrendRow({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta: number | null;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-baseline gap-6 px-5 py-3.5">
      <dt className="font-sans text-[14.5px] text-ink-mute">{label}</dt>
      <dd className="font-display text-[20px] font-medium text-primary-deep tabular-nums">
        {value}
      </dd>
      <dd className="font-sans text-[13px] font-semibold tabular-nums w-[140px] text-right">
        {delta === null ? (
          <span className="text-ink-soft">—</span>
        ) : delta === 0 ? (
          <span className="text-ink-soft">oförändrat</span>
        ) : delta > 0 ? (
          <span className="text-accent-deep">↑ {delta} % vs förra</span>
        ) : (
          <span className="text-[#B5523B]">
            ↓ {Math.abs(delta)} % vs förra
          </span>
        )}
      </dd>
    </div>
  );
}
