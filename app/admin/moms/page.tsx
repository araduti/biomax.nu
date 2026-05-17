import { AdminPageHeader } from "@/components/admin/admin-page-header";

export const metadata = { title: "Momsrapport" };

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Mars",
  "April",
  "Maj",
  "Juni",
  "Juli",
  "Augusti",
  "September",
  "Oktober",
  "November",
  "December",
];

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/**
 * Admin landing for VAT (moms) reporting. Renders shortcut buttons for
 * "this month" / "last month" / "last quarter" plus a free-form date
 * picker that exports a CSV. The CSV itself comes from the route
 * handler at /api/admin/moms-export.
 *
 * No client JS — the form posts a GET, the route streams the file.
 */
export default function MomsReportPage() {
  const now = new Date();
  const thisMonthFrom = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-01`;

  // Last month: subtract 1 from the month, handle Jan rollover.
  const lastMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const lastMonthFrom = `${lastMonthDate.getUTCFullYear()}-${pad(lastMonthDate.getUTCMonth() + 1)}-01`;
  const lastMonthTo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  const lastMonthToStr = `${lastMonthTo.getUTCFullYear()}-${pad(lastMonthTo.getUTCMonth() + 1)}-${pad(lastMonthTo.getUTCDate())}`;

  // Last quarter: previous 3 calendar months.
  const lastQuarterStartMonth = now.getUTCMonth() - 3;
  const lastQuarterFromDate = new Date(Date.UTC(now.getUTCFullYear(), lastQuarterStartMonth, 1));
  const lastQuarterFrom = `${lastQuarterFromDate.getUTCFullYear()}-${pad(lastQuarterFromDate.getUTCMonth() + 1)}-01`;

  return (
    <>
      <AdminPageHeader
        eyebrow="Drift"
        title="Momsrapport"
        crumbs={[
          { label: "Drift", href: "/admin" },
          { label: "Momsrapport" },
        ]}
        subtitle="Exportera betalda/levererade ordrar per momssats för bokföringen. CSV importeras manuellt i Fortnox tills API-integrationen är på plats."
      />

      <div className="mb-8 flex flex-wrap gap-3">
        <a
          href={`/api/admin/moms-export?from=${thisMonthFrom}&to=${`${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}`}`}
          className="px-4 py-2 rounded-md border border-border bg-surface font-sans text-[13px] font-semibold text-ink-body hover:bg-surface-warm transition-colors"
        >
          Innevarande månad
        </a>
        <a
          href={`/api/admin/moms-export?from=${lastMonthFrom}&to=${lastMonthToStr}`}
          className="px-4 py-2 rounded-md border border-border bg-surface font-sans text-[13px] font-semibold text-ink-body hover:bg-surface-warm transition-colors"
        >
          {MONTH_NAMES[lastMonthDate.getUTCMonth()]} {lastMonthDate.getUTCFullYear()}
        </a>
        <a
          href={`/api/admin/moms-export?from=${lastQuarterFrom}&to=${`${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}`}`}
          className="px-4 py-2 rounded-md border border-border bg-surface font-sans text-[13px] font-semibold text-ink-body hover:bg-surface-warm transition-colors"
        >
          Senaste kvartalet
        </a>
      </div>

      <form
        method="get"
        action="/api/admin/moms-export"
        className="bg-surface-alt border border-border rounded-xl p-5 max-w-[640px]"
      >
        <p className="font-sans text-[14.5px] font-semibold text-primary-deep mb-3">
          Anpassad period
        </p>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <label className="font-sans text-[12.5px] text-ink-mute">
            Från
            <input
              type="date"
              name="from"
              required
              className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-surface font-sans text-[14px]"
            />
          </label>
          <label className="font-sans text-[12.5px] text-ink-mute">
            Till
            <input
              type="date"
              name="to"
              required
              className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-surface font-sans text-[14px]"
            />
          </label>
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-primary-deep text-surface font-sans text-[13px] font-semibold hover:bg-primary-deep/90 transition-colors"
          >
            Exportera CSV
          </button>
        </div>
        <p className="mt-3 font-sans text-[12px] text-ink-soft leading-relaxed">
          CSV innehåller en rad per order plus en summablock per momssats.
          Endast PAID + FULFILLED-ordrar tas med.
        </p>
      </form>
    </>
  );
}
