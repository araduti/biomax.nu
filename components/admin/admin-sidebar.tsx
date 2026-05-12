"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BiomaxLogo } from "@/components/brand/BiomaxLogo";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  matchPrefix?: boolean;
  /** Soft-disable items whose backing pages don't exist yet — keeps the IA visible without 404s. */
  pending?: boolean;
};

type NavGroup = {
  /** Eyebrow above the group. Empty string = no eyebrow (used for the lead group). */
  label: string;
  items: NavItem[];
};

/**
 * Three-band IA so admin grows without becoming a flat list:
 *   • DRIFT       — daily operations
 *   • INNEHÅLL    — editorial / SEO work
 *   • SYSTEM      — observability / infra
 *
 * Pending items render but route to a clearly-labelled "kommer snart" so the
 * structure communicates intent before the implementation lands.
 */
const NAV: NavGroup[] = [
  {
    label: "Drift",
    items: [
      { href: "/admin", label: "Översikt" },
      { href: "/admin/ordrar", label: "Ordrar", matchPrefix: true },
      { href: "/admin/produkter", label: "Produkter", matchPrefix: true },
      { href: "/admin/kategorier", label: "Kategorier", matchPrefix: true },
      { href: "/admin/kuponger", label: "Rabattkoder", matchPrefix: true },
      { href: "/admin/kunder", label: "Kunder", matchPrefix: true },
    ],
  },
  {
    label: "Innehåll & SEO",
    items: [
      { href: "/admin/seo", label: "SEO", matchPrefix: true },
      { href: "/admin/innehall", label: "Innehåll", matchPrefix: true },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/system/prestanda", label: "Prestanda", matchPrefix: true },
      { href: "/admin/system/drifttid", label: "Drifttid", matchPrefix: true },
      { href: "/admin/system/loggar", label: "Loggar", matchPrefix: true },
      { href: "/admin/system/backups", label: "Backups", matchPrefix: true },
      { href: "/admin/installningar", label: "Inställningar", matchPrefix: true },
      { href: "/admin/etiketter", label: "Etikett-preview", matchPrefix: true },
    ],
  },
];

export function AdminSidebar({ adminName }: { adminName: string | null }) {
  const pathname = usePathname();
  return (
    <aside className="lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:w-[260px] bg-primary-deep text-surface flex flex-col">
      <div className="px-6 py-6 border-b border-surface/10">
        <Link
          href="/admin"
          className="flex flex-col gap-1"
          aria-label="Biomax Admin"
        >
          <BiomaxLogo height={28} className="text-surface" />
          <span className="font-sans text-[9px] uppercase tracking-[0.24em] text-surface/55 font-semibold">
            Admin
          </span>
        </Link>
      </div>

      <nav
        aria-label="Admin-navigation"
        className="flex-1 px-3 py-5 flex flex-col gap-5 overflow-y-auto"
      >
        {NAV.map((group, gi) => (
          <div key={group.label} className="flex flex-col gap-0.5">
            {gi > 0 && (
              <p className="px-3 mb-1.5 font-sans text-[9px] uppercase tracking-[0.24em] text-surface/40 font-semibold">
                {group.label}
              </p>
            )}
            {group.items.map((n) => {
              const active = n.matchPrefix
                ? pathname === n.href || pathname.startsWith(n.href + "/")
                : pathname === n.href;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  aria-disabled={n.pending ? "true" : undefined}
                  className={cn(
                    "px-3 py-2.5 rounded-lg font-sans text-[14px] font-medium transition-colors flex items-center justify-between gap-3",
                    active
                      ? "bg-surface/10 text-surface"
                      : n.pending
                        ? "text-surface/40 hover:text-surface/55"
                        : "text-surface/70 hover:bg-surface/5 hover:text-surface"
                  )}
                >
                  <span>{n.label}</span>
                  {n.pending && (
                    <span className="font-sans text-[9px] uppercase tracking-[0.18em] font-semibold text-surface/40">
                      snart
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-surface/10">
        <Link
          href="/"
          className="block px-3 py-2 font-sans text-[12px] text-surface/55 hover:text-surface transition-colors"
        >
          ← Till butiken
        </Link>
        {adminName && (
          <p className="px-3 mt-3 mb-2 font-sans text-[11px] text-surface/55 truncate">
            {adminName}
          </p>
        )}
        <div className="px-1">
          <SignOutButton variant="inverted-outline" className="w-full" />
        </div>
      </div>
    </aside>
  );
}
