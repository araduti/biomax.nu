"use client";

import { useRef, useState, useTransition, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, X } from "lucide-react";
import type { OrderStatus } from "@prisma/client";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import {
  updateOrderStatus,
  bulkUpdateOrderStatus,
} from "@/lib/admin/order-actions";
import { formatPriceSEK } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Client-rendered order list for `/admin/ordrar`. Wraps the rows in
 * three interaction primitives the server-rendered version couldn't
 * provide:
 *
 *  1. **Hover quick-action** — PAID orders surface a "✓ Skicka" button
 *     on hover (and on keyboard focus-within) that bulk-walks the row
 *     to FULFILLED without leaving the list. FULFILLED orders surface
 *     a small "↩ Återöppna" reverse. Other statuses get no inline
 *     action — they have no idiomatic next-step from the list.
 *  2. **Keyboard navigation** — `ArrowUp` / `ArrowDown` (and `j` / `k`
 *     for vim users) walk focus between row links; `Enter` opens the
 *     focused row's detail page. The leading checkbox is part of the
 *     natural tab order — tab into it from the link, `Space` to toggle.
 *  3. **Bulk selection** — leading checkbox per row + sticky bottom
 *     toolbar that appears when ≥1 row is selected, offering bulk
 *     status transitions ("Markera valda som skickade") and a clear
 *     button.
 *
 * The Link wrapping the row's data cells is a sibling of the
 * checkbox and quick-action button (not nested inside them) — keeps
 * the row a single tab stop and avoids nested-interactive
 * accessibility issues.
 */

export type OrdrarListRow = {
  id: string;
  orderNumber: string;
  email: string;
  status: OrderStatus;
  totalAmount: string;
  createdAt: Date;
  legacySource: string | null;
  itemCount: number;
};

const dateFmt = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function OrdrarList({ orders }: { orders: OrdrarListRow[] }) {
  const router = useRouter();
  const listRef = useRef<HTMLUListElement>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [flash, setFlash] = useState<string | null>(null);

  function toggle(orderNumber: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(orderNumber)) next.delete(orderNumber);
      else next.add(orderNumber);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(orders.map((o) => o.orderNumber)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  /**
   * Move keyboard focus between row links. Triggered by ArrowDown,
   * ArrowUp, j, k pressed while focus is inside the list.
   */
  function onListKeyDown(e: KeyboardEvent<HTMLUListElement>) {
    const root = listRef.current;
    if (!root) return;
    const target = e.target as HTMLElement;
    const currentLi = target.closest<HTMLLIElement>("li[data-row]");
    if (!currentLi) return;

    const isDown = e.key === "ArrowDown" || e.key === "j";
    const isUp = e.key === "ArrowUp" || e.key === "k";
    if (!isDown && !isUp) return;
    e.preventDefault();

    const sibling = (
      isDown ? currentLi.nextElementSibling : currentLi.previousElementSibling
    ) as HTMLLIElement | null;
    if (!sibling) return;
    const nextLink = sibling.querySelector<HTMLAnchorElement>("a[data-row-link]");
    nextLink?.focus();
  }

  async function quickFulfill(orderNumber: string) {
    setFlash(null);
    startTransition(async () => {
      const r = await updateOrderStatus(orderNumber, "FULFILLED");
      if (!r.ok) {
        setFlash(`✕ ${r.error}`);
        return;
      }
      setFlash(`✓ ${orderNumber} markerad som skickad`);
      router.refresh();
      setTimeout(() => setFlash(null), 2500);
    });
  }

  async function quickReopen(orderNumber: string) {
    // FULFILLED → REFUNDED is the only allowed reverse. We're surfacing
    // it as "Återöppna" because that's the operator's mental model;
    // the actual transition leaves the order REFUNDED (accounting-clean).
    setFlash(null);
    startTransition(async () => {
      const r = await updateOrderStatus(orderNumber, "REFUNDED");
      if (!r.ok) {
        setFlash(`✕ ${r.error}`);
        return;
      }
      setFlash(`✓ ${orderNumber} återbetald`);
      router.refresh();
      setTimeout(() => setFlash(null), 2500);
    });
  }

  async function bulkFulfill() {
    const numbers = orders
      .filter((o) => selected.has(o.orderNumber) && o.status === "PAID")
      .map((o) => o.orderNumber);
    if (numbers.length === 0) {
      setFlash("Inga valda ordrar med status Betald.");
      return;
    }
    setFlash(null);
    startTransition(async () => {
      const r = await bulkUpdateOrderStatus(numbers, "FULFILLED");
      if (!r.ok) return;
      setFlash(
        `✓ ${r.updated} markerade som skickade${
          r.skipped > 0 ? ` · ${r.skipped} hoppade över` : ""
        }`
      );
      clearSelection();
      router.refresh();
      setTimeout(() => setFlash(null), 3500);
    });
  }

  const allSelected = orders.length > 0 && selected.size === orders.length;
  const someSelected = selected.size > 0 && !allSelected;

  return (
    <>
      {/* Sticky flash toast — surfaces inline confirmation when a quick
          action or bulk operation finishes. Hidden when no message. */}
      {flash && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-20 right-6 z-30 px-4 py-2 rounded-lg bg-primary-deep text-surface font-sans text-[13.5px] font-semibold shadow-lg"
        >
          {flash}
        </div>
      )}

      <ul
        ref={listRef}
        onKeyDown={onListKeyDown}
        className="divide-y divide-border-soft"
      >
        {/* "Select-all" header row — shown only when the list is
            non-empty. Checking it selects every visible row; partial
            selection renders as indeterminate. */}
        {orders.length > 0 && (
          <li className="bg-surface-warm/30">
            <label className="flex items-center gap-3 px-5 py-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected;
                }}
                onChange={() => (allSelected ? clearSelection() : selectAll())}
                className="w-4 h-4"
                aria-label="Markera alla synliga ordrar"
              />
              <span className="font-sans text-[12px] text-ink-mute">
                {selected.size > 0
                  ? `${selected.size} valda`
                  : `${orders.length} ${orders.length === 1 ? "order" : "ordrar"}`}
              </span>
            </label>
          </li>
        )}

        {orders.map((o) => {
          const isSelected = selected.has(o.orderNumber);
          return (
            <li
              key={o.id}
              data-row
              className={cn(
                "group relative",
                isSelected && "bg-surface-warm/50"
              )}
            >
              <div className="grid grid-cols-[36px_1.4fr_2fr_auto_auto_auto] items-center gap-4 px-5 py-2.5 min-h-[44px] hover:bg-surface-warm transition-colors">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(o.orderNumber)}
                  aria-label={`Markera order ${o.orderNumber}`}
                  className="w-4 h-4 justify-self-start"
                />
                {/* The Link covers the 5 data cells via CSS Grid's
                    `display: contents` — children of the link become
                    direct grid items. This way the link is a single
                    tab stop and a single click target without nesting
                    interactive elements inside an `<a>`. */}
                <Link
                  href={`/admin/ordrar/${o.orderNumber}`}
                  data-row-link
                  className="contents focus-visible:outline-none"
                >
                  <span className="min-w-0">
                    <span className="block font-sans text-[13.5px] font-semibold text-primary-deep">
                      {o.orderNumber}
                    </span>
                    <span className="block font-sans text-[12.5px] text-ink-mute mt-0.5">
                      {dateFmt.format(o.createdAt)}
                      {o.legacySource ? " · arkiverad" : ""}
                    </span>
                  </span>
                  <span className="font-sans text-[14px] text-ink-body truncate">
                    {o.email}
                  </span>
                  <span className="font-sans text-[12.5px] text-ink-mute whitespace-nowrap tabular-nums">
                    {o.itemCount} st
                  </span>
                  <OrderStatusBadge status={o.status} />
                  <span className="font-sans text-[13.5px] font-semibold text-primary-deep tabular-nums whitespace-nowrap min-w-[80px] text-right">
                    {formatPriceSEK(o.totalAmount)}
                  </span>
                </Link>
              </div>

              {/* Hover-revealed quick action — sits in the right gutter
                  overlapping the price column. Visible on row hover and
                  whenever any element inside the row has focus, so
                  keyboard users can also reach it. */}
              {(o.status === "PAID" || o.status === "FULFILLED") && (
                <div className="absolute inset-y-0 right-5 flex items-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (o.status === "PAID") quickFulfill(o.orderNumber);
                      else quickReopen(o.orderNumber);
                    }}
                    disabled={pending}
                    data-admin-compact
                    className={cn(
                      "inline-flex items-center gap-1.5 h-8 px-3 rounded-md font-sans text-[12.5px] font-semibold shadow-sm transition-colors disabled:opacity-50",
                      o.status === "PAID"
                        ? "bg-primary-deep text-surface hover:bg-primary"
                        : "bg-surface border border-border text-ink-body hover:bg-surface-warm"
                    )}
                  >
                    {o.status === "PAID" ? (
                      <>
                        <Check size={13} strokeWidth={2.25} aria-hidden />
                        Skicka
                      </>
                    ) : (
                      <>
                        <X size={13} strokeWidth={2.25} aria-hidden />
                        Återbetala
                      </>
                    )}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Bulk-action toolbar — sticky bottom bar that slides in when
          one or more rows are selected. Offset is the expanded
          sidebar width (280 px) so the toolbar never overlaps the
          sidebar when it's open; when the sidebar is collapsed to
          64 px there's a small cream-strip gap, which reads cleanly.
          Action set is minimal for now — bulk-fulfill is the main one
          a packer does daily. Add export / archive when those become
          actual needs. */}
      {selected.size > 0 && (
        <div
          role="region"
          aria-label="Markerade ordrar"
          className="fixed bottom-0 left-0 lg:left-[280px] right-0 z-30 bg-primary-deep text-surface px-5 md:px-10 py-3 flex items-center gap-4 shadow-[0_-6px_24px_rgba(15,32,44,0.18)]"
        >
          <span className="font-sans text-[13.5px] font-semibold">
            {selected.size} {selected.size === 1 ? "order" : "ordrar"} valda
          </span>
          <button
            type="button"
            onClick={bulkFulfill}
            disabled={pending}
            data-admin-compact
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-surface text-primary-deep font-sans text-[13px] font-semibold hover:bg-surface-warm transition-colors disabled:opacity-50"
          >
            <Check size={14} strokeWidth={2.25} aria-hidden />
            Markera som skickade
          </button>
          <button
            type="button"
            onClick={clearSelection}
            disabled={pending}
            data-admin-compact
            className="ml-auto inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-surface/80 hover:text-surface hover:bg-surface/10 font-sans text-[13px] font-semibold transition-colors"
          >
            Avbryt
          </button>
        </div>
      )}
    </>
  );
}
