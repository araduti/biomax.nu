import type { ReactNode } from "react";
import Link from "next/link";
import { Display, Eyebrow } from "@/components/ui/typography";
import { SectionLayout } from "@/components/site/section-layout";
import type { SectionId } from "@/lib/site/sections";

/**
 * Legal/policy shell. Plugs the standard "Hjälp & juridik" left-rail nav into
 * SectionLayout, and centralises the editorial header + draft-pending notice
 * so each policy page just supplies its body content.
 *
 * When copy is lawyer-vetted, flip `reviewedByLegal={true}` and the
 * "Förhandsversion" banner disappears.
 */
export function LegalPage({
  title,
  eyebrow,
  intro,
  lastUpdated,
  reviewedByLegal = false,
  section = "help",
  children,
}: {
  title: string;
  eyebrow: string;
  intro: string;
  lastUpdated: string;
  reviewedByLegal?: boolean;
  section?: SectionId;
  children: ReactNode;
}) {
  const crumbs = [
    { label: "Hem", href: "/" },
    { label: title, href: "#" },
  ];

  return (
    <SectionLayout section={section} crumbs={crumbs}>
      <header className="mb-10 md:mb-14">
        <Eyebrow>{eyebrow}</Eyebrow>
        <Display as="h1" size="xl" className="mt-3">
          {title}
        </Display>
        <p className="mt-5 font-display italic text-xl md:text-2xl text-ink-mute leading-snug max-w-[640px]">
          {intro}
        </p>
        <p className="mt-6 font-sans text-caption uppercase tracking-[0.18em] font-semibold text-ink-soft">
          Senast uppdaterad: {lastUpdated}
        </p>
      </header>

      {!reviewedByLegal && (
        <div className="mb-10 rounded-2xl border border-status-warn/30 bg-status-warn/[0.06] px-5 py-4 font-sans text-small text-status-warn-text leading-relaxed">
          <strong className="font-semibold">Förhandsversion.</strong>{" "}
          Innehållet på den här sidan är ett utkast som ska granskas av jurist
          före lansering. Reglerna nedan är formulerade utifrån gällande svensk
          konsumentlagstiftning och GDPR, men ska inte betraktas som juridisk
          vägledning förrän den är verifierad.
        </div>
      )}

      <article className="prose-biomax font-sans text-body-lg md:text-lead leading-[1.75] text-ink-body space-y-5 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-medium [&_h2]:tracking-tight [&_h2]:text-primary-deep [&_h2]:mt-12 [&_h2]:mb-4 [&_h3]:font-display [&_h3]:text-xl [&_h3]:font-medium [&_h3]:text-primary-deep [&_h3]:mt-8 [&_h3]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5 [&_a]:text-primary-deep [&_a]:underline [&_a]:decoration-accent/40 [&_a]:underline-offset-[3px] hover:[&_a]:decoration-accent">
        {children}
      </article>

      <aside className="mt-14 pt-8 border-t border-border-soft">
        <p className="font-sans text-small text-ink-mute italic leading-relaxed">
          Frågor kring detta?{" "}
          <Link
            href="/kontakt"
            className="text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent transition-colors"
          >
            Kontakta oss →
          </Link>
        </p>
      </aside>
    </SectionLayout>
  );
}
