"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { BEHOV_LABELS } from "@/lib/symptoms/behov-labels";

/**
 * Mobile drawer nav for the public header.
 *
 * The public `<Header>` hides its `<nav>` below `lg` (1024 px). That
 * worked when the site was browsed primarily on desktop, but our
 * audience skews 45-70+ on phones — leaving them with only the logo and
 * cart visible is a usability failure. This component surfaces the
 * primary nav (Produkter, Hjälp mig välja, Kunskap, Om oss, Mitt konto)
 * behind a hamburger button that's visible below `lg` only.
 *
 * The Behov dropdown is flattened into a list of links inside the
 * drawer — a nested dropdown inside a drawer adds two interactions to
 * reach the same destination; one flat list is faster.
 *
 * Drawer trap: `body { overflow: hidden }` while open, escape-to-close,
 * scrim click closes. Same conventions as the admin sidebar's mobile
 * mode so users don't relearn the gesture between site and admin.
 */
export function MobileNav({
  signedIn,
}: {
  signedIn: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close on route change — without this, tapping a link opens the new
  // page with the drawer still on top of it.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while open so the drawer doesn't scroll the page
  // underneath it.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Escape closes — common keyboard expectation for modals/drawers.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Öppna meny"
        aria-expanded={open}
        aria-controls="mobile-nav-drawer"
        onClick={() => setOpen(true)}
        className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-full hover:bg-surface-warm transition-colors text-ink-body"
      >
        <Menu size={22} strokeWidth={1.75} aria-hidden />
      </button>

      {open && (
        <>
          {/* Scrim — clicking outside the drawer closes it. */}
          <button
            type="button"
            aria-label="Stäng meny"
            onClick={() => setOpen(false)}
            className="lg:hidden fixed inset-0 z-40 bg-black/45 backdrop-blur-sm"
          />

          <div
            id="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Huvudnavigation"
            className="lg:hidden fixed top-0 right-0 bottom-0 z-50 w-[88vw] max-w-[360px] bg-surface border-l border-border shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-soft">
              <p className="font-sans text-micro uppercase tracking-[0.2em] text-ink-soft font-semibold">
                Meny
              </p>
              <button
                type="button"
                aria-label="Stäng meny"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-warm transition-colors text-ink-body"
              >
                <X size={20} strokeWidth={1.75} aria-hidden />
              </button>
            </div>

            <nav
              aria-label="Sidor"
              className="flex-1 overflow-y-auto px-2 py-3"
            >
              <DrawerLink href="/produkter" label="Produkter" />
              <DrawerLink href="/paket" label="Paket" />
              <DrawerLink href="/hjalp-mig-valja" label="Hjälp mig välja" />

              <DrawerGroup label="Efter behov">
                {BEHOV_LABELS.map((b) => (
                  <DrawerSubLink
                    key={b.slug}
                    href={`/behov/${b.slug}`}
                    label={b.label}
                  />
                ))}
              </DrawerGroup>

              <DrawerLink href="/kunskap" label="Kunskap" />
              <DrawerLink href="/om-oss" label="Om oss" />

              <div className="my-3 mx-3 border-t border-border-soft" />

              <DrawerLink href="/sok" label="Sök" />
              {signedIn ? (
                <DrawerLink href="/konto" label="Mitt konto" />
              ) : (
                <DrawerLink href="/logga-in" label="Logga in" />
              )}
            </nav>

            <div className="px-5 py-4 border-t border-border-soft">
              <p className="font-sans text-micro text-ink-soft">
                Biomax HB · Sedan 2001 · Kållered
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function DrawerLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block px-4 min-h-12 flex items-center rounded-md font-sans text-body-lg text-ink-body font-medium hover:bg-surface-warm hover:text-primary transition-colors"
    >
      {label}
    </Link>
  );
}

function DrawerGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-2">
      <p className="px-4 pt-3 pb-1 font-sans text-micro uppercase tracking-[0.16em] text-ink-soft font-semibold">
        {label}
      </p>
      {children}
    </div>
  );
}

function DrawerSubLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block px-4 min-h-11 flex items-center rounded-md font-sans text-body text-ink-mute hover:bg-surface-warm hover:text-primary transition-colors"
    >
      {label}
    </Link>
  );
}
