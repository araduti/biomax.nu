import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.biomax.nu"),
  title: {
    default: "Biomax.nu | Livskvalitet i fokus",
    template: "%s | Biomax.nu",
  },
  description:
    "Vetenskapligt baserade hälsokosttillskott för hjärna, immunförsvar, hjärta-kärl och vardaglig livskvalitet.",
  alternates: {
    canonical: "/",
    languages: {
      sv: "/",
      en: "/en",
    },
  },
  openGraph: {
    type: "website",
    locale: "sv_SE",
    siteName: "Biomax.nu",
    title: "Biomax.nu | Livskvalitet i fokus",
    description:
      "Premiumtillskott med hög transparens och kliniskt inspirerade formuleringar.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
