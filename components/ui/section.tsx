import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Section wrapper — consistent vertical rhythm and max-width.
 *
 * <Section>...</Section>            → standard surface
 * <Section tone="warm">...</Section> → warm cream surface
 * <Section tone="deep">...</Section> → deep blue inverted (founder, footer)
 */
type Tone = "default" | "alt" | "warm" | "deep";

const TONE: Record<Tone, string> = {
  default: "bg-surface text-ink",
  alt: "bg-surface-alt text-ink",
  warm: "bg-surface-warm text-ink",
  deep: "bg-primary-deep text-surface",
};

type Padding = "tight" | "default" | "spacious";
const PADDING: Record<Padding, string> = {
  tight: "py-12 md:py-16",
  default: "py-20 md:py-28",
  spacious: "py-24 md:py-36",
};

export function Section({
  tone = "default",
  padding = "default",
  bordered = false,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement> & {
  tone?: Tone;
  padding?: Padding;
  bordered?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        TONE[tone],
        PADDING[padding],
        bordered && "border-y border-border",
        className
      )}
      {...props}
    >
      <div className="max-w-[1240px] mx-auto px-6 md:px-8">{children}</div>
    </section>
  );
}
