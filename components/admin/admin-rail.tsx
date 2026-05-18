import type { ReactNode } from "react";

/**
 * Right-rail wrapper for peripheral page metadata.
 *
 * Use for sticky-sidebar style information that's secondary to the
 * page's main column: order detail's Kund/Adress/Betalning, customer
 * detail's adresser, integration status panels on /admin/seo, etc.
 *
 * Pair with a 2-col grid wrapper on the page:
 *
 *   <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
 *     <div>…main content…</div>
 *     <AdminRail>
 *       <AdminRail.Row label="Kund">…</AdminRail.Row>
 *       <AdminRail.Row label="Levereras till">…</AdminRail.Row>
 *     </AdminRail>
 *   </div>
 *
 * The bordered container has divide-y rows so each row reads as part of
 * the same panel, not as separate cards. Drop in any content per row;
 * eyebrow + optional right-side action come from `<AdminRail.Row>`.
 */
export function AdminRail({ children }: { children: ReactNode }) {
  return (
    <aside className="bg-surface-alt border border-border rounded-xl divide-y divide-border-soft self-start">
      {children}
    </aside>
  );
}

function Row({
  label,
  action,
  children,
}: {
  label: string;
  /** Optional right-side action (CopyButton, edit link, etc.). */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="p-5">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <h3 className="font-sans text-micro uppercase tracking-[0.16em] text-ink-mute font-semibold">
          {label}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

AdminRail.Row = Row;
