import type { Metadata } from "next";
import Link from "next/link";
import { Display, Eyebrow } from "@/components/ui/typography";
import { DataProtectionPanel } from "@/components/account/data-protection-panel";

export const metadata: Metadata = {
  title: "Dataskydd",
  robots: { index: false, follow: false },
  alternates: { canonical: "/konto/dataskydd" },
};

export default function DataProtectionPage() {
  return (
    <>
      <Eyebrow>Dataskydd</Eyebrow>
      <Display as="h1" size="xl" className="mt-3 mb-3">
        Dina personuppgifter
      </Display>
      <p className="font-sans text-base text-ink-mute leading-relaxed max-w-[640px] mb-8">
        Här kan du ladda ner allt vi har sparat om dig eller radera ditt
        konto direkt — utan att kontakta oss. Vill du läsa mer om dina
        rättigheter finns en översikt på{" "}
        <Link href="/gdpr" className="underline underline-offset-[3px]">
          sidan om GDPR
        </Link>
        .
      </p>
      <DataProtectionPanel />
    </>
  );
}
