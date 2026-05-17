import type { Metadata } from "next";
import Link from "next/link";
import { Display, Eyebrow } from "@/components/ui/typography";
import { SectionLayout } from "@/components/site/section-layout";

export const metadata: Metadata = {
  title: "Behandlingar",
  description:
    "Konsultation, håranalys och laserbehandling i Eken Hälsobutik i Kållered. Mejla kontakt@biomax.nu för aktuella tider och tidsbokning.",
  alternates: { canonical: "/behandlingar" },
};

const TREATMENTS = [
  {
    title: "Konsultation",
    summary:
      "Personligt samtal i butiken där vi går igenom vad du vill uppnå och vilka kosttillskott eller livsstilsåtgärder som kan vara relevanta. Inte ett ersätt för läkarbesök — komplement.",
  },
  {
    title: "Håranalys",
    summary:
      "Mineral- och spårämnesanalys baserad på ett hårprov. Ger en ögonblicksbild av kroppens mineralbalans över de senaste månaderna och kan vägleda vidare åtgärder.",
  },
  {
    title: "Laserbehandling",
    summary:
      "Behandling med medicinsk laser. Beroende på indikation används olika våglängder och program — vi går igenom detaljerna i samband med tidsbokningen.",
  },
];

export default function BehandlingarPage() {
  const crumbs = [
    { label: "Hem", href: "/" },
    { label: "Behandlingar", href: "/behandlingar" },
  ];

  return (
    <SectionLayout section="biomax" crumbs={crumbs}>
      <header className="mb-12 md:mb-14">
        <Eyebrow>I butiken</Eyebrow>
        <Display as="h1" size="xl" className="mt-3">
          Personlig rådgivning &amp; behandlingar.
        </Display>
        <p className="mt-5 font-display italic text-xl md:text-2xl text-ink-mute leading-snug max-w-[640px]">
          Förutom att sälja kosttillskott erbjuder Eken Hälsobutik i Kållered
          tre olika tjänster — alla på plats hos oss.
        </p>
      </header>

      <ul className="space-y-5 mb-12">
        {TREATMENTS.map((t) => (
          <li
            key={t.title}
            className="bg-surface-alt border border-border rounded-2xl p-6 md:p-7"
          >
            <h2 className="font-display text-2xl md:text-[26px] font-medium tracking-tight text-primary-deep mb-3">
              {t.title}
            </h2>
            <p className="font-sans text-[15.5px] text-ink-body leading-[1.7]">
              {t.summary}
            </p>
          </li>
        ))}
      </ul>

      <div className="rounded-2xl border border-accent/30 bg-accent/[0.06] px-6 md:px-7 py-6">
        <Eyebrow>Tidsbokning</Eyebrow>
        <h2 className="mt-2 font-display text-xl md:text-[22px] font-medium tracking-tight text-primary-deep mb-3">
          Mejla för aktuella tider och pris
        </h2>
        <p className="font-sans text-[15px] text-ink-body leading-relaxed">
          Tider och prislistor uppdateras löpande. Hör av dig till{" "}
          <a
            href="mailto:kontakt@biomax.nu"
            className="text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent transition-colors"
          >
            kontakt@biomax.nu
          </a>{" "}
          eller{" "}
          <Link
            href="/butik"
            className="text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent transition-colors"
          >
            besök butiken
          </Link>{" "}
          så hjälper vi dig boka.
        </p>
      </div>

      <aside className="mt-12 pt-8 border-t border-border-soft">
        <p className="font-sans text-[13px] text-ink-mute italic leading-relaxed">
          Vi ger inga medicinska diagnoser eller råd som ersätter läkarbesök.
          För medicinska frågor — kontakta din vårdcentral eller{" "}
          <a
            href="https://www.1177.se"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent transition-colors"
          >
            1177 Vårdguiden
          </a>
          .
        </p>
      </aside>
    </SectionLayout>
  );
}
