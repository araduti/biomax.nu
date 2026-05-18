"use client";

import { useEffect, useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Receipt,
  Package,
  Undo2,
  Users,
  Tag,
  Archive,
  Folder,
  Gift,
  Ticket,
  Star,
  LayoutTemplate,
  Search,
  FileText,
  Bookmark,
  BarChart3,
  Calculator,
  Settings,
  Gauge,
  Activity,
  ListIcon,
  DatabaseBackup,
  Printer,
  ShieldCheck,
  ChevronDown,
  type LucideProps,
} from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import type { AdminBadges } from "@/lib/admin/badges";
import { cn } from "@/lib/utils";

type BadgeKey = keyof AdminBadges;
type IconCmp = ComponentType<LucideProps>;

type NavItem = {
  href: string;
  label: string;
  matchPrefix?: boolean;
  pending?: boolean;
  badge?: BadgeKey;
  icon?: IconCmp;
  /** Go-to chord hint, e.g. "G O" → press g then o. Rendered as
   *  right-edge mono metadata and wired to a real chord handler. */
  kbd?: string;
};

type NavGroup = { label: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    label: "",
    items: [{ href: "/admin", label: "Översikt", icon: Home, kbd: "G O" }],
  },
  {
    label: "Beställningar",
    items: [
      { href: "/admin/ordrar", label: "Ordrar", matchPrefix: true, badge: "ordersToPack", icon: Receipt, kbd: "G R" },
      { href: "/admin/packlista", label: "Packlista", matchPrefix: true, badge: "ordersToPack", icon: Package, kbd: "G P" },
      { href: "/admin/returer", label: "Returer", matchPrefix: true, badge: "returnsToProcess", icon: Undo2 },
      { href: "/admin/kunder", label: "Kunder", matchPrefix: true, icon: Users, kbd: "G K" },
    ],
  },
  {
    label: "Katalog",
    items: [
      { href: "/admin/produkter", label: "Produkter", matchPrefix: true, icon: Tag },
      { href: "/admin/lager", label: "Lager", matchPrefix: true, badge: "productsLowStock", icon: Archive, kbd: "G L" },
      { href: "/admin/kategorier", label: "Kategorier", matchPrefix: true, icon: Folder },
      { href: "/admin/paket", label: "Paket", matchPrefix: true, icon: Gift },
      { href: "/admin/kuponger", label: "Rabattkoder", matchPrefix: true, icon: Ticket },
    ],
  },
  {
    label: "Marknad",
    items: [
      { href: "/admin/recensioner", label: "Recensioner", matchPrefix: true, badge: "reviewsToModerate", icon: Star },
      { href: "/admin/startsida", label: "Startsidan", matchPrefix: true, icon: LayoutTemplate },
      { href: "/admin/seo", label: "SEO", matchPrefix: true, icon: Search },
      { href: "/admin/innehall", label: "Innehåll", matchPrefix: true, icon: FileText },
      { href: "/admin/ingredient-pins", label: "Ingredienspinnar", matchPrefix: true, icon: Bookmark },
    ],
  },
  {
    label: "Rapporter",
    items: [
      { href: "/admin/rapporter/forsaljning", label: "Försäljning", pending: true, icon: BarChart3 },
      { href: "/admin/moms", label: "Momsrapport", matchPrefix: true, icon: Calculator },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/team", label: "Team & behörighet", matchPrefix: true, icon: ShieldCheck },
      { href: "/admin/installningar", label: "Inställningar", matchPrefix: true, icon: Settings },
      { href: "/admin/system/prestanda", label: "Prestanda", matchPrefix: true, icon: Gauge },
      { href: "/admin/system/drifttid", label: "Drifttid", matchPrefix: true, icon: Activity },
      { href: "/admin/system/loggar", label: "Loggar", matchPrefix: true, icon: ListIcon },
      { href: "/admin/system/backups", label: "Backups", matchPrefix: true, icon: DatabaseBackup },
      { href: "/admin/etiketter", label: "Etikett-preview", matchPrefix: true, icon: Printer },
    ],
  },
];

/** Saved views — deep links into filtered list pages. Direction D
 *  mockup's "SPARADE VYER" group. Static for now; when we add
 *  user-defined views this becomes data-driven. */
const SAVED_VIEWS: {
  href: string;
  label: string;
  badge?: BadgeKey;
  icon: IconCmp;
}[] = [
  {
    href: "/admin/ordrar?status=paid",
    label: "Ordrar idag",
    badge: "ordersToPack",
    icon: Receipt,
  },
  {
    href: "/admin/lager?filter=out",
    label: "Slut i lager",
    badge: "productsLowStock",
    icon: Archive,
  },
  {
    href: "/admin/ordrar?status=refunded",
    label: "Klarna återbet.",
    icon: Undo2,
  },
];

/** g-prefix chord targets. Press `g` then the second key. */
const CHORDS: Record<string, string> = {
  o: "/admin",
  r: "/admin/ordrar",
  p: "/admin/packlista",
  k: "/admin/kunder",
  l: "/admin/lager",
};

export function AdminSidebar({
  adminName,
  badges,
}: {
  adminName: string | null;
  badges: AdminBadges;
}) {
  const pathname = usePathname();
  const router = useRouter();
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

  // Go-to chord nav (rule x · the kbd hints must be truthful). Press
  // `g`, then within 1.2 s press the second key. Ignored while typing
  // in an input/textarea/contentEditable so it doesn't hijack search.
  useEffect(() => {
    let armed = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      )
        return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!armed && e.key === "g") {
        armed = true;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => (armed = false), 1200);
        return;
      }
      if (armed) {
        const dest = CHORDS[e.key.toLowerCase()];
        armed = false;
        if (timer) clearTimeout(timer);
        if (dest) {
          e.preventDefault();
          router.push(dest);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (timer) clearTimeout(timer);
    };
  }, [router]);

  function openSearch() {
    window.dispatchEvent(new CustomEvent("admin-cmdk"));
  }

  const initials = (adminName ?? "Biomax")
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Öppna admin-meny"
        data-admin-compact
        className="lg:hidden fixed top-3 left-3 z-30 inline-flex items-center gap-2 h-9 px-3 rounded-[5px] bg-[var(--d-ink)] text-[var(--d-bg)] font-sans text-small font-semibold shadow-sm"
      >
        <span aria-hidden>☰</span>
        Meny
      </button>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Stäng meny"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-30 bg-black/30 backdrop-blur-sm"
        />
      )}

      <aside
        aria-label="Admin-navigation"
        className={cn(
          "fixed left-0 top-0 h-screen w-[224px] flex flex-col z-40 transition-transform duration-200 ease-out",
          "bg-[var(--d-surface-2)] border-r border-[var(--d-line)]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* ── Brand row ──────────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-3 h-[52px] border-b border-[var(--d-line)]">
          <Link
            href="/admin"
            aria-label="Biomax admin"
            className="flex items-center gap-2 min-w-0"
          >
            <span
              aria-hidden
              className="w-[22px] h-[22px] rounded-[4px] bg-[var(--d-accent)] text-[var(--d-accent-ink)] inline-flex items-center justify-center font-mono text-micro font-bold flex-shrink-0"
            >
              bm
            </span>
            <span className="font-sans text-body font-semibold text-[var(--d-ink)] truncate">
              biomax
            </span>
          </Link>
          <ChevronDown
            size={13}
            strokeWidth={2}
            aria-hidden
            className="text-[var(--d-muted)] flex-shrink-0"
          />
          <Link
            href="/admin/installningar"
            aria-label="Inställningar"
            title="Inställningar"
            data-admin-compact
            className="ml-auto w-7 h-7 inline-flex items-center justify-center rounded-[4px] text-[var(--d-ink-3)] hover:bg-[var(--d-surface)] hover:text-[var(--d-ink)] transition-colors"
          >
            <Settings size={14} strokeWidth={1.75} aria-hidden />
          </Link>
        </div>

        {/* ── Sidebar search (opens Cmd-K) ───────────────────────── */}
        <div className="px-3 py-3">
          <button
            type="button"
            onClick={openSearch}
            data-admin-compact
            className="w-full h-8 px-2.5 inline-flex items-center gap-2 rounded-[5px] bg-[var(--d-surface)] border border-[var(--d-line)] text-[var(--d-ink-3)] hover:border-[var(--d-line-strong)] transition-colors"
          >
            <Search size={13} strokeWidth={1.75} aria-hidden />
            <span className="font-sans text-small flex-1 text-left">Sök</span>
            <span className="d-kbd">⌘K</span>
          </button>
        </div>

        {/* ── Nav ────────────────────────────────────────────────── */}
        <nav
          aria-label="Admin-sektioner"
          className="flex-1 px-2 pb-3 overflow-y-auto"
        >
          {NAV.map((group) => (
            <div key={group.label || "lead"} className="mb-1.5">
              {group.label && (
                <p className="d-eyebrow px-2 mt-3 mb-1.5">{group.label}</p>
              )}
              <div className="flex flex-col gap-px">
                {group.items.map((n) => {
                  const active = n.matchPrefix
                    ? pathname === n.href ||
                      pathname.startsWith(n.href + "/")
                    : pathname === n.href;
                  const count = n.badge ? badges[n.badge] : 0;
                  return (
                    <SidebarLink
                      key={n.href}
                      href={n.href}
                      label={n.label}
                      active={active}
                      pending={n.pending}
                      count={count}
                      kbd={n.kbd}
                      icon={n.icon}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          {/* Saved views */}
          <div className="mb-1.5">
            <p className="d-eyebrow px-2 mt-3 mb-1.5">Sparade vyer</p>
            <div className="flex flex-col gap-px">
              {SAVED_VIEWS.map((v) => {
                const count = v.badge ? badges[v.badge] : 0;
                return (
                  <SidebarLink
                    key={v.href}
                    href={v.href}
                    label={v.label}
                    active={false}
                    count={count}
                    icon={v.icon}
                  />
                );
              })}
            </div>
          </div>
        </nav>

        {/* ── Account footer ─────────────────────────────────────── */}
        <div className="border-t border-[var(--d-line)] px-2 py-2">
          <details className="group">
            <summary className="flex items-center gap-2 px-2 h-[38px] rounded-[5px] cursor-pointer hover:bg-[var(--d-surface)] transition-colors list-none">
              <span
                aria-hidden
                className="w-[26px] h-[26px] rounded-[5px] bg-[var(--d-accent-soft)] text-[var(--d-accent-2)] inline-flex items-center justify-center font-mono text-micro font-bold flex-shrink-0"
              >
                {initials}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block font-sans text-small font-medium text-[var(--d-ink)] truncate">
                  {adminName ?? "Biomax"}
                </span>
                <span className="block font-mono text-micro text-[var(--d-ink-3)] truncate">
                  biomax.se
                </span>
              </span>
              <ChevronDown
                size={13}
                strokeWidth={2}
                aria-hidden
                className="text-[var(--d-muted)] transition-transform group-open:rotate-180"
              />
            </summary>
            <div className="mt-1 pl-1 pr-1 pb-1 flex flex-col gap-px">
              <Link
                href="/"
                className="px-2 h-[26px] inline-flex items-center font-sans text-small text-[var(--d-ink-2)] hover:bg-[var(--d-surface)] rounded-[4px] transition-colors"
              >
                ← Till butiken
              </Link>
              <div className="px-1">
                <SignOutButton
                  variant="ghost"
                  className="w-full !justify-start !h-[26px] !px-2 !text-small !font-normal"
                />
              </div>
            </div>
          </details>
        </div>
      </aside>
    </>
  );
}

function SidebarLink({
  href,
  label,
  active,
  pending,
  count,
  kbd,
  icon: Icon,
}: {
  href: string;
  label: string;
  active: boolean;
  pending?: boolean;
  count?: number;
  kbd?: string;
  icon?: IconCmp;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      aria-disabled={pending ? "true" : undefined}
      className={cn(
        "relative group flex items-center gap-2.5 h-[26px] px-2 rounded-[5px] font-sans text-small transition-colors",
        active
          ? "bg-[var(--d-surface)] text-[var(--d-ink)] font-medium shadow-[0_1px_0_var(--d-line)] before:content-[''] before:absolute before:-left-[3px] before:top-[5px] before:bottom-[5px] before:w-[2px] before:bg-[var(--d-accent)] before:rounded-[2px]"
          : pending
            ? "text-[var(--d-muted)]"
            : "text-[var(--d-ink-2)] hover:bg-[var(--d-surface)] hover:text-[var(--d-ink)]"
      )}
    >
      {Icon && (
        <Icon
          size={15}
          strokeWidth={1.75}
          aria-hidden
          className={cn(
            "flex-shrink-0 transition-colors",
            active
              ? "text-[var(--d-accent)]"
              : "text-[var(--d-ink-3)] group-hover:text-[var(--d-ink)]"
          )}
        />
      )}
      <span className="flex-1 truncate">{label}</span>
      {pending ? (
        <span className="d-kbd">snart</span>
      ) : count && count > 0 ? (
        <span
          aria-label={`${count} att hantera`}
          className="inline-flex items-center justify-center min-w-[16px] h-[15px] px-1 rounded-[3px] bg-[var(--d-surface-2)] border border-[var(--d-line)] font-mono text-micro font-semibold text-[var(--d-ink-2)] tabular-nums"
        >
          {count}
        </span>
      ) : kbd ? (
        <span className="d-kbd">{kbd}</span>
      ) : null}
    </Link>
  );
}
