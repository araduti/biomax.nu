import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/site/top-bar";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Display, Eyebrow, Accent } from "@/components/ui/typography";

export const metadata: Metadata = {
  title: "Sidan hittades inte",
  robots: { index: false, follow: false },
};

/**
 * Catch-all 404. Triggered by `notFound()` in any route and by Next.js
 * for unmatched URLs. Branded so a wrong link doesn't dump customers
 * onto a generic Next.js stack page.
 *
 * We surface three useful next-steps rather than a single back-link:
 *   1. Best-sellers shortcut — most lost visitors landed via outdated
 *      product links from older marketing
 *   2. "Efter behov" entry point — recovers symptom-based searches
 *   3. Customer support email for genuinely lost users
 */
export default function NotFound() {
  return (
    <>
      <TopBar />
      <Header />
      <main className="bg-surface min-h-[60vh]">
        <div className="max-w-[1240px] mx-auto px-6 md:px-8 py-20 md:py-28">
          <Eyebrow className="mb-3">404</Eyebrow>
          <Display as="h1" size="xl" className="max-w-[720px]">
            Sidan finns inte här — <Accent>men du gör det</Accent>
          </Display>
          <p className="mt-6 font-sans text-base md:text-lg leading-relaxed text-ink-mute max-w-[560px]">
            Länken är antingen gammal eller skriven på fel sätt. Det kan
            också vara en produkt vi inte längre säljer. Här är några
            ingångar tillbaka:
          </p>

          <ul className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5 max-w-[940px]">
            <li>
              <Link
                href="/produkter"
                className="block bg-surface-alt border border-border rounded-2xl p-6 hover:border-border-soft transition-colors h-full"
              >
                <p className="font-display text-xl font-medium text-primary-deep tracking-tight">
                  Alla produkter →
                </p>
                <p className="mt-2 font-sans text-small text-ink-mute leading-relaxed">
                  Hela sortimentet, sorterat efter mest sålda.
                </p>
              </Link>
            </li>
            <li>
              <Link
                href="/hjalp"
                className="block bg-surface-alt border border-border rounded-2xl p-6 hover:border-border-soft transition-colors h-full"
              >
                <p className="font-display text-xl font-medium text-primary-deep tracking-tight">
                  Efter behov →
                </p>
                <p className="mt-2 font-sans text-small text-ink-mute leading-relaxed">
                  Sömn, stress, urinvägar, mage, immunförsvar, energi.
                </p>
              </Link>
            </li>
            <li>
              <Link
                href="/kontakt"
                className="block bg-surface-alt border border-border rounded-2xl p-6 hover:border-border-soft transition-colors h-full"
              >
                <p className="font-display text-xl font-medium text-primary-deep tracking-tight">
                  Hör av dig →
                </p>
                <p className="mt-2 font-sans text-small text-ink-mute leading-relaxed">
                  Du hittar inte vad du letar efter? Mejla oss på
                  kontakt@biomax.nu.
                </p>
              </Link>
            </li>
          </ul>
        </div>
      </main>
      <Footer />
    </>
  );
}
