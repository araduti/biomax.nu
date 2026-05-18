import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/site/top-bar";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Display, Eyebrow } from "@/components/ui/typography";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbLd } from "@/lib/jsonld";
import { getAllSymptoms } from "@/lib/symptoms/registry";

const SITE = "https://www.biomax.nu";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Shop efter behov — sömn, stress, mage, leder, urinvägar",
  description:
    "Hitta tillskott utifrån vad du upplever, inte vad ingredienserna heter. Sömn & vila, stress & oro, urinvägar, mage & tarm, immunförsvar, leder, energi.",
  alternates: { canonical: "/hjalp" },
};

export default function HjalpIndexPage() {
  const symptoms = getAllSymptoms();
  const crumbs = [
    { label: "Hem", href: "/" },
    { label: "Efter behov", href: "/hjalp" },
  ];

  return (
    <>
      <TopBar />
      <Header />
      <JsonLd data={breadcrumbLd(crumbs)} />
      <main>
        <div className="max-w-[1240px] mx-auto px-6 md:px-8 pt-8 pb-4">
          <Breadcrumb crumbs={crumbs} />
        </div>

        <section className="bg-surface-warm py-14 md:py-20 px-6 md:px-8">
          <div className="max-w-[820px] mx-auto">
            <Eyebrow className="mb-3">Efter behov</Eyebrow>
            <Display as="h1" size="xl">
              Vad behöver din kropp just nu?
            </Display>
            <p className="mt-6 font-sans text-base md:text-lg leading-relaxed text-ink-mute max-w-[640px]">
              Välj område — vi visar dig produkterna vi själva har erfarenhet
              av, tillsammans med en kort översikt över de örter, aminosyror
              och näringsämnen som traditionellt använts inom det området.
            </p>
            <p className="mt-4 font-sans text-body text-ink-soft max-w-[640px]">
              Det här är ingen ersättning för sjukvård. Vid ihållande eller
              akuta besvär — kontakta läkare.
            </p>
          </div>
        </section>

        <section className="max-w-[1240px] mx-auto px-6 md:px-8 py-14 md:py-20">
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {symptoms.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/hjalp/${s.slug}`}
                  className="group block bg-surface-alt border border-border rounded-2xl p-6 md:p-8 hover:border-border-soft transition-colors"
                >
                  <Eyebrow className="mb-3">{s.shortTitle}</Eyebrow>
                  <h2 className="font-display text-xl md:text-2xl font-medium tracking-tight text-primary-deep mb-3 group-hover:text-primary-deep/80 transition-colors">
                    {s.title}
                  </h2>
                  <p className="font-sans text-body text-ink-mute leading-relaxed">
                    {s.summary}
                  </p>
                  <p className="mt-4 font-sans text-small font-semibold text-accent-deep underline decoration-accent/40 underline-offset-[3px] group-hover:decoration-accent">
                    Läs vidare →
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <Footer />
    </>
  );
}
