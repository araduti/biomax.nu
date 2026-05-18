import Link from "next/link";
import type { ReactNode } from "react";
import { BiomaxLogo } from "@/components/brand/BiomaxLogo";
import { Display, Eyebrow } from "@/components/ui/typography";

/**
 * Centered auth-page shell. Used for /logga-in, /skapa-konto,
 * /glomt-losenord, /aterstall-losenord. Minimal chrome — just the logo,
 * the form, and a small footer link to switch flows.
 */
export function AuthShell({
  eyebrow,
  title,
  intro,
  children,
  footer,
}: {
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="border-b border-border bg-surface-alt">
        <div className="max-w-[1240px] mx-auto px-6 md:px-8 py-5">
          <Link href="/" aria-label="Biomax — startsidan" className="inline-flex flex-col gap-1">
            <BiomaxLogo height={32} className="text-primary" />
            <span className="font-sans text-micro uppercase tracking-[0.24em] text-ink-mute font-medium pl-0.5">
              Sedan 2001 · Kållered
            </span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center py-12 md:py-20 px-6">
        <div className="w-full max-w-[440px]">
          <div className="text-center mb-10">
            <Eyebrow>{eyebrow}</Eyebrow>
            <Display as="h1" size="lg" className="mt-3">
              {title}
            </Display>
            {intro && (
              <p className="mt-4 font-sans text-base text-ink-mute leading-relaxed">
                {intro}
              </p>
            )}
          </div>

          <div className="bg-surface-alt border border-border rounded-2xl p-7 md:p-9 shadow-sm">
            {children}
          </div>

          {footer && (
            <p className="mt-6 text-center font-sans text-small text-ink-mute">
              {footer}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
