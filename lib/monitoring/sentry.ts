/**
 * Mode-boundary helpers for Sentry — same pattern as Klarna/Brevo: the
 * integration is a no-op locally, comes alive in production when env vars are
 * set. Keeps developer machines free of cross-machine error noise and gives
 * staff a single env flip to enable/disable reporting.
 */

export function isSentryConfigured(): boolean {
  return !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);
}

export function getSentryDsn(): string | null {
  return (
    process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN ?? null
  );
}

/**
 * Public knobs we want consistent across runtimes (server / client / edge).
 * Defaults err on the side of "useful in prod, quiet otherwise".
 */
export const SENTRY_DEFAULTS = {
  /** Sample 10 % of transactions for performance monitoring in prod, 0 in dev. */
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
  /** Replay 0 % normally, 100 % when an error fires. */
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  /** Tag environment so prod / preview alerts are easily filterable. */
  environment:
    process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",
} as const;
