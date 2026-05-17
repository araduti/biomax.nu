import type { ReactNode } from "react";

/**
 * Status pill primitive — light tinted background + darker matching text.
 *
 * Replaces the ad-hoc "small colored chip" pattern that several admin
 * pages reimplemented locally (`/admin/produkter` status badges,
 * `/admin/ordrar` status, `/admin/system/backups` tier counts, etc).
 *
 * Five kinds match the project's status colour language:
 *   - ok      → sage green   (positive, complete)
 *   - warn    → amber        (needs attention)
 *   - error   → rust red     (broken, blocking)
 *   - info    → primary blue (informational, neutral)
 *   - muted   → ink gray     (passive, archived)
 *
 * Default shape: rounded-full, ~22-26 px height depending on text length.
 * Hit-target floor doesn't apply — pills are decorative labels, not
 * interactive controls (use a button if it needs to be clickable).
 */
export type StatusKind = "ok" | "warn" | "error" | "info" | "muted";

/**
 * Direction D status pills (rule vii — status ink is always paired with
 * a soft fill + dot, never bare). Mono 9px uppercase, 3px radius, dot
 * prefix from `.d-pill::before`. The legacy `bg-x/12 text-x` scheme is
 * replaced by the ratified `.d-pill-*` classes. Info has no Direction D
 * blue (rule xi — no invented colour), so it folds into neutral.
 */
const PILL_CLASS: Record<StatusKind, string> = {
  ok: "d-pill-success",
  warn: "d-pill-warn",
  error: "d-pill-danger",
  info: "d-pill-neutral",
  muted: "d-pill-neutral",
};

export function AdminStatusPill({
  kind = "muted",
  dot = false,
  icon,
  size = "md",
  children,
}: {
  kind?: StatusKind;
  /** Show a small leading coloured dot. Mutually exclusive with `icon` —
   *  if both are passed, `icon` wins. */
  dot?: boolean;
  /** Optional leading icon (emoji or small Lucide icon). Used by the
   *  order-status pill where the icon carries redundant non-colour
   *  signal for colour-blindness accessibility. */
  icon?: ReactNode;
  /** Size — `sm` for inline list cells, `md` (default) for everywhere
   *  else, `lg` for page-header-adjacent uses where the pill should
   *  read at the same weight as a heading. */
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}) {
  // `icon` / `dot` props are retained for call-site back-compat but
  // ignored — Direction D pills carry their signal via the built-in
  // CSS dot (`.d-pill::before`), never an emoji glyph (rule vii + the
  // "no magazine vocabulary" rule). `size` is also fixed: the spec
  // mandates one pill height (18px). The params stay so the ~6 existing
  // call sites don't need touching in this pass.
  void icon;
  void dot;
  void size;
  return (
    <span className={`d-pill ${PILL_CLASS[kind]}`}>{children}</span>
  );
}
