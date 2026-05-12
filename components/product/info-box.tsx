import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "neutral" | "caution";

const ICONS: Record<"dosage" | "storage" | "caution", ReactNode> = {
  dosage: (
    // Pills
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10.5 20.5L20.5 10.5C22.1569 8.84315 22.1569 6.15685 20.5 4.5C18.8431 2.84315 16.1569 2.84315 14.5 4.5L4.5 14.5C2.84315 16.1569 2.84315 18.8431 4.5 20.5C6.15685 22.1569 8.84315 22.1569 10.5 20.5Z" />
      <line x1="7.5" y1="11.5" x2="13.5" y2="17.5" />
    </svg>
  ),
  storage: (
    // Shelf / cabinet
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="1.5" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="6" y1="6" x2="6.01" y2="6" />
      <line x1="6" y1="12" x2="6.01" y2="12" />
      <line x1="6" y1="18" x2="6.01" y2="18" />
    </svg>
  ),
  caution: (
    // Triangle warning
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
};

/**
 * One info box on the product detail page — Dosering, Förvaring or Observera.
 * Renders nothing if `body` is empty so unused fields stay invisible.
 *
 * `accessory` slot lets callers insert content between the title and the
 * body — typically the parsed dose chips for the Dosering card.
 */
export function InfoBox({
  icon,
  title,
  body,
  variant = "neutral",
  accessory,
}: {
  icon: keyof typeof ICONS;
  title: string;
  body: string | null | undefined;
  variant?: Variant;
  accessory?: ReactNode;
}) {
  const text = body?.trim();
  if (!text) return null;

  return (
    <div
      className={cn(
        "relative rounded-2xl border h-full flex flex-col overflow-hidden",
        variant === "caution"
          ? "border-[#B5523B]/25 bg-[#B5523B]/[0.04]"
          : "border-border bg-surface-alt"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-0 left-0 right-0 h-[3px]",
          variant === "caution" ? "bg-[#B5523B]/40" : "bg-accent/40"
        )}
      />
      <div className="p-6 md:p-7 pt-7 md:pt-8 flex items-center gap-3.5">
        <span
          aria-hidden
          className={cn(
            "inline-flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0",
            variant === "caution"
              ? "text-[#B5523B] bg-[#B5523B]/10"
              : "text-accent-deep bg-accent/15"
          )}
        >
          {ICONS[icon]}
        </span>
        <h3
          className={cn(
            "font-display text-[22px] md:text-[24px] font-medium tracking-tight leading-tight",
            variant === "caution" ? "text-[#7A331E]" : "text-primary-deep"
          )}
        >
          {title}
        </h3>
      </div>
      <div className="px-6 md:px-7 pb-6 md:pb-7 flex-1">
        {accessory}
        <p className="font-sans text-[14.5px] text-ink-body leading-[1.7] whitespace-pre-line">
          {text}
        </p>
      </div>
    </div>
  );
}
