import type { ReactNode } from "react";

export type AdminCrumb = { label: string; href?: string };

/**
 * Shared page header for every /admin/* surface. Keeps the eyebrow / display
 * heading / subtitle / breadcrumb stack consistent so the dashboard reads as
 * one product instead of N independent pages with bespoke headers.
 *
 * Stripe-inspired shape:
 *   - `metric` renders inline with the title (e.g. "Balances $663.74"),
 *     so the headline number IS part of the page title rather than a
 *     separate card below.
 *   - `actions` lands on the right side of the title row — use for primary
 *     actions like "Skapa ny", "Exportera", filters. Multiple buttons OK.
 *   - `quickActions` is the row below the subtitle — wider button row for
 *     "Add funds / Manage payouts / Add settlement currency"-style primary
 *     verbs (Stripe's pattern on /balances). Less common; omit when the
 *     page is read-mostly.
 *
 * Don't put save state in any of these slots — that's a sticky footer
 * concern, not a header concern.
 */
export function AdminPageHeader({
  eyebrow,
  title,
  metric,
  subtitle,
  actions,
  quickActions,
}: {
  eyebrow?: string;
  title: string;
  /** Inline metric next to the title (e.g. "$663.74", "5 ordrar"). */
  metric?: string;
  subtitle?: ReactNode;
  /** @deprecated Breadcrumbs now live in the admin layout
   *  (`<AdminBreadcrumbs />`) and are derived from `usePathname()`. The
   *  prop is kept so existing callsites don't break; the value is
   *  ignored. Remove on the next sweep. */
  crumbs?: AdminCrumb[];
  /** Right-side action buttons aligned with the title row. */
  actions?: ReactNode;
  /** Wider primary-verb button row below the subtitle. */
  quickActions?: ReactNode;
  size?: "lg" | "xl";
}) {
  return (
    <header className="mb-7">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="min-w-0">
          {/* Direction D rule iv — open with a mono eyebrow, then an
              Instrument Serif title. Serif is reserved for this one
              page-title moment + a single hero numeric; never on
              section titles or controls. */}
          {eyebrow && (
            <p className="d-eyebrow mb-2">{eyebrow}</p>
          )}
          {/* Page title = the single serif "page title" role (42 / lh 1
              / −0.015em), exact per the Direction D type table. The
              `size` prop is retained for API back-compat but no longer
              varies the type — Direction D has one page-title spec. */}
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h1 className="d-title">{title}</h1>
            {metric && (
              <span className="d-kpi d-num text-[var(--d-ink-3)]">
                {metric}
              </span>
            )}
          </div>
          {subtitle && (
            <div className="mt-2.5 font-sans text-body leading-[1.45] text-[var(--d-ink-2)] max-w-[64ch]">
              {subtitle}
            </div>
          )}
        </div>
        {actions && <div className="flex-shrink-0">{actions}</div>}
      </div>
      {quickActions && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {quickActions}
        </div>
      )}
    </header>
  );
}
