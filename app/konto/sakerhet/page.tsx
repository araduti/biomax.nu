import type { Metadata } from "next";
import { Display, Eyebrow } from "@/components/ui/typography";
import { PasswordChangeForm } from "@/components/account/password-change-form";
import { TwoFactorPanel } from "@/components/account/two-factor-panel";
import { currentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Säkerhet",
  robots: { index: false, follow: false },
  alternates: { canonical: "/konto/sakerhet" },
};

export default async function SecurityPage() {
  const user = await currentUser();
  const twoFactorEnabled =
    (user as { twoFactorEnabled?: boolean } | null)?.twoFactorEnabled ?? false;

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

      <div className="mt-14 pt-10 border-t border-border">
        <Display as="h2" size="lg" className="mb-3">
          Tvåfaktorsinloggning
        </Display>
        <p className="font-sans text-base text-ink-mute leading-relaxed max-w-[640px] mb-6">
          Skydda kontot med en engångskod från en authenticator-app (Google
          Authenticator, 1Password, Authy m.fl.). Vi rekommenderar det starkt
          om du hanterar beställningar eller känslig information.
        </p>
        <TwoFactorPanel initiallyEnabled={twoFactorEnabled} />
      </div>
    </>
  );
}
