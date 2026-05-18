import Image from "next/image";
import { Display, Eyebrow } from "@/components/ui/typography";
import { ButtonLink } from "@/components/ui/button";
import { Section } from "@/components/ui/section";

export function FounderBand() {
  return (
    <Section tone="deep">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-14 lg:gap-20 items-center">
        {/* Founder portrait with editorial treatments */}
        <div className="relative aspect-[4/5] rounded-3xl overflow-hidden border border-surface/10 bg-primary-deep">
          <Image
            src="/brand/founder/constantin.jpg"
            alt="Constantin Raduti, grundare av Biomax 2001"
            fill
            sizes="(max-width: 1024px) 100vw, 45vw"
            quality={85}
            style={{
              objectFit: "cover",
              objectPosition: "center 22%",
              filter: "contrast(1.04) saturate(0.78) brightness(0.96)",
            }}
          />
          {/* Top + bottom darkening */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(180deg, rgba(15,36,64,0.35) 0%, rgba(15,36,64,0.05) 30%, rgba(15,36,64,0.05) 60%, rgba(15,36,64,0.55) 100%)",
            }}
          />
          {/* Edge vignette */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 80% 70% at 50% 38%, transparent 0%, transparent 45%, rgba(15,36,64,0.55) 100%)",
            }}
          />
          {/* Sage soft-light tint */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none bg-accent opacity-[0.14] mix-blend-soft-light"
          />
          {/* Caption */}
          <div className="absolute left-6 right-6 bottom-6 flex flex-col gap-1">
            <span className="font-sans text-micro font-bold uppercase tracking-[0.24em] text-accent-on-dark">
              Grundare · Sedan 2001
            </span>
            <span className="font-display text-2xl md:text-[26px] font-medium tracking-tight text-surface leading-tight">
              Constantin Raduti
            </span>
          </div>
        </div>

        {/* Quote block */}
        <div>
          <Eyebrow className="text-accent-on-dark">Vår berättelse · Sedan 2001</Eyebrow>
          <Display
            size="xl"
            as="p"
            className="text-surface mt-5 mb-7"
          >
            <em className="italic text-accent font-normal">
              &ldquo;För varje läkemedel
            </em>{" "}
            som gynnar patienten finns ett naturligt ämne som kan uppnå samma
            effekt.&rdquo;
          </Display>
          <p className="font-sans text-base md:text-lg leading-relaxed text-surface/80 max-w-[560px] mb-8">
            Det var övertygelsen som fick Constantin Raduti att grunda Biomax 2001. Sedan
            dess har vi sökt naturpreparat med klinisk dokumentation — från de länder som
            ligger längst fram inom alternativ medicin. Vi väljer hellre färre produkter
            med riktig forskning bakom, än hela hyllor utan substans.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink
              href="/om-oss"
              variant="primary"
              className="bg-accent-on-dark text-primary-deep hover:bg-accent-deep hover:text-surface"
            >
              Läs hela berättelsen
            </ButtonLink>
            <ButtonLink href="/behandlingar" variant="inverted-outline">
              Boka konsultation
            </ButtonLink>
          </div>
        </div>
      </div>
    </Section>
  );
}
