"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BiomaxLogo } from "@/components/brand/BiomaxLogo";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { DensityToggle } from "@/components/admin/density-toggle";
import type { AdminBadges } from "@/lib/admin/badges";
import { cn } from "@/lib/utils";

type BadgeKey = keyof AdminBadges;

type NavItem = {
  href: string;
  label: string;
  matchPrefix?: boolean;
  /** Soft-disable items whose backing pages don't exist yet. */
  pending?: boolean;
  /** When set, render a count chip pulled from AdminBadges. */
  badge?: BadgeKey;
};

type NavGroup = {
  /** Sidebar eyebrow. Empty for the lead item. */
  label: string;
  items: NavItem[];
};

/**
 * IA grouped by frequency of use, not the old "Drift / Innehåll /
 * System" categories. An admin spends mornings in Beställningar, weekly
 * in Katalog, monthly in Rapporter — the grouping mirrors that rhythm.
 *
 * Count chips: every item with a `badge` key shows the corresponding
 * AdminBadges count when > 0. Same visual weight as other admin status
 * pills (text + colour, not a tiny dot) so 50+ eyes read at a glance.
 */
const NAV: NavGroup[] = [
  {
    label: "",
    items: [{ href: "/admin", label: "Översikt" }],
  },
  {
    label: "Beställningar",
    items: [
      {
        href: "/admin/ordrar",
        label: "Ordrar",
        matchPrefix: true,
        badge: "ordersToPack",
      },
      {
        href: "/admin/packlista",
        label: "Packlista",
        matchPrefix: true,
        badge: "ordersToPack",
      },
      {
        href: "/admin/returer",
        label: "Returer",
        matchPrefix: true,
        badge: "returnsToProcess",
      },
      { href: "/admin/kunder", label: "Kunder", matchPrefix: true },
    ],
  },
  {
    label: "Katalog",
    items: [
      { href: "/admin/produkter", label: "Produkter", matchPrefix: true },
      {
        href: "/admin/lager",
        label: "Lager",
        matchPrefix: true,
        badge: "productsLowStock",
      },
      { href: "/admin/kategorier", label: "Kategorier", matchPrefix: true },
      { href: "/admin/paket", label: "Paket", matchPrefix: true },
      { href: "/admin/kuponger", label: "Rabattkoder", matchPrefix: true },
    ],
  },
  {
    label: "Marknad",
    items: [
      {
        href: "/admin/recensioner",
        label: "Recensioner",
        matchPrefix: true,
        badge: "reviewsToModerate",
      },
      { href: "/admin/startsida", label: "Startsidan", matchPrefix: true },
      { href: "/admin/seo", label: "SEO", matchPrefix: true },
      { href: "/admin/innehall", label: "Innehåll", matchPrefix: true },
      {
        href: "/admin/ingredient-pins",
        label: "Ingredienspinnar",
        matchPrefix: true,
      },
    ],
  },
  {
    label: "Rapporter",
    items: [
      { href: "/admin/rapporter/forsaljning", label: "Försäljning", pending: true },
      { href: "/admin/moms", label: "Momsrapport", matchPrefix: true },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/installningar", label: "Inställningar", matchPrefix: true },
      { href: "/admin/system/prestanda", label: "Prestanda", matchPrefix: true },
      { href: "/admin/system/drifttid", label: "Drifttid", matchPrefix: true },
      { href: "/admin/system/loggar", label: "Loggar", matchPrefix: true },
      { href: "/admin/system/backups", label: "Backups", matchPrefix: true },
      { href: "/admin/etiketter", label: "Etikett-preview", matchPrefix: true },
    ],
  },
];

export function AdminSidebar({
  adminName,
  badges,
}: {
  adminName: string | null;
  badges: AdminBadges;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Öppna admin-meny"
        className="lg:hidden fixed top-4 left-4 z-30 inline-flex items-center gap-2 h-12 px-4 rounded-full bg-primary-deep text-surface font-sans text-[14px] font-semibold shadow-lg"
      >
        <span aria-hidden>☰</span>
        Meny
      </button>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Stäng meny"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
        />
      )}

      <aside
        aria-label="Admin-navigation"
        className={cn(
          "fixed left-0 top-0 h-screen w-[280px] bg-primary-deep text-surface flex flex-col z-40 transition-transform duration-200 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="px-6 py-6 border-b border-surface/10 flex items-center justify-between">
          <Link
            href="/admin"
            className="flex flex-col gap-1"
            aria-label="Biomax Admin"
          >
            <BiomaxLogo height={28} className="text-surface" />
            <span className="font-sans text-[10px] uppercase tracking-[0.24em] text-surface/55 font-semibold">
              Admin
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Stäng meny"
            data-admin-compact
            className="lg:hidden text-surface/70 hover:text-surface w-10 h-10 inline-flex items-center justify-center text-xl"
          >
            ✕
          </button>
        </div>

        <nav
          aria-label="Admin-sektioner"
          className="flex-1 px-3 py-5 flex flex-col gap-5 overflow-y-auto"
        >
          {NAV.map((group) => (
            <div key={group.label || "lead"} className="flex flex-col gap-1">
              {group.label && (
                <p className="px-3 mb-1.5 font-sans text-[11px] uppercase tracking-[0.22em] text-surface/45 font-semibold">
                  {group.label}
                </p>
              )}
              {group.items.map((n) => {
                const active = n.matchPrefix
                  ? pathname === n.href || pathname.startsWith(n.href + "/")
                  : pathname === n.href;
                const count = n.badge ? badges[n.badge] : 0;
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    aria-current={active ? "page" : undefined}
                    aria-disabled={n.pending ? "true" : undefined}
                    className={cn(
                      "relative px-3 min-h-12 flex items-center justify-between gap-3 rounded-lg font-sans text-[15px] font-medium transition-colors",
                      active
                        ? "bg-surface/12 text-surface before:content-[''] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-surface before:rounded-full"
                        : n.pending
                          ? "text-surface/45 hover:text-surface/60"
                          : "text-surface/75 hover:bg-surface/6 hover:text-surface"
                    )}
                  >
                    <span>{n.label}</span>
                    {n.pending ? (
                      <span className="font-sans text-[10px] uppercase tracking-[0.18em] font-semibold text-surface/45">
                        snart
                      </span>
                    ) : count > 0 ? (
                      <span
                        aria-label={`${count} att hantera`}
                        className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full bg-[#C68A4F] text-surface font-sans text-[12.5px] font-bold tabular-nums"
                      >
                        {count}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-surface/10 space-y-3">
          <div className="px-1">
            <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-surface/45 font-semibold mb-2">
              Layouttäthet
            </p>
            <DensityToggle />
          </div>
          <Link
            href="/"
            className="flex items-center px-3 min-h-10 font-sans text-[13px] text-surface/65 hover:text-surface transition-colors"
          >
            ← Till butiken
          </Link>
          {adminName && (
            <p className="px-3 font-sans text-[12.5px] text-surface/60 truncate">
              {adminName}
            </p>
          )}
          <div className="px-1">
            <SignOutButton variant="inverted-outline" className="w-full" />
          </div>
        </div>
      </aside>
    </>
  );
}
