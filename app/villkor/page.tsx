import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/site/legal-page";

export const metadata: Metadata = {
  title: "Köp- & leveransvillkor — Biomax",
  description:
    "Allmänna villkor vid köp på biomax.nu — distansavtal, ångerrätt, leverans, retur och garantier för konsumenter.",
  alternates: { canonical: "/villkor" },
};

export default function VillkorPage() {
  return (
    <LegalPage
      title="Köp- & leveransvillkor"
      eyebrow="Konsumentavtal"
      intro="Villkoren för köp på biomax.nu, formulerade enligt distansavtalslagen och konsumentköplagen."
      lastUpdated="2026-05-17"
      reviewedByLegal
    >
      <h2>Säljaren</h2>
      <p>
        Säljare är <strong>Biomax Handelsbolag</strong>, org.nr{" "}
        <strong>969676-7939</strong>, med besöksadress Eken Hälsobutik,
        Ekenleden 15A, 428 36 Kållered. Du når oss på{" "}
        <a href="mailto:kontakt@biomax.nu">kontakt@biomax.nu</a>.
      </p>

      <h2>Vem dessa villkor gäller</h2>
      <p>
        Villkoren gäller för konsumenter som beställer från biomax.nu. Köp ska
        göras av person som är 18 år eller äldre, eller med målsmans samtycke.
        Vi säljer endast inom Sverige.
      </p>
      <p>
        Vi riktar inte vår marknadsföring mot minderåriga och använder inga
        direkta köpuppmaningar gentemot barn eller ungdomar. Om vi mottar en
        beställning som vi har anledning att tro är gjord av en minderårig
        utan målsmans samtycke kontaktar vi kunden och kan annullera ordern.
      </p>

      <h2>Beställning och avtalsslut</h2>
      <p>
        Avtal sluts när vi bekräftar din beställning via e-post. Vi förbehåller
        oss rätten att annullera en order vid uppenbara prisfel, vid utebliven
        betalning eller om en produkt är slut i lager.
      </p>

      <h2>Priser</h2>
      <p>
        Alla priser anges i svenska kronor inklusive 6 % moms (kosttillskott).
        Frakt tillkommer enligt vad som visas i kassan. Vid order över 499 kr är
        frakten gratis.
      </p>

      <h2>Betalning</h2>
      <p>
        Vi erbjuder Klarna (faktura med 30 dagars betalning, kortbetalning,
        delbetalning), Visa, Mastercard och Swish. Klarnas egna villkor gäller
        för Klarna-tjänster.
      </p>

      <h2>Leverans</h2>
      <ul>
        <li>
          Order som läggs på vardagar före kl 13 packas och skickas samma dag.
        </li>
        <li>Standardleveranstid: 1–3 vardagar inom Sverige med PostNord.</li>
        <li>
          Vid eventuella förseningar utöver utlovad tid hör vi av oss. Du har
          alltid rätt att häva avtalet om vi inte kan leverera inom rimlig tid.
        </li>
      </ul>

      <h2>Ångerrätt</h2>
      <p>
        Du har 14 dagars ångerrätt enligt distansavtalslagen, räknat från den
        dag du tagit emot varan. Utöver det erbjuder vi ytterligare 14 dagars
        öppet köp — totalt <strong>30 dagars öppet köp</strong> på obrutna
        förpackningar.
      </p>
      <p>
        För att utnyttja ångerrätten meddelar du oss innan ångerfristen gått
        ut. Du kan antingen mejla{" "}
        <a href="mailto:kontakt@biomax.nu">kontakt@biomax.nu</a> formfritt,
        eller använda <Link href="/anger-formular">Konsumentverkets
        standardformulär</Link>. Vi bekräftar att vi mottagit ditt
        ångermeddelande. Returnera sedan varan i obrutet originalskick inom
        14 dagar från ditt ångermeddelande. Returfrakten betalar du själv om
        inget annat avtalats.
      </p>
      <p>
        Brutna eller använda förpackningar omfattas inte av ångerrätten av
        livsmedels- och hygienskäl.
      </p>
      <p>
        Vi kan göra ett <strong>värdeminskningsavdrag</strong> för värdesänkning
        som beror på att du hanterat varan i större utsträckning än vad som var
        nödvändigt för att fastställa dess egenskaper eller funktion — till
        exempel om förpackningen brutits eller varan använts. Vid avdrag
        informerar vi dig om grund och belopp innan återbetalning.
      </p>

      <h2>Återbetalning</h2>
      <p>
        Vid godkänd retur återbetalas hela orderbeloppet (inklusive ursprunglig
        standardfrakt) inom 14 dagar. Fristen räknas från den dag vi tagit emot
        varan eller från den dag du visat att den skickats tillbaka — det som
        inträffar först. Vi använder samma betalmetod som vid köpet om inget
        annat avtalats.
      </p>

      <h2>Reklamation och garantier</h2>
      <p>
        Enligt konsumentköplagen (2022:260) har du rätt att reklamera
        ursprungliga fel i upp till <strong>tre år</strong> från det att du
        tagit emot varan. Reklamationen ska göras inom <strong>skälig tid</strong>{" "}
        efter att du upptäckt eller borde ha upptäckt felet; en reklamation som
        görs inom två månader anses alltid ha lämnats i tid.
      </p>
      <p>
        Visar sig ett fel inom <strong>två år</strong> från leveransen antas
        felet ha funnits redan vid leveransen, om vi inte kan visa något annat
        eller det är oförenligt med varans art (för kosttillskott t.ex. en
        passerad bäst-före-dag vid normal förvaring).
      </p>
      <p>
        Vid godkänd reklamation har du rätt att i första hand få varan lagad
        eller ersatt utan kostnad, inklusive eventuell frakt. Om reparation
        eller utbyte inte är möjligt kan du i stället få prisavdrag eller
        häva köpet och få hela köpeskillingen återbetald — inklusive
        ursprunglig fraktkostnad. Vid försenade leveranser har du också
        särskilda rättigheter enligt konsumentlagstiftningen.
      </p>
      <p>
        Hör av dig till{" "}
        <a href="mailto:kontakt@biomax.nu">kontakt@biomax.nu</a> så snart du
        upptäckt felet, helst med bild och ordernummer.
      </p>

      <h2>Tvister</h2>
      <p>
        Vid tvist försöker vi alltid komma överens först. Lyckas det inte kan
        du kostnadsfritt vända dig till{" "}
        <a
          href="https://www.arn.se"
          target="_blank"
          rel="noopener noreferrer"
        >
          Allmänna reklamationsnämnden (ARN)
        </a>{" "}
        (Box 174, 101 23 Stockholm). Vi följer ARN:s rekommendationer. Bor du
        i ett annat EU/EES-land kan du vända dig till motsvarande organ för
        alternativ tvistlösning i ditt hemland. Tvister avgörs i sista hand av
        svensk allmän domstol med tillämpning av svensk rätt.
      </p>

      <h2>Personuppgifter</h2>
      <p>
        Vi behandlar dina uppgifter enligt vår{" "}
        <Link href="/integritet">integritetspolicy</Link>.
      </p>

      <h2>Force majeure</h2>
      <p>
        Vi är inte ansvariga för förseningar eller utebliven leverans till följd
        av omständigheter utanför vår kontroll (t.ex. transportstopp, naturkatastrof,
        myndighetsbeslut).
      </p>
    </LegalPage>
  );
}
