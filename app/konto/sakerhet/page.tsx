import type { Metadata } from "next";
import { Display, Eyebrow } from "@/components/ui/typography";
import { PasswordChangeForm } from "@/components/account/password-change-form";

export const metadata: Metadata = {
  title: "Säkerhet",
  robots: { index: false, follow: false },
  alternates: { canonical: "/konto/sakerhet" },
};

export default function SecurityPage() {
  return (
    <>
      <Eyebrow>Säkerhet</Eyebrow>
      <Display as="h1" size="xl" className="mt-3 mb-3">
        Lösenord
      </Display>
      <p className="font-sans text-base text-ink-mute leading-relaxed max-w-[640px] mb-8">
        När du byter lösenord loggas du ut från eventuella andra enheter där du
        är inloggad. Du behöver logga in på nytt där.
      </p>
      <PasswordChangeForm />
    </>
  );
}
