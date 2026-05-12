import type { ReactNode } from "react";

/**
 * Shared "not yet" surface for admin cards/sections. Three intents:
 *   • "setup"     — integration not configured (env vars missing)
 *   • "pending"   — configured but cron hasn't run yet
 *   • "empty"     — feature works, just no data
 *
 * Keeps voice consistent across GSC, LLM, Web Vitals etc. Each integration
 * was previously open-coding its own slightly-different empty state.
 */
export function AdminEmptyState({
  intent = "setup",
  title,
  body,
  cta,
  variant = "card",
}: {
  intent?: "setup" | "pending" | "empty";
  title: string;
  body: ReactNode;
  cta?: ReactNode;
  variant?: "card" | "inline";
}) {
  const eyebrow =
    intent === "setup"
      ? "Konfiguration"
      : intent === "pending"
        ? "Väntar på data"
        : "Inga resultat";

  if (variant === "inline") {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface-warm/40 px-4 py-3">
        <p className="font-sans text-[10.5px] uppercase tracking-[0.22em] font-semibold text-ink-soft mb-1">
          {eyebrow}
        </p>
        <p className="font-sans text-[13px] text-ink-body leading-relaxed">
          <strong className="font-semibold">{title}.</strong>{" "}
          <span className="text-ink-mute">{body}</span>
        </p>
        {cta && <div className="mt-2">{cta}</div>}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface-alt/60 px-5 py-6 md:px-6">
      <p className="font-sans text-[10.5px] uppercase tracking-[0.22em] font-semibold text-accent-deep mb-1">
        {eyebrow}
      </p>
      <h3 className="font-display text-xl font-medium tracking-tight text-primary-deep mb-2">
        {title}
      </h3>
      <div className="font-sans text-[13.5px] text-ink-mute leading-relaxed">
        {body}
      </div>
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  );
}
