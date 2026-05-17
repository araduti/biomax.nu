import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/site/top-bar";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Display, Eyebrow } from "@/components/ui/typography";
import { unsubscribeByToken } from "@/lib/newsletter/actions";

export const metadata: Metadata = {
  title: "Avregistrera prenumeration",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token ? await unsubscribeByToken(token) : null;

  return (
    <>
      <TopBar />
      <Header />
      <main className="bg-surface min-h-[60vh] py-16 md:py-24 px-6 md:px-8">
        <div className="max-w-[640px] mx-auto text-center">
          <Eyebrow className="mb-3">Prenumeration</Eyebrow>
          <Display as="h1" size="lg">
            {result?.emailMasked ? "Du är avregistrerad" : "Avregistrera"}
          </Display>

          {result?.emailMasked ? (
            <>
              <p className="mt-6 font-sans text-base md:text-lg leading-relaxed text-ink-mute">
                Vi har tagit bort{" "}
                <code className="font-mono text-[14px] bg-surface-warm px-1.5 py-0.5 rounded">
                  {result.emailMasked}
                </code>{" "}
                från vår prenumerantlista. Du kommer inte att få fler brev från oss.
              </p>
              <p className="mt-4 font-sans text-[14px] text-ink-soft">
                Det här gäller alla våra marknadsutskick. Du fortsätter förstås
                att få orderbekräftelser och liknande mejl som hör till
                pågående beställningar.
              </p>
            </>
          ) : (
            <p className="mt-6 font-sans text-base md:text-lg leading-relaxed text-ink-mute">
              Den här länken är inte giltig eller har redan använts. Om du
              fortsätter få brev från oss du inte vill ha — maila{" "}
              <Link
                href="mailto:kontakt@biomax.nu"
                className="text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent"
              >
                kontakt@biomax.nu
              </Link>{" "}
              så ordnar vi det manuellt.
            </p>
          )}

          <p className="mt-10 font-sans text-[13px] text-ink-soft">
            <Link
              href="/"
              className="text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent"
            >
              ← Tillbaka till biomax.nu
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
