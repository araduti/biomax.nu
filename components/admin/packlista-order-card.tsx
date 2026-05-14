"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

/**
 * One order card on the packlista with "Bocka av"-checkboxes per row.
 *
 * State is purely client-side and persisted to `localStorage` keyed on
 * the orderItem id. Refreshing the page (the warehouse re-prints,
 * scrolls, opens another tab) doesn't lose progress, but we don't push
 * pack-state to the server — the canonical "this was actually packed"
 * signal is the admin marking the order as FULFILLED. Pack-off is just
 * a working aid.
 *
 * The whole card collapses (faded + checkmark in header) once every
 * line is ticked so the warehouse can scan a long page at a glance:
 * white card = still to pack, grey card with ✓ = done.
 */
const STORAGE_KEY = "biomax-packlista-checked";

type Line = {
  id: string;
  productName: string;
  productSku: string | null;
  quantity: number;
  imageUrl: string;
};

type OrderInput = {
  id: string;
  orderNumber: string;
  email: string;
  isSubscription: boolean;
  shippingAddress: {
    fullName: string;
    street: string;
    postalCode: string;
    city: string;
  } | null;
  items: Line[];
};

function readChecked(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function writeChecked(set: Set<string>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    /* quota / private mode */
  }
}

export function PacklistaOrderCard({ order }: { order: OrderInput }) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setChecked(readChecked());
    setHydrated(true);
  }, []);

  function toggle(itemId: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      writeChecked(next);
      return next;
    });
  }

  const allChecked =
    hydrated && order.items.length > 0 && order.items.every((it) => checked.has(it.id));
  const someChecked = hydrated && order.items.some((it) => checked.has(it.id));

  return (
    <section
      className={`bg-surface-alt border rounded-2xl p-5 md:p-6 transition-colors print:border-0 print:rounded-none print:p-0 print:mb-8 print:break-inside-avoid ${
        allChecked
          ? "border-accent-deep/30 bg-accent/[0.04]"
          : "border-border"
      }`}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-3 mb-4 pb-3 border-b border-border-soft">
        <div className="flex items-baseline gap-3">
          <p className="font-display text-lg md:text-xl font-medium text-primary-deep tracking-tight">
            {order.orderNumber}
          </p>
          {allChecked && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/15 text-accent-deep font-sans text-[12.5px] font-semibold">
              <span aria-hidden>✓</span>
              Packad
            </span>
          )}
        </div>
        <p className="font-sans text-[13px] text-ink-mute">
          {order.email}
          {order.isSubscription && (
            <span className="ml-2 text-accent-deep font-semibold">
              · Prenumeration
            </span>
          )}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-5">
        <ul className="space-y-2">
          {order.items.map((it) => {
            const isChecked = hydrated && checked.has(it.id);
            return (
              <li key={it.id}>
                <label
                  className={`flex items-center gap-3 py-3 px-3 rounded-xl cursor-pointer hover:bg-surface-warm/60 transition-colors min-h-[72px] ${
                    isChecked ? "opacity-50" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(it.id)}
                    aria-label={`Bocka av ${it.productName}`}
                    className="w-7 h-7 flex-shrink-0 accent-accent-deep cursor-pointer print:hidden"
                  />
                  <div className="relative w-14 h-14 flex-shrink-0 rounded-md overflow-hidden bg-surface-warm print:hidden">
                    <Image
                      src={it.imageUrl || "/products/_placeholder.svg"}
                      alt={it.productName}
                      fill
                      sizes="56px"
                      className="object-cover mix-blend-darken"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-display text-[15.5px] font-medium text-primary-deep ${
                        isChecked ? "line-through decoration-2" : ""
                      }`}
                    >
                      {it.productName}
                    </p>
                    <p className="font-sans text-[12.5px] uppercase tracking-[0.14em] text-ink-mute font-semibold">
                      SKU: {it.productSku || "—"}
                    </p>
                  </div>
                  <p className="font-display text-[28px] font-medium text-primary-deep tabular-nums">
                    ×{it.quantity}
                  </p>
                </label>
              </li>
            );
          })}
        </ul>

        {order.shippingAddress && (
          <aside className="md:min-w-[220px] md:text-right font-sans text-[13.5px] text-ink-body leading-relaxed border-t md:border-t-0 md:border-l border-border-soft md:pl-5 pt-4 md:pt-0">
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink-soft font-semibold mb-1">
              Skicka till
            </p>
            <p>
              <strong className="font-semibold text-primary-deep">
                {order.shippingAddress.fullName}
              </strong>
              <br />
              {order.shippingAddress.street}
              <br />
              {order.shippingAddress.postalCode}{" "}
              {order.shippingAddress.city}
            </p>
          </aside>
        )}
      </div>

      {order.items.length > 1 && (
        <p className="mt-3 pt-3 border-t border-border-soft font-sans text-[13px] text-ink-mute text-right">
          Total: {order.items.reduce((s, it) => s + it.quantity, 0)} st{" "}
          {someChecked &&
            !allChecked && (
              <span className="text-accent-deep font-semibold ml-2">
                ·{" "}
                {
                  order.items.filter((it) => checked.has(it.id)).length
                }
                /{order.items.length} avbockade
              </span>
            )}
        </p>
      )}
    </section>
  );
}
