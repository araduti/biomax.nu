import type { ReactNode, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Eyebrow — small uppercase label above a heading.
 * Inter 11px, letter-spacing 0.24em, weight 600.
 */
export function Eyebrow({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "font-sans text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-mute",
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}

/**
 * Display — Playfair editorial heading. Default: H2 size.
 * Use the `as` prop for semantic level. Use `size` for visual size.
 *
 * Examples:
 *   <Display as="h1" size="hero">Livskvalitet</Display>
 *   <Display as="h2" size="lg">Signaturprodukter</Display>
 */
type DisplaySize = "xs" | "sm" | "md" | "lg" | "xl" | "hero";
type DisplayAs = "h1" | "h2" | "h3" | "h4" | "p" | "span";

const SIZES: Record<DisplaySize, string> = {
  xs: "text-xl leading-tight",
  sm: "text-2xl leading-tight",
  md: "text-3xl leading-tight",
  lg: "text-4xl md:text-5xl leading-[1.05]",
  xl: "text-5xl md:text-6xl leading-[1.02]",
  hero: "text-6xl md:text-8xl leading-[1.02]",
};

export function Display({
  as: Tag = "h2",
  size = "md",
  className,
  children,
}: {
  as?: DisplayAs;
  size?: DisplaySize;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag
      className={cn(
        "font-display font-medium tracking-tight text-primary-deep",
        SIZES[size],
        className
      )}
    >
      {children}
    </Tag>
  );
}

/**
 * Italic accent — the brand's recurring editorial signature.
 * Use inline within a Display to add a sage italic phrase.
 *
 * Example:
 *   <Display>Livskvalitet, <Accent>i fokus</Accent></Display>
 */
export function Accent({
  children,
  className,
  color,
}: {
  children: ReactNode;
  className?: string;
  /** Override the accent color (e.g. season's accent). Default: lichen sage. */
  color?: string;
}) {
  return (
    <em
      className={cn("italic font-display font-normal not-italic-px", className)}
      style={color ? { color, fontStyle: "italic" } : { fontStyle: "italic" }}
    >
      {color ? children : <span className="text-accent-deep italic">{children}</span>}
    </em>
  );
}
