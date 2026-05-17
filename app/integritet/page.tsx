import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/site/legal-page";

export const metadata: Metadata = {
  title: "Integritetspolicy — Biomax",
  description:
    "Hur Biomax behandlar dina personuppgifter enligt GDPR. Vad vi samlar in, varför, hur länge, och dina rättigheter.",
  alternates: { canonical: "/integritet" },
};

export default function IntegritetPage() {
  return (
    <LegalPage
      title="Integritetspolicy"
      eyebrow="GDPR"
      intro="Hur vi samlar in, använder och skyddar dina personuppgifter — och hur du utövar dina rättigheter."
      lastUpdated="2026-05-17"
      reviewedByLegal
    >
      <h2>Personuppgiftsansvarig</h2>
      <p>
        <strong>Biomax Handelsbolag</strong>, org.nr{" "}
        <strong>969676-7939</strong>, med besöksadress Eken Hälsobutik,
        Ekenleden 15A, 428 36 Kållered, är personuppgiftsansvarig för
        behandlingen av dina personuppgifter på biomax.nu. Du når oss på{" "}
        <a href="mailto:kontakt@biomax.nu">kontakt@biomax.nu</a>.
      </p>

      <h2>Vilka uppgifter vi behandlar och varför</h2>
      <p>
        Vi samlar in personuppgifter i den utsträckning det behövs för att vi
        ska kunna leverera de tjänster du förväntar dig av oss.
      </p>
      <h3>När du beställer</h3>
      <ul>
        <li>
          <strong>Identifierings- och kontaktuppgifter:</strong> namn, adress,
          e-post, telefonnummer.
        </li>
        <li>
          <strong>Orderuppgifter:</strong> de produkter du beställer, ordervärde,
          ordernummer.
        </li>
        <li>
          <strong>Betalningsuppgifter:</strong> hanteras direkt av Klarna eller
          kortinlösare. Vi lagrar aldrig själva kortuppgifter eller komplett
          personnummer.
        </li>
      </ul>
      <h3>När du skapar konto</h3>
      <ul>
        <li>
          E-postadress och ett lösenord som lagras i hashad, oläsbar form.
        </li>
        <li>Sparade leveransadresser och orderhistorik.</li>
      </ul>
      <h3>När du besöker biomax.nu</h3>
      <ul>
        <li>
          Tekniska uppgifter (IP-adress, webbläsarversion, sidvisningar) för att
          driva sajten och förbättra prestandan. Om vi använder analysverktyg
          samlas de uppgifterna in i anonymiserad eller pseudonymiserad form.
        </li>
        <li>
          Kakor (cookies) som behövs för inloggning och varukorg. Se vår{" "}
          <Link href="/gdpr">GDPR-sida</Link> för fullständig kakhantering.
        </li>
      </ul>
      <h3>När du prenumererar på nyhetsbrev</h3>
      <ul>
        <li>
          E-postadress och eventuellt namn. Du kan när som helst avregistrera dig
          via länken i varje utskick.
        </li>
      </ul>

      <h2>Rättslig grund</h2>
      <ul>
        <li>
          <strong>Avtal:</strong> för att fullgöra köpet du gjort med oss.
        </li>
        <li>
          <strong>Rättslig förpliktelse:</strong> för att uppfylla
          bokförings-, skatte- och konsumentlagstiftning.
        </li>
        <li>
          <strong>Berättigat intresse:</strong> för att skydda mot bedrägeri och
          för grundläggande webbplatsanalys.
        </li>
        <li>
          <strong>Samtycke:</strong> för marknadsföringsutskick. Samtycket kan
          dras tillbaka när som helst.
        </li>
      </ul>

      <h2>Hur länge vi sparar uppgifter</h2>
      <p>
        Orderuppgifter sparas i sju år enligt bokföringslagen. Konto- och
        kontaktuppgifter sparas så länge du har ett aktivt konto. Vid radering
        av kontot anonymiseras uppgifterna, utom sådant som måste sparas av
        rättsliga skäl.
      </p>

      <h2>Vilka vi delar uppgifter med</h2>
      <p>
        Vi delar bara uppgifter med leverantörer som behöver dem för att vi ska
        kunna leverera till dig:
      </p>
      <ul>
        <li>
          <strong>Klarna/Kustom</strong> (betal- och kassalösning) — egen
          personuppgiftsansvarig för betalningen.
        </li>
        <li>
          <strong>PostNord</strong> eller motsvarande fraktbolag — för leverans
          och spårning.
        </li>
        <li>
          <strong>Brevo</strong> — transaktionell e-post och eventuellt
          nyhetsbrev. Datacenter inom EU.
        </li>
        <li>
          <strong>Plausible</strong> — webbanalys utan kakor och utan att
          bygga någon personlig profil. EU-baserad.
        </li>
        <li>
          <strong>Sentry</strong> — felövervakning, endast om det är aktiverat
          för driften. Används för att upptäcka och rätta tekniska fel.
        </li>
        <li>
          <strong>Vår hostingleverantör</strong> (Ampliosoft) — drift av
          biomax.nu och databasen, på servrar inom EU/Sverige.
        </li>
      </ul>
      <p>
        Vi säljer aldrig uppgifter till tredje part. Skulle en leverantör
        behöva behandla uppgifter utanför EU/EES sker det endast med en giltig
        skyddsmekanism, t.ex. EU-kommissionens standardavtalsklausuler (SCC).
      </p>

      <h2>Automatiserat beslutsfattande</h2>
      <p>
        Vi använder inte automatiserat beslutsfattande eller profilering som
        har rättsliga följder för dig eller på liknande sätt påverkar dig
        i betydande grad. Vårt lojalitetsprogram (Familjen Biomax) räknar
        endast poäng utifrån dina köp och fattar inga sådana beslut.
      </p>

      <h2>Dina rättigheter</h2>
      <p>
        Enligt GDPR har du rätt att få veta vilka uppgifter vi har om dig, få
        dem rättade, raderade, eller begränsade — och att få ut dem i ett
        portabelt format. Du har också rätt att invända mot behandling som
        baseras på berättigat intresse, och att dra tillbaka samtycke till
        marknadsföring. Se vår dedikerade <Link href="/gdpr">GDPR-sida</Link>{" "}
        för hur du utövar varje rättighet.
      </p>

      <h2>Klagomål</h2>
      <p>
        Tycker du att vi behandlar dina uppgifter felaktigt? Hör av dig till oss
        i första hand på <a href="mailto:kontakt@biomax.nu">kontakt@biomax.nu</a>.
        Du har också rätt att lämna klagomål till{" "}
        <a
          href="https://www.imy.se"
          target="_blank"
          rel="noopener noreferrer"
        >
          Integritetsskyddsmyndigheten (IMY)
        </a>
        .
      </p>

      <h2>Ändringar i policyn</h2>
      <p>
        Vid materiella förändringar publicerar vi en ny version här med ett
        uppdaterat datum högst upp.
      </p>
    </LegalPage>
  );
}
