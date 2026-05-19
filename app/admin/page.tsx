import Link from "next/link";
import { DAreaChart } from "@/components/admin/d-area-chart";
import { OverviewPackTable } from "@/components/admin/overview-pack-table";
import { formatPriceSEK } from "@/lib/format";
import {
  getDashboardStats,
  getDailyMetrics,
  getPackQueue,
  getBestSellers,
} from "@/lib/admin/stats";
import { getAdminBadges } from "@/lib/admin/badges";
import { getPlausibleSnapshot } from "@/lib/integrations/plausible";
import { requireTenantRole } from "@/lib/admin/guard";

/**
 * Admin overview ("Översikt") — Direction D composition, Phase 1 data.
 *
 * Order per the Direction D shell spec: mono date · serif greeting ·
 * hero numeric + chart · KPI strip · Att packa · Lågt lager +
 * Bästsäljare. Every figure is real data (getDashboardStats /
 * getPackQueue / getBestSellers / getDailyMetrics). The only mockup
 * metric still absent is "Besök/konv." — it needs the Plausible Stats
 * API (Phase 2), so the strip is 4-up until that lands.
 */

const eyebrowDateFmt = new Intl.DateTimeFormat("sv-SE", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function AdminOverview() {
  const admin = await requireTenantRole("admin");
  const [s, badges, pack, bestSellers, daily, visits] =
    await Promise.all([
      getDashboardStats(),
      getAdminBadges(admin.tenantId),
      getPackQueue(8),
      getBestSellers(7, 4),
      getDailyMetrics(30),
      // Isolated from the DB stats: a Plausible outage degrades the
      // "Besök" KPI to "—", it never breaks the dashboard.
      getPlausibleSnapshot(),
    ]);
  const now = new Date();
  const firstName = (admin.firstName || admin.name || "Adrian").split(/\s+/)[0];
  const hour = now.getHours();
  const greeting =
    hour < 11 ? "God morgon" : hour < 18 ? "God eftermiddag" : "God kväll";

  // Hero — today vs the same weekday last week.
  const todayDeltaAbs = s.revenueToday - s.revenueSameWeekdayLastWeek;
  const todayDeltaPct =
    s.revenueSameWeekdayLastWeek > 0
      ? Math.round((todayDeltaAbs / s.revenueSameWeekdayLastWeek) * 100)
      : null;

  const ordersDelta =
    s.paidOrdersPrevMonth > 0
      ? Math.round(
          ((s.paidOrdersThisMonth - s.paidOrdersPrevMonth) /
            s.paidOrdersPrevMonth) *
            100
        )
      : null;
  const aov =
    s.paidOrdersThisMonth > 0 ? s.revenueThisMonth / s.paidOrdersThisMonth : 0;
  const newCustDelta =
    s.newCustomersPrev > 0
      ? Math.round(
          ((s.newCustomers - s.newCustomersPrev) / s.newCustomersPrev) * 100
        )
      : null;

  // Besök / konv. — Plausible visitors today + today's conversion
  // (paid orders ÷ visitors). `visits === null` = not configured or
  // API down → KPI shows "—". Zero visitors → "0" with no conv. %
  // (no division-by-zero theatre).
  const visitsToday = visits?.visitorsToday ?? null;
  const conversionPct =
    visitsToday && visitsToday > 0
      ? (s.paidOrdersToday / visitsToday) * 100
      : null;
  const visitsSub =
    visits === null
      ? "ej anslutet"
      : conversionPct !== null
        ? `${conversionPct.toLocaleString("sv-SE", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          })} % konv.`
        : "idag";

  // Honest todo summary line under the greeting.
  const summaryParts: string[] = [];
  if (pack.total > 0) summaryParts.push(`${pack.total} att packa`);
  if (badges.productsLowStock > 0)
    summaryParts.push(`${badges.productsLowStock} produkter behöver inköp`);
  if (badges.returnsToProcess > 0)
    summaryParts.push(`${badges.returnsToProcess} returer i kö`);
  if (badges.reviewsToModerate > 0)
    summaryParts.push(`${badges.reviewsToModerate} recensioner att granska`);
  const summary =
    summaryParts.length > 0
      ? summaryParts.join(" · ")
      : "Inget kräver din uppmärksamhet just nu — lugnt och fint.";

  const maxUnits = Math.max(1, ...bestSellers.map((b) => b.units));

  return (
    <div className="flex flex-col gap-8">
      {/* ── Greeting ─────────────────────────────────────────────── */}
      <header>
        <p className="d-eyebrow">{eyebrowDateFmt.format(now)}</p>
        <h1 className="d-title mt-2.5">
          {greeting},{" "}
          <span className="d-display-italic text-[var(--d-ink-3)]">
            {firstName}
          </span>
        </h1>
        <p className="mt-2.5 font-sans text-body text-[var(--d-ink-2)]">
          {summary}
        </p>
      </header>

      {/* ── Hero numeric + chart ─────────────────────────────────── */}
      {/* No top border here — the mockup separates the greeting from
          the hero numeric with whitespace only. The first horizontal
          rule is on the KPI strip (hero → KPI), not greeting → hero. */}
      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,360px)_1fr] gap-8 lg:gap-0 items-end">
        <div className="lg:pr-12">
          <p className="d-eyebrow">Intäkter · idag</p>
          <p className="d-hero d-num mt-2">
            <Stat value={formatPriceSEK(s.revenueToday)} />
          </p>
          <div className="mt-3 flex items-center gap-2.5">
            {todayDeltaPct !== null && (
              <span
                className={`d-pill ${
                  todayDeltaPct >= 0 ? "d-pill-success" : "d-pill-danger"
                }`}
              >
                {todayDeltaPct >= 0 ? "↑" : "↓"} {Math.abs(todayDeltaPct)}%
              </span>
            )}
            <span className="font-mono text-caption text-[var(--d-ink-3)] tabular-nums">
              {todayDeltaAbs >= 0 ? "+" : "−"}
              {formatPriceSEK(Math.abs(todayDeltaAbs))} vs samma dag förra
              veckan
            </span>
          </div>
        </div>
        <div className="min-w-0 lg:border-l lg:border-[var(--d-line)] lg:pl-12">
          <DAreaChart
            data={daily.revenue}
            height={96}
            ariaLabel="Intäkter senaste 30 dagarna"
          />
          <div className="mt-1.5 flex justify-between font-mono text-micro tracking-[0.12em] uppercase text-[var(--d-muted)]">
            <span>30d</span>
            <span>23d</span>
            <span>16d</span>
            <span>9d</span>
            <span>idag</span>
          </div>
        </div>
      </section>

      {/* ── KPI strip — 5-up (Direction D rule: 5-up by default) ── */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 border-t border-[var(--d-line)] divide-y sm:divide-y-0 sm:divide-x divide-[var(--d-line-soft)]">
        <Kpi
          label="Betalda ordrar"
          value={s.paidOrdersThisMonth.toLocaleString("sv-SE")}
          delta={ordersDelta}
          sub="denna månad"
        />
        <Kpi
          label="Snittordervärde"
          value={aov > 0 ? formatPriceSEK(aov) : "—"}
          delta={null}
          sub={`${s.paidOrdersThisMonth} ordrar`}
        />
        <Kpi
          label="Besök"
          value={
            visitsToday !== null ? visitsToday.toLocaleString("sv-SE") : "—"
          }
          delta={null}
          sub={visitsSub}
        />
        <Kpi
          label="Nya kunder"
          value={s.newCustomers.toLocaleString("sv-SE")}
          delta={newCustDelta}
          sub="rull. 30 d"
        />
        <Kpi
          label="Återköpsfrekvens"
          value={`${s.repurchaseRate} %`}
          delta={null}
          sub={`${s.repurchaseActiveCustomers} aktiva · 90 d`}
        />
      </section>

      {/* ── Att packa ────────────────────────────────────────────── */}
      <DSection
        title="Att packa"
        hint={
          pack.total === 0
            ? "allt skickat"
            : pack.oldestAgeHours !== null
              ? `${pack.total} ${pack.total === 1 ? "order" : "ordrar"} · äldsta sedan ${pack.oldestAgeHours} ${
                  pack.oldestAgeHours === 1 ? "timme" : "timmar"
                }`
              : `${pack.total} ${pack.total === 1 ? "order" : "ordrar"}`
        }
        cta={{ href: "/admin/packlista", label: "Öppna packlista" }}
      >
        <OverviewPackTable rows={pack.rows} />
        {pack.total > pack.rows.length && (
          <p className="d-hint mt-3 pl-1">
            Visar {pack.rows.length} av {pack.total} — se hela kön i
            packlistan.
          </p>
        )}
      </DSection>

      {/* ── Lågt lager + Bästsäljare ─────────────────────────────── */}
      <div className="grid grid-cols-1 min-[1080px]:grid-cols-2 gap-8">
        <DSection
          title="Lågt lager"
          hint={`${s.lowStock.length} under påfyllningsgräns`}
          cta={{ href: "/admin/lager", label: "Till lager" }}
        >
          {s.lowStock.length === 0 ? (
            <p className="d-hint py-6">
              Inga publicerade produkter under tröskeln.
            </p>
          ) : (
            <ul>
              {s.lowStock.map((p, i) => (
                <li
                  key={`${p.kind}-${p.sku}-${i}`}
                  className="border-b border-[var(--d-line-soft)] last:border-0"
                >
                  <Link
                    href={`/admin/produkter/${p.slug}`}
                    className="flex items-center gap-3 min-h-[38px] py-1.5 hover:bg-[var(--d-surface)] -mx-1 px-1 rounded-[4px] transition-colors"
                  >
                    <span
                      aria-hidden
                      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        p.stock === 0
                          ? "bg-[var(--d-danger)]"
                          : "bg-[var(--d-warn)]"
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-sans text-small text-[var(--d-ink)] truncate">
                        {p.name}
                      </span>
                      <span className="block font-mono text-micro text-[var(--d-ink-3)] tabular-nums">
                        {p.sku}
                      </span>
                    </span>
                    <span
                      className={`d-pill ${
                        p.stock === 0 ? "d-pill-danger" : "d-pill-warn"
                      }`}
                    >
                      {p.stock === 0 ? "Slut" : `${p.stock} kvar`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DSection>

        <DSection
          title="Bästsäljare"
          hint="senaste 7 dagar"
          cta={{ href: "/admin/produkter", label: "Alla produkter" }}
        >
          {bestSellers.length === 0 ? (
            <p className="d-hint py-6">
              Inga sålda enheter de senaste 7 dagarna.
            </p>
          ) : (
            <ul>
              {bestSellers.map((b, i) => (
                <li
                  key={b.productId}
                  className="border-b border-[var(--d-line-soft)] last:border-0"
                >
                  <Link
                    href={b.slug ? `/admin/produkter/${b.slug}` : "/admin/produkter"}
                    className="flex items-center gap-3 h-9 hover:bg-[var(--d-surface)] -mx-1 px-1 rounded-[4px] transition-colors"
                  >
                    <span className="font-mono text-micro text-[var(--d-muted)] tabular-nums w-[18px] flex-shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      aria-hidden
                      className="w-2.5 h-2.5 rounded-full bg-[var(--d-accent-soft)] border border-[var(--d-accent)]/30 flex-shrink-0"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-sans text-small text-[var(--d-ink)] truncate">
                        {b.name}
                      </span>
                      {b.category && (
                        <span className="block font-mono text-micro text-[var(--d-ink-3)] truncate">
                          {b.category}
                        </span>
                      )}
                    </span>
                    {/* mini bar — share of the top seller's units */}
                    <span
                      aria-hidden
                      className="hidden sm:block w-[64px] h-[3px] rounded-full bg-[var(--d-line-soft)] flex-shrink-0 overflow-hidden"
                    >
                      <span
                        className="block h-full bg-[var(--d-accent)] rounded-full"
                        style={{ width: `${(b.units / maxUnits) * 100}%` }}
                      />
                    </span>
                    <span className="font-sans text-small font-medium text-[var(--d-ink)] tabular-nums w-[36px] text-right flex-shrink-0">
                      {b.units}
                    </span>
                    <span
                      className={`font-mono text-micro tabular-nums w-[44px] text-right flex-shrink-0 ${
                        b.deltaPct === null
                          ? "text-[var(--d-muted)]"
                          : b.deltaPct >= 0
                            ? "text-[var(--d-success)]"
                            : "text-[var(--d-danger)]"
                      }`}
                    >
                      {b.deltaPct === null
                        ? "ny"
                        : `${b.deltaPct >= 0 ? "+" : ""}${b.deltaPct}%`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DSection>
      </div>
    </div>
  );
}

/* ── Direction D primitives ───────────────────────────────────────── */

/**
 * Renders a formatted stat with its trailing unit (" kr" / " %") split
 * out into `.d-unit` — smaller, italic serif, ink-3 (Direction D rule
 * ix + the hero "italic unit in Ink 3" spec). Plain numbers ("2 788")
 * and the em-dash placeholder pass through untouched.
 */
function Stat({ value }: { value: string }) {
  let num = value;
  let unit = "";
  if (value.endsWith(" kr")) {
    num = value.slice(0, -3);
    unit = "kr";
  } else if (value.endsWith(" %")) {
    num = value.slice(0, -2);
    unit = "%";
  }
  return (
    <>
      {num}
      {unit && <span className="d-unit">&nbsp;{unit}</span>}
    </>
  );
}

function Kpi({
  label,
  value,
  delta,
  sub,
}: {
  label: string;
  value: string;
  delta: number | null;
  sub: string;
}) {
  return (
    <div className="py-4 lg:px-6 lg:first:pl-0">
      <p className="d-eyebrow">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="d-kpi d-num">
          <Stat value={value} />
        </span>
        {delta !== null && (
          <span
            className={`font-mono text-micro font-semibold tabular-nums ${
              delta >= 0
                ? "text-[var(--d-success)]"
                : "text-[var(--d-danger)]"
            }`}
          >
            {delta >= 0 ? "+" : ""}
            {delta}%
          </span>
        )}
      </div>
      <p className="mt-1 font-mono text-micro text-[var(--d-ink-3)]">{sub}</p>
    </div>
  );
}

function DSection({
  title,
  hint,
  cta,
  children,
}: {
  title: string;
  hint?: string;
  cta?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    // Divider is the title's BOTTOM border — it sits under the title,
    // above the content (mockup pattern), not as a section-top rule.
    // Section separation from the block above is whitespace only.
    <section>
      <div className="flex items-baseline justify-between gap-4 pb-2 mb-2 border-b border-[var(--d-line)]">
        <div className="flex items-baseline gap-2.5 min-w-0">
          <h2 className="d-section-title">{title}</h2>
          {hint && <span className="d-hint truncate">{hint}</span>}
        </div>
        {cta && (
          <Link
            href={cta.href}
            className="font-sans text-small font-medium text-[var(--d-ink-2)] hover:text-[var(--d-accent)] transition-colors whitespace-nowrap"
          >
            {cta.label} →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
