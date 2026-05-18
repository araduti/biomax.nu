import type { Metadata } from "next";
import { Display, Eyebrow } from "@/components/ui/typography";
import { JsonLd } from "@/components/seo/json-ld";
import { SectionLayout } from "@/components/site/section-layout";

const SITE = "https://www.biomax.nu";

export const metadata: Metadata = {
  title: "Butik i Kållered",
  description:
    "Eken Hälsobutik på Ekenleden 15A i Kållered är Biomax fysiska butik. Hela sortimentet, personlig rådgivning, samma familj som driver biomax.nu.",
  alternates: { canonical: "/butik" },
};

// LocalBusiness JSON-LD for the physical butik. We use `Store` (the generic
// LocalBusiness retail type) rather than `Pharmacy` — Eken Hälsobutik is a
// hälsofackhandel, not an apotek; using `Pharmacy` triggers Google rich-result
// criteria that expect prescription dispensing.
//
// Closed days (Sunday, Monday) are intentionally omitted from
// `openingHoursSpecification` — schema.org treats unlisted days as closed.
// Google's LocalBusiness guide endorses this pattern.
const localBusinessLd = {
  "@context": "https://schema.org",
  "@type": "Store",
  name: "Eken Hälsobutik",
  alternateName: "Biomax butik",
  description:
    "Hälsofackhandel i Kållered söder om Göteborg. Kosttillskott, naturpreparat och konsultationer / håranalys / laserbehandling i butik. Drivs av Biomax HB sedan 2001.",
  url: `${SITE}/butik`,
  image: `${SITE}/brand/logo-mark.png`,
  email: "kontakt@biomax.nu",
  priceRange: "$$",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Ekenleden 15A",
    postalCode: "428 36",
    addressLocality: "Kållered",
    addressRegion: "Västra Götalands län",
    addressCountry: "SE",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 57.6035,
    longitude: 12.048,
  },
  areaServed: { "@type": "Country", name: "Sverige" },
  parentOrganization: { "@type": "Organization", name: "Biomax HB", url: SITE },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "10:00",
      closes: "18:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Saturday",
      opens: "10:00",
      closes: "15:00",
    },
  ],
};

export default function ButikPage() {
  const crumbs = [
    { label: "Hem", href: "/" },
    { label: "Butik i Kållered", href: "/butik" },
  ];

  return (
    <SectionLayout section="biomax" crumbs={crumbs}>
      <JsonLd data={localBusinessLd} />

      <header className="mb-10 md:mb-14">
        <Eyebrow>Eken Hälsobutik · Hälsofackhandel sedan 2001</Eyebrow>
        <Display as="h1" size="xl" className="mt-3">
          Butiken i Kållered.
        </Display>
        <p className="mt-5 font-display italic text-xl md:text-2xl text-ink-mute leading-snug max-w-[640px]">
          Hela vårt sortiment finns i butik. Du är välkommen in för att
          ställa frågor, boka en konsultation, eller bara säga hej.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
        <div className="bg-surface-alt border border-border rounded-2xl p-6">
          <Eyebrow>Adress</Eyebrow>
          <p className="mt-3 font-display text-lg font-medium text-primary-deep">
            Eken Hälsobutik
          </p>
          <address className="mt-1 not-italic font-sans text-body-lg text-ink-body leading-relaxed">
            Ekenleden 15A
            <br />
            428 36 Kållered
            <br />
            Västra Götaland
          </address>
          <a
            href="https://maps.google.com/?q=Ekenleden%2015A,%20428%2036%20K%C3%A5llered"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 font-sans text-small font-semibold text-accent-deep hover:text-primary-deep transition-colors"
          >
            Visa på karta <span aria-hidden>↗</span>
          </a>
        </div>
        <div className="bg-surface-alt border border-border rounded-2xl p-6">
          <Eyebrow>Öppettider</Eyebrow>
          <dl className="mt-3 font-sans text-body-lg text-ink-body leading-relaxed grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
            <dt className="font-semibold">Tis–Fre</dt>
            <dd>10:00–18:00</dd>
            <dt className="font-semibold">Lör</dt>
            <dd>10:00–15:00</dd>
            <dt className="text-ink-mute">Sön</dt>
            <dd className="text-ink-mute">Stängt</dd>
            <dt className="text-ink-mute">Mån</dt>
            <dd className="text-ink-mute">Stängt</dd>
          </dl>
        </div>
      </div>

      <div className="bg-surface-alt border border-border rounded-2xl p-6 mb-12">
        <Eyebrow>Hitta hit</Eyebrow>
        <ul className="mt-3 space-y-2 font-sans text-body text-ink-body leading-relaxed">
          <li>
            <strong className="font-semibold">Bil:</strong> Cirka 15 min söder
            om Göteborg via E6/E20, avfart Kållered.
          </li>
          <li>
            <strong className="font-semibold">Pendel:</strong> Kållered station —
            kort promenad till Ekenleden.
          </li>
          <li>
            <strong className="font-semibold">Buss:</strong> Hållplats Kållered
            Centrum.
          </li>
        </ul>
      </div>

      <article className="prose-biomax font-sans text-lead md:text-lead leading-[1.75] text-ink-body space-y-5">
        <p>
          I butiken hittar du hela det sortiment vi säljer på biomax.nu, plus
          möjligheten att ställa frågor till någon som faktiskt vet svaret.
          Vi tar löpande in nya produkter — främst från USA men även från
          andra länder som ligger långt före oss inom alternativmedicin.
        </p>
        <p>
          Du kan också{" "}
          <a
            href="/behandlingar"
            className="text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent transition-colors"
          >
            boka en konsultation, håranalys eller laserbehandling
          </a>{" "}
          — eller bara titta in för en pratstund.
        </p>
        <p>
          Familjen som driver Biomax är ofta i butiken. Det är inget
          kedjeapotek-tempo här. Räkna med tid att läsa, jämföra och
          diskutera. Det är medvetet.
        </p>
      </article>

      <aside className="mt-12 pt-10 border-t border-border-soft">
        <p className="font-sans text-body text-ink-mute italic">
          Helgdagar och eventuella kortare stängningar kan påverka öppettiderna
          — mejla{" "}
          <a
            href="mailto:kontakt@biomax.nu"
            className="text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent transition-colors"
          >
            kontakt@biomax.nu
          </a>{" "}
          om du kommer långväga och vill kolla först.
        </p>
      </aside>
    </SectionLayout>
  );
}
