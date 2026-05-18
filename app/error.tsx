"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Display, Eyebrow } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";

/**
 * Route-segment error boundary — replaces the Next.js default white-screen.
 * Must be a client component (Next.js convention). Reports to Sentry via
 * the auto-instrumentation wired in next.config.ts; the in-page UI stays
 * calm so the customer isn't presented with a stack trace.
 *
 * Reset retries the failing segment without reloading the whole app.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sentry's @sentry/nextjs auto-instrumentation captures unhandled
    // errors from route segments, so we don't need to manually call
    // captureException here. Logging is just for local visibility.
    console.error("[error-boundary]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] bg-surface flex items-center justify-center px-6">
      <div className="max-w-[560px] text-center">
        <Eyebrow className="mb-3">Något gick fel</Eyebrow>
        <Display as="h1" size="xl" className="mb-4">
          Sidan kunde inte visas
        </Display>
        <p className="font-sans text-base text-ink-mute leading-relaxed mb-8">
          Det här var oväntat. Vi har loggat felet och kollar på det. Du kan
          försöka igen — om det fortfarande inte fungerar, mejla oss på{" "}
          <a
            href="mailto:kontakt@biomax.nu"
            className="text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent"
          >
            kontakt@biomax.nu
          </a>
          .
        </p>
        {error.digest && (
          <p className="font-sans text-micro text-ink-soft mb-6">
            Referenskod: <code>{error.digest}</code>
          </p>
        )}
        <div className="flex flex-wrap gap-3 justify-center">
          <Button type="button" onClick={reset}>
            Försök igen
          </Button>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 rounded-md border border-border bg-surface hover:bg-surface-warm font-sans text-small font-semibold text-ink-body transition-colors"
          >
            Till startsidan
          </Link>
        </div>
      </div>
    </div>
  );
}
