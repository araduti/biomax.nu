import Link from "next/link";
import { BiomaxLogo } from "@/components/brand/BiomaxLogo";
import { currentUser } from "@/lib/session";
import { CartButton } from "@/components/cart/cart-button";
import { BehovNav } from "@/components/site/behov-nav";
import { BEHOV_LABELS } from "@/lib/symptoms/behov-labels";

// "Efter behov" replaces the old "Hjälp" link as the goal-first shopping
// primitive (research note 2026-05-13). Renders as a dropdown to give
// customers a one-glance map of the 10 behovsområden.
const NAV = [
  { label: "Produkter", href: "/produkter" },
  { label: "Paket", href: "/paket" },
  { label: "Hjälp mig välja", href: "/hjalp-mig-valja" },
  { label: "Kunskap", href: "/kunskap" },
  { label: "Om oss", href: "/om-oss" },
];

export async function Header() {
  const user = await currentUser();
  return (
    <header className="bg-surface border-b border-border">
      <div className="max-w-[1240px] mx-auto px-6 md:px-8 py-5 flex items-center justify-between gap-8">
        <Link href="/" aria-label="Biomax — startsidan" className="flex flex-col gap-1">
          <BiomaxLogo height={32} className="text-primary" />
          <span className="font-sans text-[9px] uppercase tracking-[0.24em] text-ink-mute font-medium pl-0.5">
            Sedan 2001 · Kållered
          </span>
        </Link>
        <nav
          aria-label="Huvudnavigation"
          className="hidden lg:flex items-center gap-8 font-sans text-[15px] text-ink-body font-medium"
        >
          <Link href="/produkter" className="hover:text-primary transition-colors">
            Produkter
          </Link>
          <BehovNav items={BEHOV_LABELS} />
          {NAV.filter((n) => n.label !== "Produkter").map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="hover:text-primary transition-colors"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 font-sans text-sm text-ink-body">
          <Link
            href="/sok"
            className="hidden md:inline px-3 py-2 rounded-full hover:bg-surface-warm transition-colors"
            aria-label="Sök"
          >
            Sök
          </Link>
          {user ? (
            <Link
              href="/konto"
              className="hidden md:inline px-3 py-2 rounded-full hover:bg-surface-warm transition-colors text-ink-body"
            >
              Mitt konto
            </Link>
          ) : (
            <Link
              href="/logga-in"
              className="hidden md:inline px-3 py-2 rounded-full hover:bg-surface-warm transition-colors text-ink-body"
            >
              Logga in
            </Link>
          )}
          <CartButton />
        </div>
      </div>
    </header>
  );
}
