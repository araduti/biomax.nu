"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import { bulkUpdateOrderStatus } from "@/lib/admin/order-actions";
import { formatPriceSEK } from "@/lib/format";
import type { PackQueueRow } from "@/lib/admin/stats";

/**
 * Översikt "Att packa" table — Direction D.
 *
 * The real packing queue (oldest PAID, no tracking yet), with:
 *  - row checkboxes + a sticky bulk "Markera som skickade" toolbar
 *    (reuses the `bulkUpdateOrderStatus` server action already built
 *    for the ordrar list)
 *  - payment-method legend dot per row. PaymentProvider is the real
 *    enum (KLARNA | STRIPE | MANUAL); the dot is legend-only colour,
 *    never a fill/badge (Direction D rule xi).
 *
 * 36 px rows, mono IDs, paired status pill, ink-on-cream — no card.
 */

const PAYMENT_LEGEND: Record<
  PackQueueRow["paymentProvider"],
  { label: string; dot: string }
> = {
  // Legend dots only — these three colours are the *one* sanctioned
  // place non-token colour appears (rule xi). Klarna pink, Stripe/Kort
  // blue, Manuell neutral ink.
  KLARNA: { label: "Klarna", dot: "#E8A1C4" },
  STRIPE: { label: "Kort", dot: "#6B8AC4" },
  MANUAL: { label: "Manuell", dot: "var(--d-muted)" },
};

const dateFmt = new Intl.DateTimeFormat("sv-SE", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** "lina.bergstrom@gmail.com" → "lina.b@…" — the mockup's compact
 *  email form: local part clipped to 6 chars, host elided. */
function shortEmail(email: string): string {
  const [local = ""] = email.split("@");
  const clipped =
    local.length > 6 ? `${local.slice(0, 6)}` : local;
  return `${clipped}@…`;
}

export function OverviewPackTable({ rows }: { rows: PackQueueRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const [flash, setFlash] = useState<string | null>(null);

  function toggle(orderNumber: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(orderNumber)) n.delete(orderNumber);
      else n.add(orderNumber);
      return n;
    });
  }

  function bulkFulfill() {
    const numbers = [...selected];
    if (numbers.length === 0) return;
    setFlash(null);
    start(async () => {
      const r = await bulkUpdateOrderStatus(numbers, "FULFILLED");
      if (!r.ok) return;
      setFlash(
        `${r.updated} markerade som skickade${
          r.skipped > 0 ? ` · ${r.skipped} hoppade över` : ""
        }`
      );
      setSelected(new Set());
      router.refresh();
      setTimeout(() => setFlash(null), 3500);
    });
  }

  if (rows.length === 0) {
    return (
      <p className="d-hint py-6">
        Inga ordrar väntar på packning — allt är skickat.
      </p>
    );
  }

  return (
    <>
      {flash && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-[60px] right-7 z-30 px-3 py-1.5 rounded-[5px] bg-[var(--d-ink)] text-[var(--d-bg)] font-mono text-caption font-medium shadow-sm"
        >
          {flash}
        </div>
      )}

      {/* The "line above the column headers" is the DSection title's
          bottom border (one line, not two). Here we only draw the line
          BELOW the column-header row. No select-all checkbox in the
          header — the first cell is an empty 28px spacer aligned with
          the body checkboxes. */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--d-line)]">
              <th className="w-[28px] py-1.5" aria-hidden />
              {["Order", "Kund", "Tid", "Status", "Betalning", "Belopp"].map(
                (h, i) => (
                  <th
                    key={h}
                    className={`d-eyebrow py-1.5 ${
                      i === 5 ? "text-right pr-1" : "text-left"
                    }`}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => {
              const pay = PAYMENT_LEGEND[o.paymentProvider];
              const isSel = selected.has(o.orderNumber);
              return (
                <tr
                  key={o.id}
                  className={`border-b border-[var(--d-line-soft)] last:border-0 ${
                    isSel ? "bg-[var(--d-surface)]" : ""
                  }`}
                >
                  <td className="py-0">
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => toggle(o.orderNumber)}
                      aria-label={`Markera ${o.orderNumber}`}
                      className="w-3.5 h-3.5 align-middle"
                    />
                  </td>
                  <td className="py-0">
                    <Link
                      href={`/admin/ordrar/${o.orderNumber}`}
                      className="flex items-center h-9 font-mono text-caption font-medium text-[var(--d-ink)] hover:text-[var(--d-accent)] transition-colors"
                    >
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="py-0">
                    <span className="font-sans text-small text-[var(--d-ink)] truncate inline-block max-w-[220px] align-middle">
                      {o.customerName}
                    </span>
                    {/* Email truncated as serif-italic metadata in
                        ink-3 (Direction D pitfall guidance: "truncate
                        emails with serif italic + …"). */}
                    <span className="ml-1.5 font-display italic text-small text-[var(--d-ink-3)]">
                      · {shortEmail(o.email)}
                    </span>
                  </td>
                  <td className="py-0">
                    <span className="font-mono text-caption text-[var(--d-ink-3)] tabular-nums whitespace-nowrap">
                      {dateFmt.format(o.createdAt)}
                    </span>
                  </td>
                  <td className="py-0">
                    <span className="d-pill d-pill-warn">Att packa</span>
                  </td>
                  <td className="py-0">
                    <span className="inline-flex items-center gap-1.5 font-sans text-small text-[var(--d-ink-2)]">
                      <span
                        aria-hidden
                        className="w-[6px] h-[6px] rounded-full flex-shrink-0"
                        style={{ background: pay.dot }}
                      />
                      {pay.label}
                    </span>
                  </td>
                  <td className="py-0 pr-1 text-right">
                    <span className="font-sans text-small font-medium text-[var(--d-ink)] tabular-nums whitespace-nowrap">
                      {formatPriceSEK(o.totalAmount)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected.size > 0 && (
        <div
          role="region"
          aria-label="Markerade ordrar"
          className="fixed bottom-0 left-0 lg:left-[224px] right-0 z-30 bg-[var(--d-ink)] text-[var(--d-bg)] px-5 md:px-7 py-2.5 flex items-center gap-4"
        >
          <span className="font-mono text-caption font-medium tabular-nums">
            {selected.size} valda
          </span>
          <button
            type="button"
            onClick={bulkFulfill}
            disabled={pending}
            data-admin-compact
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-[5px] bg-[var(--d-bg)] text-[var(--d-ink)] font-sans text-small font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Check size={13} strokeWidth={2.25} aria-hidden />
            Markera som skickade
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            disabled={pending}
            data-admin-compact
            className="ml-auto font-sans text-small text-[var(--d-bg)]/70 hover:text-[var(--d-bg)] transition-colors"
          >
            Avbryt
          </button>
        </div>
      )}
    </>
  );
}
