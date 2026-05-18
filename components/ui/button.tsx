import { type ButtonHTMLAttributes, type AnchorHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "ghost" | "inverted" | "inverted-outline";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-sans font-semibold tracking-tight transition-colors disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-surface hover:bg-primary-deep border border-transparent",
  outline:
    "bg-transparent text-primary-deep border border-primary hover:bg-primary hover:text-surface",
  ghost:
    "bg-transparent text-primary border border-transparent hover:bg-surface-warm",
  inverted:
    "bg-surface text-primary-deep hover:bg-surface-warm border border-transparent",
  "inverted-outline":
    "bg-transparent text-surface border border-surface/50 hover:bg-surface/10",
};

const sizes: Record<Size, string> = {
  sm: "text-small px-5 h-10",
  md: "text-body-lg px-7 h-12",
  lg: "text-base px-8 h-14",
};

type Props = {
  variant?: Variant;
  size?: Size;
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & Props;
type AnchorProps = AnchorHTMLAttributes<HTMLAnchorElement> & Props & { href: string };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
});

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: AnchorProps) {
  return (
    <a className={cn(base, variants[variant], sizes[size], className)} {...props} />
  );
}
