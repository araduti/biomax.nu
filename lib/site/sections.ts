/**
 * Site sections — groups of pages that share a left-rail nav so they read as a
 * coherent cluster instead of nine isolated content pages. The page itself
 * decides which section it belongs to via the `section` prop on
 * `SectionLayout` / `LegalPage`. We also surface them via `findSection()` for
 * cases where the active path needs to drive highlighting.
 */
export type SectionId = "help" | "biomax";

export type SectionItem = { label: string; href: string };

export type Section = {
  id: SectionId;
  /** Eyebrow shown above the nav. Doubles as the section's "name" for SEO. */
  eyebrow: string;
  items: SectionItem[];
};

export const SECTIONS: Record<SectionId, Section> = {
  help: {
    id: "help",
    eyebrow: "Hjälp & juridik",
    items: [
      { label: "Frakt & retur", href: "/frakt-och-retur" },
      { label: "Vanliga frågor", href: "/faq" },
      { label: "Köpvillkor", href: "/villkor" },
      { label: "Ångerblankett", href: "/anger-formular" },
      { label: "Integritet", href: "/integritet" },
      { label: "GDPR", href: "/gdpr" },
    ],
  },
  biomax: {
    id: "biomax",
    eyebrow: "Biomax",
    items: [
      { label: "Vår berättelse", href: "/om-oss" },
      { label: "Butik i Kållered", href: "/butik" },
      { label: "Behandlingar", href: "/behandlingar" },
      { label: "Kontakt", href: "/kontakt" },
    ],
  },
};

export function getSection(id: SectionId): Section {
  return SECTIONS[id];
}
