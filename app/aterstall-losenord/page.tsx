import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Återställ lösenord",
  description: "Välj ett nytt lösenord till ditt Biomax-konto.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/aterstall-losenord" },
};

export default function ResetPasswordPage() {
  return (
    <AuthShell
      eyebrow="Återställ lösenord"
      title="Välj nytt lösenord"
      intro="Lösenordet behöver vara minst 10 tecken."
    >
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
