import type { Metadata } from "next";
import Link from "next/link";
import { Display, Eyebrow } from "@/components/ui/typography";
import { JsonLd } from "@/components/seo/json-ld";
import { SectionLayout } from "@/components/site/section-layout";
import { organizationLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "Kontakt",
  description:
    "Kontakta Biomax. Telefon, e-post och adress till vår butik och vårt lager i Kållered. Vi svarar oftast samma dag.",
  alternates: { canonical: "/kontakt" },
};

export default function KontaktPage() {
  const crumbs = [
    { label: "Hem", href: "/" },
    { label: "Kontakt", href: "/kontakt" },
  ];

  return (
    <SectionLayout section="biomax" crumbs={crumbs}>
      <JsonLd data={organizationLd()} />

      <header className="mb-12 md:mb-14">
        <Eyebrow>Hör av dig</Eyebrow>
        <Display as="h1" size="xl" className="mt-3">
          Kontakt.
        </Display>
        <p className="mt-5 font-display italic text-xl md:text-2xl text-ink-mute leading-snug max-w-[640px]">
          Familjeföretag i Kållered, samma adress sedan 2001. Vi svarar
          oftast samma vardag.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6 mb-12">
        <Card title="E-post" eyebrow="Snabbast">
          <a
            href="mailto:kontakt@biomax.nu"
            className="font-display text-xl text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent transition-colors break-all"
          >
            kontakt@biomax.nu
          </a>
          <p className="mt-3 font-sans text-body text-ink-mute leading-relaxed">
            Vi svarar inom <strong>48 timmar</strong> (oftast samma arbetsdag)
            på alla typer av frågor — beställning, leverans, reklamation,
            ångerrätt och personuppgifter (GDPR). Bifoga gärna ordernummer.
            Även för{" "}
            <Link
              href="/om-oss#aterforsaljare"
              className="text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent transition-colors"
            >
              återförsäljarfrågor
            </Link>
            .
          </p>
        </Card>
        <Card title="Besök oss" eyebrow="I Kållered">
          <p className="font-display text-xl text-primary-deep">
            Eken Hälsobutik
          </p>
          <p className="mt-2 font-sans text-body text-ink-mute leading-relaxed">
            Tis–Fre 10:00–18:00 · Lör 10:00–15:00. Personlig rådgivning,
            konsultation och hela sortimentet i butik.
          </p>
        </Card>
      </div>

      <div className="bg-surface-alt border border-border rounded-2xl p-6 md:p-8">
        <Eyebrow>Besöksadress & lager</Eyebrow>
        <h2 className="mt-2 font-display text-xl md:text-[22px] font-medium tracking-tight text-primary-deep mb-3">
          Biomax HB · Eken Hälsobutik
        </h2>
        <address className="not-italic font-sans text-body-lg text-ink-body leading-relaxed">
          Ekenleden 15A
          <br />
          428 36 Kållered
          <br />
          Västra Götaland · Sverige
        </address>
        <p className="mt-4 font-sans text-body text-ink-mute leading-relaxed">
          <Link
            href="/butik"
            className="text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent transition-colors"
          >
            Mer om butiken & vägbeskrivning →
          </Link>
        </p>
      </div>

      <aside className="mt-12 pt-10 border-t border-border-soft">
        <p className="font-sans text-body text-ink-mute italic leading-relaxed">
          För frågor om dina personuppgifter, se vår{" "}
          <Link
            href="/integritet"
            className="text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent transition-colors"
          >
            integritetspolicy
          </Link>
          . För frågor om köpvillkor, se{" "}
          <Link
            href="/villkor"
            className="text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent transition-colors"
          >
            köp- &amp; leveransvillkor
          </Link>
          .
        </p>
      </aside>
    </SectionLayout>
  );
}

function Card({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface-alt border border-border rounded-2xl p-6 md:p-7 h-full flex flex-col">
      <p className="font-sans text-micro uppercase tracking-[0.22em] font-semibold text-accent-deep mb-1">
        {eyebrow}
      </p>
      <h2 className="font-display text-2xl font-medium tracking-tight text-primary-deep mb-3">
        {title}
      </h2>
      {children}
    </div>
  );
}
