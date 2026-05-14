import type { Metadata } from "next";
import { TopBar } from "@/components/site/top-bar";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbLd } from "@/lib/jsonld";
import { QuizFlow } from "@/components/quiz/quiz-flow";
import { getActiveBundles } from "@/lib/bundles/queries";

export const metadata: Metadata = {
  title: "Hjälp mig välja — kortguide för att hitta rätt",
  description:
    "Fyra frågor leder dig till den orientering och de produkter som ligger närmast det du letar efter. Tar mindre än en minut.",
  alternates: { canonical: "/hjalp-mig-valja" },
};

export default async function HjalpMigValjaPage() {
  // Pre-fetch active bundles so the quiz result can surface a matching
  // bundle as the primary CTA (Holistic pattern — "din rutin"-rekommendation
  // beats a single product link).
  const bundles = await getActiveBundles();
  const crumbs = [
    { label: "Hem", href: "/" },
    { label: "Hjälp mig välja", href: "/hjalp-mig-valja" },
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
          <div className="max-w-[680px] mx-auto">
            <QuizFlow bundles={bundles} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
