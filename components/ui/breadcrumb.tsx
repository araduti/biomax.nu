import Link from "next/link";
import type { Crumb } from "@/lib/jsonld";

export function Breadcrumb({
  crumbs,
  className = "",
}: {
  crumbs: Crumb[];
  className?: string;
}) {
  return (
    <nav
      aria-label="Brödsmulor"
      className={`font-sans text-[12px] tracking-wide ${className}`}
    >
      <ol className="flex flex-wrap items-center gap-2 text-ink-mute">
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <li key={c.href} className="flex items-center gap-2">
              {!isLast ? (
                <Link
                  href={c.href}
                  className="hover:text-primary transition-colors"
                >
                  {c.label}
                </Link>
              ) : (
                <span aria-current="page" className="text-ink-body">
                  {c.label}
                </span>
              )}
              {!isLast && (
                <span aria-hidden className="text-ink-soft">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
