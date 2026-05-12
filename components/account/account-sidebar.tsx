"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/auth/sign-out-button";

type NavItem = {
  href: string;
  label: string;
  /** Match this path AND any sub-paths. */
  matchPrefix?: boolean;
};

const NAV: NavItem[] = [
  { href: "/konto", label: "Översikt" },
  { href: "/konto/ordrar", label: "Mina ordrar", matchPrefix: true },
  { href: "/konto/profil", label: "Profil" },
  { href: "/konto/adresser", label: "Adresser" },
  { href: "/konto/sakerhet", label: "Säkerhet" },
];

export function AccountSidebar({
  greetingName,
}: {
  greetingName?: string | null;
}) {
  const pathname = usePathname();

  return (
    <aside className="lg:sticky lg:top-8 self-start w-full lg:w-[260px] flex-shrink-0">
      <div className="bg-surface-alt border border-border rounded-2xl p-5">
        {greetingName && (
          <div className="px-2 mb-4">
            <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-ink-mute font-semibold">
              Inloggad som
            </p>
            <p className="font-display text-[18px] font-medium tracking-tight text-primary-deep mt-0.5 leading-tight">
              {greetingName}
            </p>
          </div>
        )}
        <nav aria-label="Konto-navigation" className="flex flex-col gap-0.5">
          {NAV.map((n) => {
            const active = n.matchPrefix
              ? pathname.startsWith(n.href)
              : pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "px-3 py-2.5 rounded-lg font-sans text-[14px] font-medium transition-colors",
                  active
                    ? "bg-primary text-surface"
                    : "text-ink-body hover:bg-surface-warm hover:text-primary-deep"
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 pt-4 border-t border-border">
          <SignOutButton variant="ghost" className="w-full justify-start" />
        </div>
      </div>
    </aside>
  );
}
