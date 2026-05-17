"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  HelpCircle,
  Download,
  Plus,
  SlidersHorizontal,
  Calendar,
  ChevronDown,
} from "lucide-react";
import { CmdK } from "./cmd-k";

/**
 * Admin topbar — Direction D shell chrome.
 *
 * Spec ("Top · Topbar"): 10/28 px padding. Crumb on the left in
 * `--d-ink-2` with `/` separators in muted, then today's date. Right
 * cluster: ghost icon buttons + ghost "Exportera" + one primary
 * "Skapa" in `--d-ink` (NOT terracotta — ink-on-cream for global CRUD
 * actions; terracotta is reserved for in-page commit moments).
 *
 * Cmd-K palette is mounted here and opens from three sources: the
 * Cmd/Ctrl-K shortcut, the bare `c` key (the "Skapa" hint), and the
 * sidebar search button via the `admin-cmdk` window event.
 */

// Top-level admin segment → crumb label. Mirrors AdminBreadcrumbs'
// dictionary but only the first segment is shown in the topbar (the
// page H1 carries the rest), keeping the chrome quiet.
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
  seo: "SEO",
  innehall: "Innehåll",
  "ingredient-pins": "Ingredienspinnar",
  rapporter: "Rapporter",
  moms: "Momsrapport",
  installningar: "Inställningar",
  system: "System",
  etiketter: "Etikett-preview",
};

const DATE_FMT = new Intl.DateTimeFormat("sv-SE", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function AdminTopbar() {
  const pathname = usePathname();
  const [cmdkOpen, setCmdkOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const typing =
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable);
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setCmdkOpen((o) => !o);
        return;
      }
      // Bare `c` opens the palette (the "Skapa" hint). Suppressed while
      // typing and when a chord/modifier is active.
      if (
        !typing &&
        !isMod &&
        !e.altKey &&
        (e.key === "c" || e.key === "C")
      ) {
        setCmdkOpen(true);
      }
    }
    function onCmdkEvent() {
      setCmdkOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("admin-cmdk", onCmdkEvent as EventListener);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("admin-cmdk", onCmdkEvent as EventListener);
    };
  }, []);

  const segs = (pathname ?? "/admin").split("/").filter(Boolean); // ["admin", ...]
  const topSeg = segs[1] ?? "admin";
  const crumb = SEGMENT_LABELS[topSeg] ?? "Översikt";
  const today = DATE_FMT.format(new Date());

  return (
    <>
      <div className="sticky top-0 z-20 bg-[var(--d-bg)]/90 backdrop-blur-md border-b border-[var(--d-line)]">
        <div className="flex items-center gap-3 h-[48px] px-6 md:px-8 lg:px-9">
          {/* Crumb + date */}
          <nav
            aria-label="Brödsmulor"
            className="flex items-center gap-1.5 min-w-0 pl-9 lg:pl-0"
          >
            <Link
              href="/admin"
              className="font-sans text-[13.5px] text-[var(--d-ink-2)] hover:text-[var(--d-ink)] transition-colors truncate"
            >
              {crumb}
            </Link>
            <span aria-hidden className="text-[var(--d-muted)] text-[13px]">
              /
            </span>
            <span className="font-sans text-[13.5px] text-[var(--d-ink-3)] truncate">
              {today}
            </span>
          </nav>

          <div className="ml-auto flex items-center gap-1">
            {/* Filter — opens the Cmd-K palette (search/jump/filter
                entry point) so the affordance isn't dead. */}
            <button
              type="button"
              onClick={() => setCmdkOpen(true)}
              data-admin-compact
              className="hidden sm:inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[6px] font-sans text-[13px] font-medium text-[var(--d-ink-2)] hover:bg-[var(--d-surface)] hover:text-[var(--d-ink)] transition-colors"
            >
              <SlidersHorizontal size={13} strokeWidth={1.75} aria-hidden />
              Filter
            </button>
            {/* Period — the dashboard windows on a fixed 30 days
                (getDailyMetrics/30, rolling-30 cohorts). Rendered as a
                context chip, not a dropdown, until a real period
                switcher is wired. */}
            <span
              className="hidden md:inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[6px] border border-[var(--d-line)] bg-[var(--d-surface)] font-sans text-[13px] font-medium text-[var(--d-ink-2)]"
              title="Översikten visar rullande 30 dagar"
            >
              <Calendar size={13} strokeWidth={1.75} aria-hidden />
              30 dagar
              <ChevronDown
                size={12}
                strokeWidth={2}
                aria-hidden
                className="text-[var(--d-muted)]"
              />
            </span>
            <TopbarIcon href="/admin" label="Senaste aktivitet" icon={Bell} />
            <TopbarIcon href="/hjalp" label="Hjälp" icon={HelpCircle} />
            <Link
              href="/admin/moms"
              data-admin-compact
              className="hidden sm:inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[6px] font-sans text-[13px] font-medium text-[var(--d-ink-2)] hover:bg-[var(--d-surface)] hover:text-[var(--d-ink)] transition-colors"
            >
              <Download size={13} strokeWidth={1.75} aria-hidden />
              Exportera
            </Link>
            <button
              type="button"
              onClick={() => setCmdkOpen(true)}
              data-admin-compact
              className="inline-flex items-center gap-1.5 h-7 pl-2 pr-1.5 rounded-[6px] bg-[var(--d-ink)] text-[var(--d-bg)] font-sans text-[13px] font-semibold hover:bg-[var(--d-ink-2)] transition-colors"
            >
              <Plus size={13} strokeWidth={2.25} aria-hidden />
              Skapa
              <span className="ml-0.5 inline-flex items-center justify-center w-[15px] h-[15px] rounded-[3px] bg-[var(--d-bg)]/15 font-mono text-[10px] font-semibold">
                C
              </span>
            </button>
          </div>
        </div>
      </div>

      <CmdK open={cmdkOpen} onOpenChange={setCmdkOpen} />
    </>
  );
}

function TopbarIcon({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      data-admin-compact
      className="w-7 h-7 inline-flex items-center justify-center rounded-[5px] text-[var(--d-ink-3)] hover:bg-[var(--d-surface)] hover:text-[var(--d-ink)] transition-colors"
    >
      <Icon size={15} strokeWidth={1.75} />
    </Link>
  );
}
