import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Glömt lösenord",
  description: "Få en länk för att återställa ditt Biomax-lösenord.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/glomt-losenord" },
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Återställ lösenord"
      title="Glömt lösenord?"
      intro="Skriv in din e-postadress så skickar vi en länk där du kan välja ett nytt."
      footer={
        <Link
          href="/logga-in"
          className="font-semibold text-primary hover:text-primary-deep"
        >
          Tillbaka till inloggning
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
