import type { ReactNode } from "react";

/**
 * Section wrapper for admin pages — Stripe-style "canvas with typography
 * hierarchy" rather than "bordered card on bordered card".
 *
 * Visual contract:
 *   - eyebrow + h2 + description live on the page canvas (no chrome).
 *   - Content `children` also sit on canvas by default. Use the `frame`
 *     prop when the children are a list/table/form that benefits from a
 *     defined data region (the frame is a light-weight container —
 *     thin border, soft radius, soft background).
 *   - When `count === 0` and `empty` is set, the section collapses to
 *     one ✓-italic line.
 *
 * Usage:
 *   // Plain (no chrome around content) — the default.
 *   <AdminSection title="Sökord (28 dagar)" description="…">
 *     <ul className="divide-y">…</ul>
 *   </AdminSection>
 *
 *   // Framed (subtle container around content) — for data lists.
 *   <AdminSection title="Senaste ordrar" frame>
 *     <ul className="divide-y">…</ul>
 *   </AdminSection>
 */
export type AdminSectionProps = {
  /** Small eyebrow above the heading. Defaults to none. */
  eyebrow?: string;
  /** H2 heading. */
  title: string;
  /** Optional right-side action (Export button, "+ Add new" link, etc.). */
  rightAction?: ReactNode;
  /** Optional small numeric count shown next to the title (Stripe pattern).
   *  When set to 0 AND `empty` is provided, swaps to inline empty copy
   *  automatically. */
  count?: number | string;
  /** Description paragraph between title and content. */
  description?: ReactNode;
  /** Anchor target for in-page nav (used by EditorAnchorRail). */
  id?: string;
  /** Inline empty-state copy. Triggers when `count === 0`. */
  empty?: string;
  /**
   * When true, wraps `children` in a light-weight bordered container.
   * Use for data lists / tables / forms. Default false — content sits
   * on the page canvas with no chrome.
   */
  frame?: boolean;
  /** Section content. */
  children: ReactNode;
};

export function AdminSection({
  eyebrow,
  title,
  rightAction,
  count,
  description,
  id,
  empty,
  frame = false,
  children,
}: AdminSectionProps) {
  const isEmpty = count === 0 && !!empty;
  return (
    <section id={id} className="h-fit scroll-mt-24">
      {eyebrow && (
        <p className="font-sans text-[10.5px] uppercase tracking-[0.16em] font-semibold text-accent-deep mb-1">
          {eyebrow}
        </p>
      )}
      <div className="flex items-baseline justify-between gap-3 mb-2 flex-wrap">
        <h2 className="font-sans text-[15px] md:text-[16px] font-semibold tracking-tight text-primary-deep flex items-baseline gap-3">
          {title}
          {count !== undefined && (
            <span className="font-sans text-[13px] tabular-nums text-ink-mute font-semibold">
              {count}
            </span>
          )}
        </h2>
        {rightAction && <div className="ml-auto">{rightAction}</div>}
      </div>
      {description && (
        <p className="font-sans text-[13.5px] text-ink-mute leading-relaxed mb-4 max-w-[640px]">
          {description}
        </p>
      )}
      {isEmpty ? (
        <p className="font-sans text-[14px] text-accent-deep italic flex items-center gap-2">
          <span aria-hidden>✓</span>
          {empty}
        </p>
      ) : frame ? (
        <div className="border border-border-soft rounded-xl">{children}</div>
      ) : (
        children
      )}
    </section>
  );
}
