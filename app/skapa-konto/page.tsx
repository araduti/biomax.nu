import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { currentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Skapa konto",
  description:
    "Skapa ett Biomax-konto för snabbare utcheckning, sparade adresser och tillgång till orderhistorik.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/skapa-konto" },
};

export default async function RegisterPage() {
  const user = await currentUser();
  if (user) redirect("/konto");

  return (
    <AuthShell
      eyebrow="Mitt konto"
      title="Skapa konto"
      intro="Snabbare utcheckning, sparade adresser och full orderhistorik."
      footer={
        <>
          Har du redan ett konto?{" "}
          <Link
            href="/logga-in"
            className="font-semibold text-primary hover:text-primary-deep"
          >
            Logga in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
