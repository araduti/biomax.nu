"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Shared admin breadcrumbs — derived from the URL pathname so every
 * /admin/* surface gets the same trail without each page having to
 * declare its own. Pages used to pass `crumbs={[…]}` into
 * AdminPageHeader; that prop is now ignored. If we ever need a label
 * that doesn't fit the static dictionary (e.g. a real product name on
 * `/admin/produkter/[slug]`), prefer surfacing it in the page H1 — the
 * breadcrumb is a wayfinding rail, not a title.
 *
 * Why not a route segment config? Next 16's segment-config API doesn't
 * give us a clean async hook for "fetch the product name to put in the
 * crumb", and most slugs are recognisable enough on their own. Keep it
 * simple until that stops being true.
 */

/** Map of pathname → human label. Order doesn't matter; longest prefix
 *  wins, but we look up segment-by-segment so we don't need that.
 */
const SEGMENT_LABELS: Record<string, string> = {
  admin: "Översikt",
  ordrar: "Ordrar",
  packlista: "Packlista",
  returer: "Returer",
  kunder: "Kunder",
  produkter: "Produkter",
  lager: "Lager",
  kategorier: "Kategorier",
  paket: "Paket",
  kuponger: "Rabattkoder",
  recensioner: "Recensioner",
  startsida: "Startsidan",
  hero: "Hero-bilder",
  seo: "SEO",
  innehall: "Innehåll",
  "ingredient-pins": "Ingredienspinnar",
  rapporter: "Rapporter",
  forsaljning: "Försäljning",
  moms: "Momsrapport",
  installningar: "Inställningar",
  system: "System",
  prestanda: "Prestanda",
  drifttid: "Drifttid",
  loggar: "Loggar",
  backups: "Backups",
  etiketter: "Etikett-preview",
  ny: "Ny",
};

function labelFor(segment: string): string {
  return (
    SEGMENT_LABELS[segment] ??
    // Fallback: show the raw segment with first letter uppercased so an
    // unmapped slug ("balans-pulver") still reads as a crumb rather than
    // an empty space.
    segment.charAt(0).toUpperCase() + segment.slice(1)
  );
}

export function AdminBreadcrumbs() {
  const pathname = usePathname();
  if (!pathname || !pathname.startsWith("/admin")) return null;

  const segments = pathname.split("/").filter(Boolean); // ["admin", ...]
  // Root /admin renders no breadcrumb — the H1 already says "Översikt".
  if (segments.length <= 1) return null;

  const crumbs: { label: string; href?: string }[] = [];
  let acc = "";
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!;
    acc += "/" + seg;
    const isLast = i === segments.length - 1;
    crumbs.push({
      label: labelFor(seg),
      href: isLast ? undefined : acc,
    });
  }

  return (
    <nav
      aria-label="Brödsmulor"
      className="px-5 md:px-10 pt-4 max-w-[1400px] flex flex-wrap items-baseline gap-x-1.5 font-sans text-caption text-ink-mute"
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
  );
}
