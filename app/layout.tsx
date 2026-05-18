import type { Metadata, Viewport } from "next";
import {
  Playfair_Display,
  Inter,
  Instrument_Serif,
  JetBrains_Mono,
  Hanken_Grotesk,
} from "next/font/google";
import "./globals.css";
import { CartDrawerLazy } from "@/components/cart/cart-drawer-lazy";
import { Analytics } from "@/components/site/analytics";
import { WebVitalsReporter } from "@/components/site/web-vitals-reporter";
import { CookieConsent } from "@/components/site/cookie-consent";
import { ShippingConfigProvider } from "@/lib/site/shipping-config-context";
import { getShippingRules } from "@/lib/site/settings";
import { currentTenant } from "@/lib/tenant";

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

/* ── Direction D (admin "Linear-warm" theme) fonts ──────────────────
 * Scoped to /admin via [data-direction="d"] in globals.css. The public
 * site never references these — Playfair/Inter still carry the
 * storefront. All three are self-hosted by next/font (CSP-clean,
 * `font-src 'self'`).
 *
 *  - Instrument Serif → display numerics + page-title italics only
 *  - JetBrains Mono    → SKUs, IDs, eyebrows, kbd hints, deltas
 *  - Hanken Grotesk    → General Sans substitute: body, nav, controls
 *    (General Sans is Fontshare-only; Hanken is the closest
 *    Google-hosted geometric-humanist match — ~95% visual parity)
 */
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hanken-grotesk",
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
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "Biomax",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Biomax — Livskvalitet i fokus sedan 2001",
    description:
      "Vetenskapligt baserade naturpreparat från svensk familjeägd hälsofackhandel sedan 2001.",
    images: ["/og-default.png"],
  },
};

// Explicit because the manual <head> in this layout suppresses Next's
// default viewport tag — Stripe Elements (in the Kustom iframe) hard-
// requires `width=device-width` or it refuses to render properly.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const shipping = await getShippingRules();
  const tenant = await currentTenant();
  return (
    <html
      lang="sv"
      data-scroll-behavior="smooth"
      data-tenant={tenant.slug}
      style={{ "--color-primary": tenant.primaryColorHex } as React.CSSProperties}
      className={`${playfair.variable} ${inter.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} ${hankenGrotesk.variable} h-full antialiased`}
    >
      <head>
        {/* General Sans — Direction D admin body/UI font. No exact
            Google Fonts equivalent, so loaded from Fontshare's CDN.
            Can't be a CSS `@import` (Tailwind v4 inlines its import and
            pushes ours past the "@import must be first" rule), so it's
            a hoisted <link>. Hanken Grotesk (next/font, self-hosted)
            remains the fallback in `--d-font-sans` — no FOUT to a
            system font while this loads or if the CDN is blocked.
            CSP allows api.fontshare.com (style-src) +
            cdn.fontshare.com (font-src). */}
        <link
          rel="preconnect"
          href="https://api.fontshare.com"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://cdn.fontshare.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap"
        />
        {/* Kustom Elements loader (Express buttons). Env-gated: no key
            → not loaded (dev/CI clean, no hardcoded playground key in
            source). Host + public key differ playground vs prod. CSP
            already allows *.kustom.co (script/connect/frame/img). */}
        {process.env.NEXT_PUBLIC_KUSTOM_ELEMENTS_KEY &&
          process.env.NEXT_PUBLIC_KUSTOM_ELEMENTS_SRC && (
            <>
              <script
                async
                id="kustom-elements-script"
                src={process.env.NEXT_PUBLIC_KUSTOM_ELEMENTS_SRC}
                data-public-api-key={
                  process.env.NEXT_PUBLIC_KUSTOM_ELEMENTS_KEY
                }
              />
              <script
                dangerouslySetInnerHTML={{
                  __html:
                    "(function(w){window.kustomElements=window.kustomElements||function(w,...n){return new Promise(((o,i)=>{window.kustomElements._internal.q.push({method:w,args:n,resolve:o,reject:i})}))},window.kustomElements._internal=window.kustomElements._internal||{q:[],snippetVersion:\"1.0.0\"},window.kustomElements.load||(window.kustomElements.load=new Promise(((w,n)=>{window.kustomElements._internal.loadResolve=w,window.kustomElements._internal.loadReject=n})));})(window);",
                }}
              />
            </>
          )}
      </head>
      <body className="min-h-full bg-surface text-ink font-sans">
        <ShippingConfigProvider value={shipping}>
          {children}
          <CartDrawerLazy />
        </ShippingConfigProvider>
        <Analytics />
        <WebVitalsReporter />
        <CookieConsent />
        {process.env.NODE_ENV !== "production" && (
          <div
            aria-hidden
            style={{
              position: "fixed",
              bottom: 8,
              left: 8,
              zIndex: 2147483647,
              background: tenant.primaryColorHex,
              color: "#fff",
              font: "600 11px/1 ui-sans-serif, system-ui, sans-serif",
              padding: "6px 9px",
              borderRadius: 6,
              letterSpacing: "0.04em",
              boxShadow: "0 2px 8px rgba(0,0,0,.25)",
              pointerEvents: "none",
            }}
          >
            KORG · {tenant.name} ({tenant.slug})
          </div>
        )}
      </body>
    </html>
  );
}
