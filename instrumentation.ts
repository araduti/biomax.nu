/**
 * Server-side instrumentation hook (Next 16 convention).
 *
 * Runs once when the Node.js / Edge runtime boots. We use it to initialise
 * Sentry conditionally — if no DSN is configured (e.g. local dev) the import
 * is dynamic and Sentry never even loads, keeping cold starts lean.
 */
import { getSentryDsn, SENTRY_DEFAULTS } from "@/lib/monitoring/sentry";

export async function register() {
  const dsn = getSentryDsn();
  if (!dsn) return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn,
      environment: SENTRY_DEFAULTS.environment,
      tracesSampleRate: SENTRY_DEFAULTS.tracesSampleRate,
      // Server-side: we don't need replay or browser-only integrations.
      sendDefaultPii: false,
    });
  } else if (process.env.NEXT_RUNTIME === "edge") {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn,
      environment: SENTRY_DEFAULTS.environment,
      tracesSampleRate: SENTRY_DEFAULTS.tracesSampleRate,
    });
  }
}

/**
 * Capture errors from React Server Components / route handlers and forward
 * to Sentry. Next 16 calls this for any uncaught throw on the server side.
 */
export async function onRequestError(
  ...args: Parameters<
    NonNullable<
      typeof import("@sentry/nextjs")["captureRequestError"]
    >
  >
) {
  if (!getSentryDsn()) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(...args);
}
