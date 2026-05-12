"use client";

import { useReportWebVitals } from "next/web-vitals";

const ENDPOINT = "/api/web-vitals";

/**
 * Mounted once in the root layout. Each metric finalises at a different
 * moment (LCP at first interaction, CLS at page hide, etc.); next/web-vitals
 * fires the callback for each individually.
 *
 * We deliberately *don't* sample (yet) — at this site's traffic level we
 * want every data point. If volume grows, sample at the server side rather
 * than client side so we keep all "bad" outliers.
 *
 * Beacon strategy: prefer `navigator.sendBeacon` (works on page-unload,
 * fire-and-forget), fall back to `fetch` with `keepalive: true` for browsers
 * where sendBeacon is unavailable or restricted (Safari sometimes).
 */
export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    // Pull connection class without crashing on browsers that lack it.
    const conn =
      typeof navigator !== "undefined" &&
      // Non-standard but widely-supported on Chromium.
      "connection" in navigator
        ? // @ts-expect-error — non-standard property, type is informational only
          navigator.connection?.effectiveType ?? null
        : null;

    const device = inferDevice();
    const route = window.location.pathname;

    const body = JSON.stringify({
      metric: metric.name,
      value: metric.value,
      sampleId: metric.id,
      route,
      navigationType: metric.navigationType,
      connection: conn,
      device,
    });

    // Prefer sendBeacon — the API exists for exactly this use case
    // (small payload, fire-and-forget at page unload).
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.sendBeacon === "function"
    ) {
      const blob = new Blob([body], { type: "application/json" });
      const sent = navigator.sendBeacon(ENDPOINT, blob);
      if (sent) return;
    }

    // Fallback — keepalive lets fetch survive a navigating-away page.
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // Swallow — telemetry must never throw at the user.
    });
  });

  return null;
}

function inferDevice(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 640) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}
