/**
 * Client-side instrumentation hook (Next 16 convention).
 *
 * Loaded after HTML parse, before React hydration. We initialise Sentry
 * here when a DSN is configured. The dynamic import ensures the SDK is not
 * downloaded at all in environments without a DSN — keeping the dev bundle
 * lean and avoiding noise from local errors.
 *
 * We also export `onRouterTransitionStart` so Sentry can correlate
 * navigation events with breadcrumbs.
 */

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const environment =
  process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ??
  process.env.NODE_ENV ??
  "development";

if (dsn) {
  import("@sentry/nextjs")
    .then((Sentry) => {
      Sentry.init({
        dsn,
        environment,
        tracesSampleRate: environment === "production" ? 0.1 : 0,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 1.0,
        sendDefaultPii: false,
        // Replay only on errors, off by default — keeps GDPR posture tight.
        integrations: (defaultIntegrations) => defaultIntegrations,
      });
    })
    .catch(() => {
      // Swallow — failed Sentry init must never break the app.
    });
}

export function onRouterTransitionStart(url: string, navigationType: string) {
  if (!dsn) return;
  // Fire-and-forget — Sentry is already initialised by this point in normal
  // flows; if not, the breadcrumb is harmlessly dropped.
  import("@sentry/nextjs")
    .then((Sentry) => {
      Sentry.addBreadcrumb({
        category: "navigation",
        message: `${navigationType} → ${url}`,
        level: "info",
      });
    })
    .catch(() => {});
}
