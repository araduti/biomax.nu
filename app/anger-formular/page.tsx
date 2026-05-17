import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/site/legal-page";

export const metadata: Metadata = {
  title: "Ångerblankett — Biomax",
  description:
    "Konsumentverkets standardformulär för utövande av ångerrätt. Använd om du vill häva ditt köp inom 14 dagar.",
  alternates: { canonical: "/anger-formular" },
};

export default function AngerFormularPage() {
  return (
    <LegalPage
      title="Ångerblankett"
      eyebrow="Konsumentverkets standardformulär"
      intro="Använd den här blanketten om du vill utöva din ångerrätt enligt distansavtalslagen. Du kan också meddela formfritt via e-post att du vill ångra köpet."
      lastUpdated="2026-05-17"
      reviewedByLegal
    >
      <p>
        Du har rätt att frånträda köpet inom 14 dagar från det att du tagit
        emot varan. Skicka den ifyllda blanketten till oss antingen via
        e-post eller med vanlig post.
      </p>

      <h2>Skicka blanketten till</h2>
      <p>
        <strong>Biomax Handelsbolag</strong>
        <br />
        Eken Hälsobutik
        <br />
        Ekenleden 15A, 428 36 Kållered
        <br />
        E-post:{" "}
        <a href="mailto:kontakt@biomax.nu">kontakt@biomax.nu</a>
      </p>

      <h2>Standardformulär</h2>
      <p>
        Texten nedan följer Konsumentverkets standardformulär. Du kan kopiera
        innehållet till ett mejl och fylla i det direkt, eller skriva ut sidan
        och skicka per post.
      </p>

      <div className="rounded-2xl border border-border bg-surface px-5 md:px-6 py-5 my-6 font-sans text-[14px] leading-[1.8] text-ink-body whitespace-pre-line">
        {`Till: Biomax Handelsbolag, Ekenleden 15A, 428 36 Kållered, kontakt@biomax.nu

Jag/vi (*) meddelar härmed att jag/vi (*) frånträder mitt/vårt (*) köpeavtal avseende följande varor (*) / tjänster (*):

________________________________________________________________________

Beställdes den / mottogs den (*):

________________________________________________________________________

Konsumentens / konsumenternas namn:

________________________________________________________________________

Konsumentens / konsumenternas adress:

________________________________________________________________________

Konsumentens / konsumenternas underskrift (endast om denna blankett meddelas på papper):

________________________________________________________________________

Datum:

________________________________________________________________________

(*) Stryk det som inte är tillämpligt.`}
      </div>

      <h2>Returinstruktioner efter ångermeddelande</h2>
      <ul>
        <li>
          Skicka tillbaka varan i obrutet originalskick inom 14 dagar från
          ditt ångermeddelande.
        </li>
        <li>Returfrakten betalar du själv om inget annat avtalats.</li>
        <li>
          Återbetalning sker inom 14 dagar, räknat från den dag vi tagit emot
          varan eller den dag du visat att den skickats tillbaka — det som
          inträffar först. Pengarna betalas tillbaka till samma betalmetod
          som du använde vid köpet.
        </li>
      </ul>

      <h2>Officiell källa</h2>
      <p>
        Formuläret bygger på Konsumentverkets standardformulär för utövande av
        ångerrätt. För den officiella versionen, se{" "}
        <a
          href="https://www.konsumentverket.se/for-foretagare/forsaljnings--och-betalningsvillkor/distans--och-hemforsaljningslagen-distansavtalslagen/standardformular-for-utovande-av-angerratt/"
          target="_blank"
          rel="noopener noreferrer"
        >
          konsumentverket.se
        </a>
        .
      </p>

      <p className="text-[13px] text-ink-mute italic mt-6">
        Mer information om dina rättigheter finns på{" "}
        <Link href="/villkor">köp- &amp; leveransvillkor</Link> och{" "}
        <Link href="/frakt-och-retur">frakt &amp; retur</Link>.
      </p>
    </LegalPage>
  );
}
