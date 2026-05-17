"use client";

/**
 * Tiny client island that calls `window.print()`. Lives in the admin
 * shell where we want the action button to be 48px+ for older users,
 * but it's marked `print:hidden` so it disappears from the printed
 * sheet itself.
 */
export function PrintButton({ label = "Skriv ut" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden inline-flex items-center gap-2 h-12 px-5 rounded-lg bg-primary-deep text-surface font-sans text-[15px] font-semibold hover:bg-primary transition-colors"
    >
      <span aria-hidden>🖨</span>
      {label}
    </button>
  );
}
