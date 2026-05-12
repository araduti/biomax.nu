/**
 * Category metadata — Latin label, signature herb, hero photograph.
 *
 * Keyed by Category.slug. Anchored in real biomax.nu sales data (not made-up
 * categories). The signature-herb concept is the brand's editorial signature
 * (per ADR 0007) — every category landing page leads with its plant.
 */
export type CategoryMeta = {
  slug: string;
  latin: string;
  signature: string;
  photoUrl: string;
  alt: string;
  /** One-paragraph editorial intro shown on the category landing page. */
  description: string;
};

const META: CategoryMeta[] = [
  {
    slug: "somn-oro",
    latin: "Tranquillitas",
    signature: "Valeriana officinalis · Vänderot",
    photoUrl: "https://images.unsplash.com/photo-1653751747656-9b8a3dc4ba20",
    alt: "Vänderot i blom — närbild",
    description:
      "För dig som söker återhämtning, lugn och en bättre nattsömn. Vi väljer formuleringar med klinisk dokumentation — adaptogener, mjölkbaserad Lactium® och magnesium — som möter både stress och vakenhet vid fel tider.",
  },
  {
    slug: "urinvagsinfektion",
    latin: "Mictio",
    signature: "Betula pendula · Björk",
    photoUrl: "https://images.unsplash.com/photo-1773674488171-42649c737bbf",
    alt: "Björkbark i närbild",
    description:
      "Återkommande UVI är vanligare än man pratar om. Björkens xylitol och betaglukan utgör ett naturligt komplement med dokumenterad antiadhesiv effekt mot bakterier i urinvägarna.",
  },
  {
    slug: "immunforsvar",
    latin: "Defensio",
    signature: "Echinacea purpurea · Solhatt",
    photoUrl: "https://images.unsplash.com/photo-1508007226633-b7de6a10cb16",
    alt: "Solhatt i sommarljus",
    description:
      "Stärk kroppens egen försvarslinje. Vi för in beta-glukan, olivblad och andra immunmodulerande naturpreparat med klinisk forskning bakom — för långsiktigt skydd, inte tillfälliga toppar.",
  },
  {
    slug: "leder",
    latin: "Articulus",
    signature: "Curcuma longa · Gurkmeja",
    photoUrl: "https://images.unsplash.com/photo-1768729341078-9da4e0ea959e",
    alt: "Färsk gurkmejarot",
    description:
      "Inflammation, stelhet, slitage. Boswellia, gurkmeja och kyckling-collagen II är de tre formuleringar svensk forskning återkommer till — och dem vi väljer för leder som ska hålla.",
  },
  {
    slug: "hjarta-karl",
    latin: "Cardio",
    signature: "Crataegus · Hagtorn",
    photoUrl: "https://images.unsplash.com/photo-1631634176620-1aba7ab10346",
    alt: "Hagtornsbär på gren",
    description:
      "Hjärtat tål inte slumpen. Q10, kondroitin och välutvalda antioxidanter — dokumenterade i tunga studier — är ryggraden i ett kärlfriskt liv.",
  },
  {
    slug: "mage-tarm",
    latin: "Digestio",
    signature: "Foeniculum vulgare · Fänkål",
    photoUrl: "https://images.unsplash.com/photo-1760393339694-11ba13df03d0",
    alt: "Färsk fänkål",
    description:
      "Tarmen är kroppens andra hjärna. Aloe vera, fibrer och välbalanserade preparat som bygger en lugnare och mer effektiv matsmältning.",
  },
  {
    slug: "vitaminer-mineraler",
    latin: "Mineralia",
    signature: "Naturligt utvunna mineraler",
    photoUrl: "https://images.unsplash.com/photo-1572429785267-de6cbab1bb56",
    alt: "Naturliga mineralkristaller",
    description:
      "Naturligt utvunna mineraler och vitaminer i biologiskt tillgängliga former — utan onödiga fyllmedel. Korall-kalcium, menadione (K2) och spårämnen från ren havskälla.",
  },
  {
    slug: "hjarna-och-minne",
    latin: "Cognitio",
    signature: "Ginkgo biloba",
    photoUrl: "https://images.unsplash.com/photo-1586170045339-9dde28320a9b",
    alt: "Ginkgo-blad i mjukt ljus",
    description:
      "Acetyl-L-karnitin och ginkgo biloba — väldokumenterade kognitiva stödformuleringar för fokus, minne och åldersrelaterad kognitiv återhämtning.",
  },
];

const BY_SLUG = new Map(META.map((m) => [m.slug, m]));
const BY_NAME: Record<string, string> = {
  "sömn & oro": "somn-oro",
  "urinvägsinfektion": "urinvagsinfektion",
  "immunförsvar": "immunforsvar",
  "leder": "leder",
  "hjärta-kärl": "hjarta-karl",
  "mage-tarm": "mage-tarm",
  "vitaminer & mineraler": "vitaminer-mineraler",
  "hjärna och minne": "hjarna-och-minne",
};

export function categoryMetaBySlug(slug: string): CategoryMeta | null {
  return BY_SLUG.get(slug) ?? null;
}

export function categoryMetaByName(name: string): CategoryMeta | null {
  const slug = BY_NAME[name.toLowerCase()];
  return slug ? BY_SLUG.get(slug) ?? null : null;
}

export const allCategoryMeta = META;
