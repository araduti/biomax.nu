"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AdminStatusPill } from "./admin-status-pill";

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
      className={`pt-6 border-t border-[var(--d-line)] transition-opacity print:border-0 print:p-0 print:mb-8 print:break-inside-avoid ${
        allChecked ? "opacity-55" : ""
      }`}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
        <div className="flex items-baseline gap-3">
          <p className="font-mono text-small font-medium text-[var(--d-ink)] tabular-nums">
            {order.orderNumber}
          </p>
          {allChecked && (
            <AdminStatusPill kind="ok">Packad</AdminStatusPill>
          )}
        </div>
        <p className="font-sans text-small text-[var(--d-ink-2)]">
          {order.email}
          {order.isSubscription && (
            <span className="ml-2 text-[var(--d-accent-2)] font-medium">
              · Prenumeration
            </span>
          )}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6">
        <ul>
          {order.items.map((it) => {
            const isChecked = hydrated && checked.has(it.id);
            return (
              <li
                key={it.id}
                className="border-b border-[var(--d-line-soft)] last:border-0"
              >
                <label
                  className={`flex items-center gap-3 py-2 min-h-[48px] cursor-pointer hover:bg-[var(--d-surface)] -mx-1 px-1 rounded-[4px] transition-colors ${
                    isChecked ? "opacity-50" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(it.id)}
                    aria-label={`Bocka av ${it.productName}`}
                    className="w-4 h-4 flex-shrink-0 accent-[var(--d-accent)] cursor-pointer print:hidden"
                  />
                  <div className="relative w-9 h-9 flex-shrink-0 rounded-[4px] overflow-hidden bg-[var(--d-surface-2)] print:hidden">
                    <Image
                      src={it.imageUrl || "/products/_placeholder.svg"}
                      alt={it.productName}
                      fill
                      sizes="36px"
                      className="object-cover mix-blend-darken"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-sans text-body font-medium text-[var(--d-ink)] truncate ${
                        isChecked ? "line-through decoration-1" : ""
                      }`}
                    >
                      {it.productName}
                    </p>
                    <p className="font-mono text-micro text-[var(--d-ink-3)]">
                      {it.productSku || "—"}
                    </p>
                  </div>
                  <p className="font-sans text-body-lg font-semibold text-[var(--d-ink)] tabular-nums">
                    ×{it.quantity}
                  </p>
                </label>
              </li>
            );
          })}
        </ul>

        {order.shippingAddress && (
          <aside className="md:min-w-[220px] md:text-right font-sans text-small text-[var(--d-ink-2)] leading-relaxed border-t md:border-t-0 md:border-l border-[var(--d-line-soft)] md:pl-6 pt-4 md:pt-0">
            <p className="d-eyebrow mb-1.5">Skicka till</p>
            <p>
              <strong className="font-medium text-[var(--d-ink)]">
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
        <p className="mt-3 pt-3 border-t border-[var(--d-line-soft)] font-mono text-caption text-[var(--d-ink-3)] text-right tabular-nums">
          Total: {order.items.reduce((s, it) => s + it.quantity, 0)} st{" "}
          {someChecked && !allChecked && (
            <span className="text-[var(--d-accent-2)] font-semibold ml-2">
              ·{" "}
              {order.items.filter((it) => checked.has(it.id)).length}/
              {order.items.length} avbockade
            </span>
          )}
        </p>
      )}
    </section>
  );
}
