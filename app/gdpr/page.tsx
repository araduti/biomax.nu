import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/site/legal-page";

export const metadata: Metadata = {
  title: "Dina GDPR-rättigheter",
  description:
    "Hur du utövar dina rättigheter enligt GDPR hos Biomax: registerutdrag, rättelse, radering, dataportabilitet, invändning och återkallande av samtycke.",
  alternates: { canonical: "/gdpr" },
};

export default function GdprPage() {
  return (
    <LegalPage
      title="Dina GDPR-rättigheter"
      eyebrow="Praktiskt"
      intro="Konkreta steg för att utöva varje rättighet du har enligt EU:s dataskyddsförordning."
      lastUpdated="2026-05-17"
      reviewedByLegal
    >
      <p>
        Vår fullständiga{" "}
        <Link href="/integritet">integritetspolicy</Link> beskriver vad vi
        samlar in och varför. Den här sidan svarar på den enklare frågan:{" "}
        <em>hur</em> gör jag om jag vill utöva en rättighet?
      </p>

      <h2>Sammanfattning av dina rättigheter</h2>
      <ul>
        <li>
          <strong>Registerutdrag</strong> — få ut alla personuppgifter vi har
          om dig.
        </li>
        <li>
          <strong>Rättelse</strong> — få felaktiga uppgifter korrigerade.
        </li>
        <li>
          <strong>Radering</strong> — bli &quot;glömd&quot; (med vissa
          undantag i lag).
        </li>
        <li>
          <strong>Begränsning</strong> — pausa behandlingen av dina uppgifter.
        </li>
        <li>
          <strong>Dataportabilitet</strong> — få dina uppgifter i ett
          maskinläsbart format.
        </li>
        <li>
          <strong>Invändning</strong> — motsätta dig behandling som baseras på
          berättigat intresse.
        </li>
        <li>
          <strong>Återkalla samtycke</strong> — t.ex. avregistrera nyhetsbrev.
        </li>
      </ul>

      <h2>Hur du gör i praktiken</h2>

      <h3>1. Registerutdrag, rättelse, radering eller portabilitet</h3>
      <p>
        Skicka ett mejl till{" "}
        <a href="mailto:kontakt@biomax.nu">kontakt@biomax.nu</a> från den
        e-postadress som är registrerad hos oss. Skriv vilken rättighet du vill
        utöva. Vi svarar utan onödigt dröjsmål och senast inom en månad. Är
        ärendet komplext eller om vi tagit emot många begäranden kan tiden
        förlängas med ytterligare två månader; vi informerar dig i så fall
        inom en månad om förlängningen och skälen till den (GDPR art. 12.3).
      </p>
      <p>
        Vid radering tar vi bort alla uppgifter som inte måste sparas av
        rättsliga skäl (t.ex. bokföringsunderlag, som enligt lag ska sparas i
        sju år).
      </p>

      <h3>2. Avregistrera nyhetsbrev</h3>
      <p>
        Klicka på &quot;Avregistrera&quot; längst ner i valfritt utskick. Det
        avregistrerar dig direkt — du behöver inte kontakta oss.
      </p>

      <h3>3. Cookies & analys</h3>
      <p>
        Vid första besöket på biomax.nu kan vi visa en samtyckesruta för kakor
        där du väljer vilka kakor som får användas. Du kan när som helst ändra
        ditt val via webbläsarens inställningar eller genom att radera kakorna
        för biomax.nu.
      </p>
      <p>
        Nödvändiga kakor (inloggning, varukorg) används utan samtycke
        eftersom sajten inte fungerar utan dem.
      </p>

      <h3>4. Klagomål till tillsynsmyndighet</h3>
      <p>
        Om du tycker att vi inte hanterar din begäran korrekt kan du lämna ett
        klagomål till{" "}
        <a
          href="https://www.imy.se"
          target="_blank"
          rel="noopener noreferrer"
        >
          Integritetsskyddsmyndigheten (IMY)
        </a>
        .
      </p>

      <h2>Hur vi verifierar din identitet</h2>
      <p>
        För att skydda dig mot att någon annan begär ut dina uppgifter ber vi
        dig kontakta oss från den e-postadress som finns registrerad på ditt
        konto eller som du har använt vid en tidigare beställning. Vid behov av
        ytterligare verifiering hör vi av oss.
      </p>
    </LegalPage>
  );
}
