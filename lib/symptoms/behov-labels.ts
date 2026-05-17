/**
 * Shopping-friendly labels for the "Efter behov" navigation dropdown.
 *
 * The symptom registry slugs lean problem-oriented ("somnproblem", "oro-
 * och-stress") which reads well for SEO-driven landings but feels heavy
 * in the main nav. These labels swap to shopping-language for the menu
 * surface only — the URL and the on-page H1 stay informational.
 *
 * Order is the curated "what we want browse-mode customers to see first"
 * order, not alphabetic — Sömn / Stress / Mage lead because that's where
 * actual purchase intent concentrates in our data.
 */
export const BEHOV_LABELS: { slug: string; label: string }[] = [
  { slug: "somnproblem", label: "Sömn & vila" },
  { slug: "oro-och-stress", label: "Stress & oro" },
  { slug: "urinvagar", label: "Urinvägar" },
  { slug: "mage-och-tarm", label: "Mage & tarm" },
  { slug: "immunforsvar", label: "Immunförsvar" },
  { slug: "energi-och-trotthet", label: "Energi" },
  { slug: "leder-och-rorlighet", label: "Leder & rörlighet" },
  { slug: "hjarna-och-minne", label: "Hjärna & fokus" },
  { slug: "hjarta-och-blodkarl", label: "Hjärta & kärl" },
  { slug: "antioxidanter-och-aldrande", label: "Antioxidanter" },
];
