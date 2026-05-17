/**
 * Seasonal hero photography — the brand pillar (per ADR 0007 + memory note).
 *
 * Single source of truth for all four seasons. The active season is computed
 * from the current date. Each season's photograph rotates the homepage hero,
 * email headers, and product page banners.
 */
export type Season = "var" | "sommar" | "host" | "vinter";

export type SeasonMeta = {
  id: Season;
  label: string;
  motif: string;
  /** Sub-caption shown small in the hero — describes the photo specifically. */
  caption: string;
  /** Hex used for the italic accent in the hero headline. */
  accent: string;
  photoUrl: string;
  photoAlt: string;
};

export const seasons: Record<Season, SeasonMeta> = {
  var: {
    id: "var",
    label: "Vår",
    motif: "När häggen blommar",
    caption: "Vit hägg mot djupgrön skog, mitten av maj",
    accent: "#7A8B6F",
    // Hägg / bird cherry — the specifically Swedish vår-into-försommar
    // ritual. White blossom canopy against deep green; older-reader
    // nostalgia note. If this URL 404s, swap to another Unsplash photo
    // of Prunus padus / spring white blossom — the brand pillar is the
    // motif, not any one image.
    photoUrl: "https://images.unsplash.com/photo-1588280991779-bf36c2af6727",
    photoAlt: "Häggens vita blomklasar mot djupgrön vårskog",
  },
  sommar: {
    id: "sommar",
    label: "Sommar",
    motif: "Långa ljusa kvällar",
    caption: "Vid vattnet i juli",
    accent: "#D4A574",
    photoUrl: "https://images.unsplash.com/photo-1660063846374-8f98fd32cbc3",
    photoAlt: "Sommarstämning vid vattnet i nordisk natur",
  },
  host: {
    id: "host",
    label: "Höst",
    motif: "Höstens glöd",
    caption: "Lönn och berberis i oktober",
    accent: "#B5523B",
    photoUrl: "https://images.unsplash.com/photo-1665513849007-0974b3ccec81",
    photoAlt: "Person promenerar i höstskog med gyllene löv",
  },
  vinter: {
    id: "vinter",
    label: "Vinter",
    motif: "Hand i hand i snön",
    caption: "Snöbarrskog i januari",
    accent: "#7B97A3",
    photoUrl: "https://images.unsplash.com/photo-1764773964890-c00c7082b90d",
    photoAlt: "Par går hand i hand genom snötäckt barrskog",
  },
};

/**
 * Current Swedish season from a JS Date.
 *  Vår: Mar–May, Sommar: Jun–Aug, Höst: Sep–Nov, Vinter: Dec–Feb.
 */
export function currentSeason(now: Date = new Date()): Season {
  const month = now.getMonth(); // 0–11
  if (month >= 2 && month <= 4) return "var";
  if (month >= 5 && month <= 7) return "sommar";
  if (month >= 8 && month <= 10) return "host";
  return "vinter";
}
