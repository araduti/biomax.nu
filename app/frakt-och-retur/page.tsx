import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/site/legal-page";

export const metadata: Metadata = {
  title: "Frakt, retur och återbetalning — Biomax",
  description:
    "Frakt, leverans, retur och återbetalning när du handlar hos Biomax. Fri frakt över 499 kr, 30 dagars öppet köp, återbetalning inom 14 dagar från det att vi mottagit returen.",
  alternates: { canonical: "/frakt-och-retur" },
};

export default function FraktOchReturPage() {
  return (
    <LegalPage
      title="Frakt, retur och återbetalning"
      eyebrow="Praktisk info"
      intro="Hur leveransen fungerar, vad det kostar, och hur du gör om du vill returnera eller få pengarna tillbaka."
      lastUpdated="2026-05-10"
      reviewedByLegal
    >
      <h2>Fraktkostnad</h2>
      <ul>
        <li>
          <strong>Standardfrakt inom Sverige:</strong> 49 kr.
        </li>
        <li>
          <strong>Fri frakt</strong> vid order över 499 kr.
        </li>
        <li>
          <strong>Utomlands:</strong> Vi skickar idag endast inom Sverige.
        </li>
      </ul>

      <h2>Leveranstid</h2>
      <ul>
        <li>
          Order som läggs <strong>vardagar före kl 13</strong> packas och
          skickas samma dag.
        </li>
        <li>
          Order som läggs efter kl 13, helger eller röda dagar skickas nästa
          vardag.
        </li>
        <li>
          Normal leveranstid med PostNord är <strong>1–3 vardagar</strong>{" "}
          inom Sverige.
        </li>
      </ul>

      <h2>Spårning</h2>
      <p>
        När din order skickats får du en e-post med spårningslänk. Med PostNords
        app kan du även styra utlämnandet till ett annat ombud eller en annan
        adress.
      </p>

      <h2>Om paketet inte kommer fram</h2>
      <p>
        Om paketet inte hämtats ut inom 14 dagar returneras det till oss. Då
        debiteras en avgift på 199 kr för returfrakt och hantering. För att
        undvika detta — håll utkik efter avi från PostNord och hämta i tid.
      </p>

      <h2 id="retur">Ångerrätt, retur och återbetalning</h2>
      <p>
        Du har <strong>30 dagars öppet köp</strong> på obrutna förpackningar
        (14 dagar lagstadgad ångerrätt + 14 dagars frivillig garanti från oss).
        Brutna eller använda förpackningar omfattas inte av ångerrätten av
        livsmedels- och hygieniska skäl.
      </p>

      <h3>Så här returnerar du</h3>
      <ol className="list-decimal pl-6 space-y-1.5">
        <li>
          Skicka ett mejl till{" "}
          <a href="mailto:kontakt@biomax.nu">kontakt@biomax.nu</a> med ditt
          ordernummer och vilka produkter du vill returnera.
        </li>
        <li>Vi bekräftar och skickar returinstruktioner.</li>
        <li>
          Skicka tillbaka varan i obrutet originalskick. Du betalar
          returfrakten om inget annat avtalats.
        </li>
      </ol>

      <h3 id="aterbetalning">Återbetalning</h3>
      <p>
        När vi mottagit din retur i godtagbart skick återbetalar vi inom{" "}
        <strong>14 dagar</strong> till samma betalmetod som du använde vid köpet.
        Vid Klarna-betalning ser du återbetalningen i Klarnas app eller på
        ditt kontoutdrag. Eventuell returfrakt återbetalas inte (såvida inte
        produkten var defekt eller felaktigt levererad).
      </p>

      <h2>Reklamation</h2>
      <p>
        Är produkten defekt vid mottagandet, eller om något skett under
        transporten — hör av dig så snart som möjligt. Vi ersätter eller
        återbetalar enligt konsumentköplagens regler om reklamation.
      </p>

      <h2>Detaljerade villkor</h2>
      <p>
        För fullständig juridisk text, se våra{" "}
        <Link href="/villkor">köp- &amp; leveransvillkor</Link>.
      </p>
    </LegalPage>
  );
}
