import type { Metadata } from "next";
import Link from "next/link";
import { Display, Eyebrow } from "@/components/ui/typography";
import { JsonLd } from "@/components/seo/json-ld";
import { SectionLayout } from "@/components/site/section-layout";
import { organizationLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "Om oss — kunskapsföretaget bakom våra produkter",
  description:
    "Biomax HB grundades 2001 av familjen Raduti i Kållered. Vi är ett kunskapsföretag som importerar, utvecklar och marknadsför hälsokostprodukter — sedan tjugofem år.",
  alternates: { canonical: "/om-oss" },
};

export default function OmOssPage() {
  const crumbs = [
    { label: "Hem", href: "/" },
    { label: "Om oss", href: "/om-oss" },
  ];

  return (
    <SectionLayout section="biomax" crumbs={crumbs}>
      <JsonLd data={organizationLd()} />

      <header className="mb-12 md:mb-16">
        <Eyebrow>Kunskapsföretaget</Eyebrow>
        <Display as="h1" size="hero" className="mt-3">
          Om Biomax.
        </Display>
        <blockquote className="mt-7 border-l-2 border-accent pl-5 font-display italic text-xl md:text-2xl text-ink-body leading-snug max-w-[640px]">
          För varje läkemedel som gynnar patienten, finns det ett naturligt
          ämne som kan uppnå samma effekt.
        </blockquote>
      </header>

      <article className="prose-biomax font-sans text-[16.5px] md:text-[17px] leading-[1.8] text-ink-body space-y-6">
        <p>
          Biomax HB är ett kunskapsföretag som importerar, utvecklar och
          marknadsför hälsokostprodukter som bidrar till ökad livskvalitet för
          den enskilda individen. Vi grundades år 2001 av familjen Raduti i
          Kållered söder om Göteborg och har drivit verksamheten oavbrutet
          sedan dess — samma familj, samma övertygelse, samma fysiska butik.
        </p>

        <h2 className="font-display text-2xl md:text-[28px] font-medium tracking-tight text-primary-deep mt-12 mb-4">
          Vår vision
        </h2>
        <p>
          Vår vision är att öka välbefinnandet i ett samhälle där individen
          själv behöver ta ansvar för sin egen hälsa. När Constantin Raduti
          startade Biomax 2001 var idén enkel: gör kosttillskott som du själv
          skulle vilja ta, och förklara varför de fungerar i klartext. Vi
          kallar det fortfarande för vår ledstjärna — översätt forskningen,
          gömma den inte bakom marknadsföring.
        </p>
        <p>
          På den tiden bestod marknaden för kosttillskott i Sverige
          huvudsakligen av importerade produkter med stora löften och liten
          transparens. Vi tog en annan väg: standardiserade extrakt, tydlig
          märkning av aktiva substanser, och en redaktionell ambition kring
          innehållet på förpackningen.
        </p>

        <h2 className="font-display text-2xl md:text-[28px] font-medium tracking-tight text-primary-deep mt-12 mb-4">
          Klinisk dokumentation som grund
        </h2>
        <p>
          Vi fokuserar mest på nya, innovativa produkter av hög kvalitet med
          betoning på säkerhet och effektivitet. Kunden ska alltid kunna känna
          sig säker på att våra produkter är välbeprövade och att
          produktinformationen bygger på klinisk dokumentation. Vi tar
          löpande in nya råvaror — främst från USA men även från andra länder
          som ligger långt före oss inom alternativmedicin.
        </p>
        <p>
          Vår{" "}
          <Link
            href="/kunskap/ingredienser"
            className="text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent transition-colors"
          >
            kunskapsbank
          </Link>{" "}
          är ett uttryck för det här arbetet. Varje ingrediens vi använder
          har en egen monografi som beskriver vad ämnet är, hur det fungerar
          biokemiskt, och vilka av våra produkter som innehåller det. Den
          sortens transparens är ovanlig i branschen — och vi tycker att det
          är konstigt att den är det.
        </p>

        <h2 className="font-display text-2xl md:text-[28px] font-medium tracking-tight text-primary-deep mt-12 mb-4">
          Personliga möten i Kållered
        </h2>
        <p>
          Vi har även en fysisk butik — <strong>Eken Hälsobutik</strong> på
          Ekenleden 15A i Kållered — där vi inriktat oss på speciella
          produkter inom hälsokost. Du är välkommen att{" "}
          <Link
            href="/behandlingar"
            className="text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent transition-colors"
          >
            boka en konsultation, håranalys eller laserbehandling
          </Link>{" "}
          — eller bara titta in för en pratstund. Det är medvetet långsamt
          tempo i butiken; räkna med tid att läsa, jämföra och diskutera.
        </p>

        <h2 className="font-display text-2xl md:text-[28px] font-medium tracking-tight text-primary-deep mt-12 mb-4">
          Tjugofem år och fortsättning
        </h2>
        <p>
          Det går snabbt i kosttillskottsbranschen. Trender kommer och går,
          ingredienser blir omhuldade och sedan ifrågasatta. Vi har sett
          tillräckligt mycket av det för att veta att stabilitet är en
          kvalitet i sig. Det vi sålde 2001 säljer vi fortfarande, för det
          var byggt på något — och det vi adderar nu adderar vi när
          forskningsläget bedöms som tillräckligt moget.
        </p>
        <p>
          Vår förhoppning är att fler personer upptäcker möjligheten att
          förbättra sitt liv genom att ge kroppen det stöd som behövs för
          hälsa och vitalitet. Tack för att du valt en svensk producent.
          Det betyder något för oss.
        </p>
      </article>

      <section
        id="aterforsaljare"
        className="mt-16 md:mt-20 rounded-2xl border border-accent/30 bg-accent/[0.06] px-6 md:px-7 py-6 md:py-7"
      >
        <Eyebrow>Återförsäljare</Eyebrow>
        <h2 className="mt-2 font-display text-2xl md:text-[26px] font-medium tracking-tight text-primary-deep mb-3">
          Vill du sälja Biomax?
        </h2>
        <p className="font-sans text-[15.5px] text-ink-body leading-relaxed">
          För information om hur du blir återförsäljare av våra produkter,
          mejla{" "}
          <a
            href="mailto:kontakt@biomax.nu"
            className="text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent transition-colors"
          >
            kontakt@biomax.nu
          </a>{" "}
          så återkommer vi.
        </p>
      </section>

      <aside className="mt-12 md:mt-14 pt-10 border-t border-border-soft">
        <Eyebrow>Besök oss</Eyebrow>
        <h2 className="mt-2 font-display text-2xl md:text-[26px] font-medium tracking-tight text-primary-deep mb-4">
          Eken Hälsobutik · Kållered
        </h2>
        <address className="not-italic font-sans text-[15.5px] text-ink-body leading-relaxed">
          Ekenleden 15A
          <br />
          428 36 Kållered
          <br />
          Västra Götaland
        </address>
        <p className="mt-3 font-sans text-[14.5px] text-ink-mute leading-relaxed">
          Tis–Fre 10:00–18:00 · Lör 10:00–15:00
        </p>
        <p className="mt-4 font-sans text-[14px] text-ink-mute">
          Söder om Göteborg, lättåtkomligt med bil eller pendel.{" "}
          <Link
            href="/butik"
            className="text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent transition-colors"
          >
            Mer om butiken →
          </Link>
        </p>
      </aside>
    </SectionLayout>
  );
}
