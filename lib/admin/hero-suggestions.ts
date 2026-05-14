/**
 * Curated Unsplash search queries per season + Swedish high-season.
 * Mapped to the brand pillar — calm, nordic, considered, family-aligned.
 *
 * The editor sees these as one-click "chips" above the search box so they
 * don't start from a blank input. Order matters: first entry is the
 * default search fired when the chip is clicked.
 */

export type SuggestionKey =
  | "var"
  | "sommar"
  | "host"
  | "vinter"
  | "midsommar"
  | "pask"
  | "black-week"
  | "jul";

type Suggestion = {
  label: string;
  /** Used as the default search query when the chip is clicked. */
  query: string;
  /** Alternate queries the editor can also try — surfaced as small links. */
  alternates: string[];
};

export const HERO_SUGGESTIONS: Record<SuggestionKey, Suggestion> = {
  var: {
    label: "Vår",
    query: "swedish spring forest birch",
    alternates: ["bird cherry blossom", "wood anemone forest", "spring leaves nordic"],
  },
  sommar: {
    label: "Sommar",
    query: "swedish summer lake",
    alternates: ["nordic archipelago", "wildflower meadow sweden", "scandinavian summer"],
  },
  host: {
    label: "Höst",
    query: "swedish autumn forest",
    alternates: ["birch yellow autumn", "lingonberry forest", "fog forest nordic"],
  },
  vinter: {
    label: "Vinter",
    query: "swedish winter forest snow",
    alternates: ["snowy pine forest", "frozen lake nordic", "winter light scandinavia"],
  },
  midsommar: {
    label: "Midsommar",
    query: "midsummer flower crown sweden",
    alternates: ["flower meadow midsummer", "nordic summer evening", "swedish midsommar"],
  },
  pask: {
    label: "Påsk",
    query: "spring branches easter",
    alternates: ["yellow daffodil nordic", "willow catkins", "swedish easter"],
  },
  "black-week": {
    label: "Black Week",
    query: "warm autumn light home",
    alternates: ["candlelight cosy", "autumn rain window", "warm sweater nordic"],
  },
  jul: {
    label: "Jul",
    query: "swedish christmas candle",
    alternates: ["winter forest snow lights", "scandinavian christmas", "advent candles"],
  },
};
