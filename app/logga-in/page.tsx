import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { currentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Logga in",
  description:
    "Logga in på ditt Biomax-konto för att se ordrar, hantera leveranser och spara dina favoriter.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/logga-in" },
};

export default async function LoginPage() {
  const user = await currentUser();
  if (user) redirect("/konto");

  return (
    <AuthShell
      eyebrow="Mitt konto"
      title="Välkommen tillbaka"
      intro={
        <>
          Logga in för att se dina ordrar och favoriter. Återvändande kund från
          gamla biomax.nu? Använd <em className="italic">glömt lösenord</em> för att
          aktivera ditt konto.
        </>
      }
      footer={
        <>
          Ny här?{" "}
          <Link
            href="/skapa-konto"
            className="font-semibold text-primary hover:text-primary-deep"
          >
            Skapa konto
          </Link>
        </>
      }
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
