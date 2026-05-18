"use client";

import { useEffect, useRef, useState } from "react";
import {
  createKustomCheckout,
  updateKustomCheckout,
  readKustomOrderTotals,
} from "@/lib/checkout/kustom-session";

/**
 * Mounts the Kustom checkout iframe and keeps it in sync with the
 * loyalty-points selection — WITHOUT recreating the session.
 *
 * Flow:
 *  - On mount: createKustomCheckout → inject the html_snippet (its
 *    <script> children are re-created so the browser executes them)
 *    and remember the order_id.
 *  - On debounced points change: Kustom's documented
 *    suspend → update (server PATCH same order_id) → resume. `resume`
 *    *refreshes* the order in place — no teardown, no loss of payment
 *    data the customer may have started entering.
 *
 * `window._klarnaCheckout(api => …)` is the global the injected
 * snippet exposes (Kustom keeps the Klarna-Checkout heritage). We wait
 * for it before suspend/resume.
 */

declare global {
  interface Window {
    _klarnaCheckout?: (cb: (api: {
      suspend: () => void;
      resume: () => void;
      on?: (handlers: Record<string, (...a: unknown[]) => void>) => void;
    }) => void) => void;
  }
}

type CartItem = {
  productId: string;
  variantId?: string | null;
  quantity: number;
};

const COMMIT_DEBOUNCE_MS = 2000;

/** Resolve once `_klarnaCheckout` is available (snippet script ran). */
function whenKcoReady(timeoutMs = 8000): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window._klarnaCheckout) {
      resolve(true);
      return;
    }
    const start = Date.now();
    const t = setInterval(() => {
      if (typeof window !== "undefined" && window._klarnaCheckout) {
        clearInterval(t);
        resolve(true);
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(t);
        resolve(false);
      }
    }, 150);
  });
}

function kco(method: "suspend" | "resume") {
  window._klarnaCheckout?.((api) => api[method]());
}

export function KustomCheckout({
  cart,
  loyaltyPoints = 0,
  onShipping,
}: {
  cart: CartItem[];
  /** Live Familjen Biomax points selection — debounced, then synced
   *  into the existing Kustom order via suspend→update→resume. */
  loyaltyPoints?: number;
  /** Customer-selected shipping (kr) read back from Kustom after they
   *  pick delivery in the iframe. null = not chosen yet. The caller
   *  computes Totalt = subtotal − rabatt + shipping for instant
   *  updates; shipping changes rarely so this read isn't on the hot
   *  path. */
  onShipping?: (kr: number | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const createdRef = useRef(false);
  const orderIdRef = useRef<string | null>(null);
  // Cart+points snapshot already committed to Kustom — skip redundant
  // updates. Covers both qty edits and points changes via one path.
  const committedKeyRef = useRef<string | null>(null);
  const onShippingRef = useRef(onShipping);
  onShippingRef.current = onShipping;
  const totalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced shipping read. Fired on iframe change events + after our
  // own points/cart sync. Shipping changes are discrete clicks (not a
  // stream), so a short debounce just coalesces the burst of events
  // Kustom emits for one pick — keeps the sidebar snappy.
  function scheduleTotalRead() {
    if (totalTimer.current) clearTimeout(totalTimer.current);
    totalTimer.current = setTimeout(async () => {
      const orderId = orderIdRef.current;
      if (!orderId) return;
      try {
        const res = await readKustomOrderTotals(orderId);
        onShippingRef.current?.(res.ok ? res.shippingKr : null);
      } catch {
        onShippingRef.current?.(null);
      }
    }, 450);
  }
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  const cartPayload = cart.map((i) => ({
    productId: i.productId,
    variantId: i.variantId,
    quantity: i.quantity,
  }));
  // One key for the whole synced state: cart lines + points. Changes
  // to either (qty stepper or slider) trigger the same in-place sync.
  const syncKey = `${JSON.stringify(cartPayload)}|${loyaltyPoints}`;

  // ── Create once (StrictMode-safe) ──────────────────────────
  useEffect(() => {
    if (createdRef.current) return;
    createdRef.current = true;

    (async () => {
      const result = await createKustomCheckout(
        cartPayload,
        loyaltyPoints
      );
      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }
      orderIdRef.current = result.orderId;
      committedKeyRef.current = syncKey;

      const container = containerRef.current;
      if (!container) return;
      container.innerHTML = result.htmlSnippet;
      container.querySelectorAll("script").forEach((old) => {
        const script = document.createElement("script");
        for (const attr of old.attributes) {
          script.setAttribute(attr.name, attr.value);
        }
        script.text = old.textContent ?? "";
        old.replaceWith(script);
      });
      setLoading(false);

      // Mirror the authoritative total: initial read, then re-read on
      // any in-iframe change (delivery/address/option). Event names
      // vary across Kustom; subscribe broadly + read defensively.
      scheduleTotalRead();
      const ready = await whenKcoReady();
      if (ready) {
        window._klarnaCheckout?.((api) =>
          api.on?.({
            change: scheduleTotalRead,
            shipping_address_change: scheduleTotalRead,
            billing_address_change: scheduleTotalRead,
            shipping_option_change: scheduleTotalRead,
            order_total_change: scheduleTotalRead,
          })
        );
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Debounced cart+points sync (suspend → update → resume) ──
  // Fires for qty stepper edits AND points changes — both are an
  // in-place server PATCH of the same order; the iframe refreshes on
  // resume, no teardown, no lost payment data.
  useEffect(() => {
    if (!orderIdRef.current) return;
    if (syncKey === committedKeyRef.current) return;

    const handle = setTimeout(async () => {
      const orderId = orderIdRef.current;
      if (!orderId) return;
      const target = syncKey;

      const ready = await whenKcoReady();
      if (ready) kco("suspend");
      setSyncError(null);
      try {
        const res = await updateKustomCheckout(
          cartPayload,
          loyaltyPoints,
          orderId
        );
        if (res.ok) {
          committedKeyRef.current = target;
        } else {
          setSyncError(res.error);
        }
      } catch {
        setSyncError("Kunde inte uppdatera kassan.");
      } finally {
        // Always resume — never leave the iframe frozen.
        if (ready) kco("resume");
        // Cart/discount changed → re-read the authoritative total.
        scheduleTotalRead();
      }
    }, COMMIT_DEBOUNCE_MS);

    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncKey]);

  return (
    <div className="mt-4">
      {loading && !error && (
        <div
          className="h-[400px] animate-pulse bg-surface-warm rounded-xl"
          role="status"
          aria-label="Laddar Kustom-kassan"
        />
      )}
      {error && (
        <div
          className="rounded-xl border-2 border-dashed border-accent bg-surface-warm p-6"
          role="alert"
        >
          <p className="font-sans text-micro uppercase tracking-[0.22em] font-bold text-primary mb-2">
            Kustom-kassan kunde inte laddas
          </p>
          <p className="font-sans text-body text-ink-mute leading-relaxed">
            {error}
          </p>
        </div>
      )}
      {syncError && !error && (
        <p
          role="alert"
          className="mb-3 font-sans text-caption text-status-error"
        >
          {syncError} Rabatten visas korrekt när du laddar om sidan.
        </p>
      )}
      {/* No id here — Kustom's snippet brings its own container
          element; a duplicate id makes its loader bind the wrong node. */}
      <div
        ref={containerRef}
        className={loading || error ? "hidden" : "min-h-[400px]"}
      />
    </div>
  );
}
