import type { ReactNode } from "react";
import Link from "next/link";
import { Display, Eyebrow } from "@/components/ui/typography";

export type AdminCrumb = { label: string; href?: string };

/**
 * Shared page header for every /admin/* surface. Keeps the eyebrow / display
 * heading / subtitle / breadcrumb stack consistent so the dashboard reads as
 * one product instead of N independent pages with bespoke headers.
 *
 * The optional `actions` slot lands on the right side of the title row —
 * use for "Skapa ny", "Filtrera", view-toggles, etc. Don't put save state
 * here (that's a sticky footer concern, not a header concern).
 */
export function AdminPageHeader({
  eyebrow,
  title,
  subtitle,
  crumbs,
  actions,
  size = "xl",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  crumbs?: AdminCrumb[];
  actions?: ReactNode;
  size?: "lg" | "xl";
}) {
  return (
    <header className="mb-8">
      {crumbs && crumbs.length > 0 && (
        <nav
          aria-label="Brödsmulor"
          className="mb-4 flex flex-wrap items-baseline gap-x-1.5 font-sans text-[12.5px] text-ink-mute"
        >
          {crumbs.map((c, i) => (
            <span key={i} className="inline-flex items-baseline gap-1.5">
              {c.href ? (
                <Link
                  href={c.href}
                  className="hover:text-primary-deep transition-colors"
                >
                  {c.label}
                </Link>
              ) : (
                <span className="text-ink-body">{c.label}</span>
              )}
              {i < crumbs.length - 1 && (
                <span aria-hidden className="text-ink-soft">
                  /
                </span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <Display as="h1" size={size} className={eyebrow ? "mt-3" : undefined}>
            {title}
          </Display>
          {subtitle && (
            <div className="mt-3 font-sans text-[14.5px] text-ink-mute leading-relaxed max-w-[760px]">
              {subtitle}
            </div>
          )}
        </div>
        {actions && <div className="flex-shrink-0">{actions}</div>}
      </div>
    </header>
  );
}
