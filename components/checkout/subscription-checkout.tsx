"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { startSubscriptionCheckout } from "@/lib/checkout/kustom-session";

/**
 * Mounts the first-delivery Kustom checkout for a new subscription.
 *
 * On mount: call `startSubscriptionCheckout` with the resolved
 * product/variant/interval. Real Kustom mode → inject the returned
 * html_snippet (its <script> children are re-created so the browser
 * executes them). Stub mode (no Klarna creds) → the action already
 * created a stub-PAID first order + the subscription, so we just
 * follow its redirect to the confirmation page.
 *
 * Unlike the cart checkout there is no loyalty sync — a subscription
 * line is fixed, so the session is created once and never patched.
 */
export function SubscriptionCheckout({
  productId,
  variantId,
  intervalDays,
}: {
  productId: string;
  variantId: string | null;
  intervalDays: number;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      const result = await startSubscriptionCheckout({
        productId,
        variantId,
        quantity: 1,
        intervalDays,
      });
      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }
      if (result.mode === "stub") {
        router.replace(result.redirect);
        return;
      }
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
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mt-4">
      {loading && !error && (
        <div
          className="h-[400px] animate-pulse bg-surface-warm rounded-xl"
          role="status"
          aria-label="Laddar kassan"
        />
      )}
      {error && (
        <div
          className="rounded-xl border-2 border-dashed border-accent bg-surface-warm p-6"
          role="alert"
        >
          <p className="font-sans text-[10px] uppercase tracking-[0.22em] font-bold text-primary mb-2">
            Kassan kunde inte laddas
          </p>
          <p className="font-sans text-[14px] text-ink-mute leading-relaxed">
            {error}
          </p>
        </div>
      )}
      <div
        ref={containerRef}
        className={loading || error ? "hidden" : "min-h-[400px]"}
      />
    </div>
  );
}
