import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { CartDrawerLazy } from "@/components/cart/cart-drawer-lazy";
import { Analytics } from "@/components/site/analytics";
import { WebVitalsReporter } from "@/components/site/web-vitals-reporter";
import { CookieConsent } from "@/components/site/cookie-consent";
import { ShippingConfigProvider } from "@/lib/site/shipping-config-context";
import { getShippingRules } from "@/lib/site/settings";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.biomax.nu"),
  title: {
    default: "Biomax — Livskvalitet i fokus sedan 2001",
    template: "%s | Biomax",
  },
  description:
    "Vetenskapligt baserade naturpreparat från svensk familjeägd hälsofackhandel sedan 2001. Kliniskt dokumenterade ingredienser, tydligt deklarerat innehåll, snabb leverans i hela Sverige.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "sv_SE",
    siteName: "Biomax",
    title: "Biomax — Livskvalitet i fokus sedan 2001",
    description:
      "Vetenskapligt baserade naturpreparat från svensk familjeägd hälsofackhandel sedan 2001.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const shipping = await getShippingRules();
  return (
    <html
      lang="sv"
      data-scroll-behavior="smooth"
      className={`${playfair.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-surface text-ink font-sans">
        <ShippingConfigProvider value={shipping}>
          {children}
          <CartDrawerLazy />
        </ShippingConfigProvider>
        <Analytics />
        <WebVitalsReporter />
        <CookieConsent />
      </body>
    </html>
  );
}
