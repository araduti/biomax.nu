import type { Metadata } from "next";
import Link from "next/link";
import { Display, Eyebrow } from "@/components/ui/typography";
import { JsonLd } from "@/components/seo/json-ld";
import { SectionLayout } from "@/components/site/section-layout";
import { faqLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "Vanliga frågor — Biomax",
  description:
    "Svar på de vanligaste frågorna om Biomax kosttillskott — leveranser, retur, betalning, ingredienser och vår familjeägda historia sedan 2001.",
  alternates: { canonical: "/faq" },
};

type FaqGroup = {
  heading: string;
  items: { question: string; answer: string }[];
};

const FAQ_GROUPS: FaqGroup[] = [
  {
    heading: "Beställning & leverans",
    items: [
      {
        question: "Hur lång leveranstid har ni?",
        answer:
          "Order som läggs på vardagar före kl 13 packas och skickas samma dag. Normal leveranstid med PostNord är 1–3 vardagar inom Sverige.",
      },
      {
        question: "Vad kostar frakten?",
        answer:
          "Standardfrakt inom Sverige är 49 kr. Vid order över 499 kr är frakten gratis.",
      },
      {
        question: "Skickar ni till andra länder?",
        answer:
          "Nej. biomax.nu skickar idag endast inom Sverige. Vi har ingen plan på att börja sälja utomlands — vi vill kunna stå för svenska leveranstider och svensk kundservice.",
      },
      {
        question: "Kan jag ångra mitt köp?",
        answer:
          "Ja. Vi följer distansavtalslagen och du har 14 dagars ångerrätt från det att du tagit emot varan, samt ytterligare 14 dagar utöver det enligt vår egna garanti — totalt 30 dagars öppet köp på obrutna förpackningar.",
      },
    ],
  },
  {
    heading: "Betalning",
    items: [
      {
        question: "Vilka betalsätt accepterar ni?",
        answer:
          "Klarna (faktura med 30 dagars betalning, kortbetalning eller delbetalning), Visa, Mastercard och Swish.",
      },
      {
        question: "Är det säkert att betala på biomax.nu?",
        answer:
          "Ja. All betalning hanteras via Klarna respektive bankernas egna 3D Secure-flöden — vi tar aldrig emot kortuppgifter direkt och lagrar inte betaldetaljer på vår server.",
      },
    ],
  },
  {
    heading: "Produkter & ingredienser",
    items: [
      {
        question: "Är Biomax produkter testade?",
        answer:
          "Våra råvaror kommer från etablerade europeiska leverantörer med kvalitetsdokumentation och analys per batch. Slutproducerade satser kontrolleras enligt gällande svensk och europeisk lagstiftning för kosttillskott.",
      },
      {
        question: "Var hittar jag fullständig innehållsförteckning?",
        answer:
          "Varje produktsida har en fullständig innehållstabell, dosering, förvaring och eventuella varningstexter. För djupare information om enskilda råvaror har vi en kunskapsbank med vetenskapliga monografier.",
      },
      {
        question: "Är era produkter kosttillskott eller läkemedel?",
        answer:
          "Kosttillskott. Vi gör inga medicinska påståenden om våra produkter. Innehåll, doser och beskrivningar är formulerade enligt svensk och europeisk lagstiftning för kosttillskott.",
      },
      {
        question: "Vad gör Biomax annorlunda än andra kosttillskottsmärken?",
        answer:
          "Vi är ett svenskt familjeföretag som drivit samma verksamhet i tjugofem år, från samma adress i Kållered. Vi tillverkar och lagerhåller själva, vi är öppna med både innehåll och forskningsläget bakom våra produkter, och vi importerar inte färdiga märken — vi formulerar.",
      },
    ],
  },
  {
    heading: "Personuppgifter & sekretess",
    items: [
      {
        question: "Hur hanterar ni mina personuppgifter?",
        answer:
          "Vi behandlar dina uppgifter enligt GDPR. Detaljerad information finns i vår integritetspolicy.",
      },
      {
        question: "Säljer ni mina uppgifter vidare?",
        answer:
          "Nej. Vi säljer inga personuppgifter. Vi delar dem endast med de leverantörer vi behöver för att kunna leverera din beställning (PostNord, Klarna) eller skicka transaktionell e-post.",
      },
      {
        question: "Hur kontaktar jag er?",
        answer:
          "Skicka e-post till kontakt@biomax.nu så svarar vi så snart vi kan. Vi har idag ingen kundtjänst per telefon — all kommunikation går via mejl så att vi kan dokumentera ditt ärende ordentligt.",
      },
    ],
  },
  {
    heading: "Prenumeration",
    items: [
      {
        question: "Hur fungerar prenumeration?",
        answer:
          "Välj \"Prenumerera\" på en produktsida — du får 10 % rabatt på varje leverans och kan välja intervall (varje månad, varannan månad eller varje kvartal). Du måste vara inloggad. Hantera, pausa eller avsluta från /konto/prenumerationer.",
      },
      {
        question: "Kan jag avsluta prenumerationen när som helst?",
        answer:
          "Ja, helt utan kostnad. Inga bindningstider, inga avgifter. Du kan också pausa tillfälligt och återuppta senare.",
      },
      {
        question: "När blir nästa leverans betald?",
        answer:
          "Innan varje leverans skickar vi en orderbekräftelse där betalningen genomförs på samma sätt som vid ett vanligt köp. Du har då möjlighet att ändra eller avbryta innan paketet packas.",
      },
    ],
  },
  {
    heading: "Innehåll & säkerhet",
    items: [
      {
        question: "Är produkterna veganska / glutenfria / laktosfria?",
        answer:
          "Det varierar per produkt — vi har kapslar i veganska skal och kapslar med gelatin. Allergeninformation enligt EU 1169/2011 finns markerad i en gul ruta på varje produktsida. Läs alltid hela innehållsförteckningen om du har en känd intolerans eller allergi.",
      },
      {
        question: "Är era produkter testade?",
        answer:
          "Råvarorna analyseras av leverantören enligt gällande EU-regler för kosttillskott. För många ingredienser finns det dessutom oberoende publicerade studier som vi beskriver i kunskapsbanken under varje monografi.",
      },
      {
        question: "Kan jag kombinera flera tillskott samtidigt?",
        answer:
          "I de flesta fall ja, men vissa kombinationer (särskilt med receptbelagda läkemedel) kan vara problematiska. Rådfråga läkare eller apotekspersonal om du tar mediciner regelbundet.",
      },
    ],
  },
];

const ALL_ITEMS = FAQ_GROUPS.flatMap((g) => g.items);

export default function FaqPage() {
  const crumbs = [
    { label: "Hem", href: "/" },
    { label: "Vanliga frågor", href: "/faq" },
  ];

  return (
    <SectionLayout section="help" crumbs={crumbs}>
      <JsonLd data={faqLd(ALL_ITEMS)} />

      <header className="mb-10 md:mb-14">
        <Eyebrow>Vanliga frågor</Eyebrow>
        <Display as="h1" size="xl" className="mt-3">
          Det vi får frågor om.
        </Display>
        <p className="mt-5 font-display italic text-xl md:text-2xl text-ink-mute leading-snug max-w-[640px]">
          Hittar du inte svar här —{" "}
          <Link
            href="/kontakt"
            className="underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent transition-colors"
          >
            hör av dig
          </Link>
          .
        </p>
      </header>

      <div className="space-y-12 md:space-y-14">
        {FAQ_GROUPS.map((group) => (
          <section key={group.heading}>
            <h2 className="font-display text-2xl md:text-[28px] font-medium tracking-tight text-primary-deep mb-6 pb-3 border-b border-border-soft">
              {group.heading}
            </h2>
            <ul className="space-y-6">
              {group.items.map((it, i) => (
                <li key={i}>
                  <h3 className="font-display text-[19px] md:text-xl font-medium text-primary-deep mb-2 leading-snug">
                    {it.question}
                  </h3>
                  <p className="font-sans text-[15.5px] text-ink-body leading-[1.7]">
                    {it.answer}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </SectionLayout>
  );
}
