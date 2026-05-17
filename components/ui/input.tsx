import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string;
};

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, error, hint, className, id, ...props },
  ref
) {
  const inputId = id ?? props.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="font-sans text-[12px] uppercase tracking-[0.18em] font-semibold text-ink-mute"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          "h-12 px-4 rounded-lg border border-border bg-surface-alt font-sans text-[15px] text-ink placeholder:text-ink-soft outline-none transition-colors",
          "focus:border-primary focus:ring-2 focus:ring-primary/15",
          error && "border-status-error focus:ring-status-error/20",
          className
        )}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
        }
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="font-sans text-[13px] text-status-error">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${inputId}-hint`} className="font-sans text-[13px] text-ink-soft">
          {hint}
        </p>
      )}
    </div>
  );
});
