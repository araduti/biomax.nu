/**
 * Homepage block registry. Each kind has a payload shape and an
 * `enabledByDefault` flag controlling whether it renders when no
 * DB-side curation exists yet (the v1 "code-driven" baseline).
 *
 * Adding a new kind:
 *   1. Add to `BlockKind` union below.
 *   2. Add payload shape (or `null`).
 *   3. Add to `DEFAULT_BLOCKS` array in display order.
 *   4. Render branch in `components/homepage/block-renderer.tsx`.
 */

export type BlockKind =
  | "hero"
  | "trustpilot-bar"
  | "bestsellers"
  | "categories"
  | "founder-band"
  | "knowledge-teaser"
  | "newsletter"
  | "bundle-rail";

export type HeroPayload = null; // hero pulls season + featured product server-side
export type BestsellersPayload = { headline?: string; take?: number };
export type CategoriesPayload = { headline?: string };
export type BundleRailPayload = { headline?: string };

export type Block = {
  kind: BlockKind;
  payload: unknown;
  /** Render order. Lower = higher on the page. */
  position: number;
  /** When false, block is skipped. Used by admin to hide a block without deleting it. */
  active: boolean;
};

/**
 * Default homepage composition — what renders when the HomepageBlock
 * table is empty. Mirrors the existing hardcoded order in app/page.tsx
 * so launching curation doesn't change the page on day one.
 */
export const DEFAULT_BLOCKS: Block[] = [
  { kind: "hero", payload: null, position: 0, active: true },
  { kind: "trustpilot-bar", payload: null, position: 10, active: true },
  { kind: "bestsellers", payload: { take: 3 }, position: 20, active: true },
  { kind: "bundle-rail", payload: {}, position: 25, active: false },
  { kind: "categories", payload: null, position: 30, active: true },
  { kind: "founder-band", payload: null, position: 40, active: true },
  { kind: "knowledge-teaser", payload: null, position: 50, active: true },
  { kind: "newsletter", payload: null, position: 60, active: true },
];

export const KIND_LABELS: Record<BlockKind, string> = {
  hero: "Hero (säsong + utvald produkt)",
  "trustpilot-bar": "Trustpilot-rad",
  bestsellers: "Bästsäljare",
  categories: "Kategorier",
  "founder-band": "Grundarcitat",
  "knowledge-teaser": "Kunskapsbanken-teaser",
  newsletter: "Nyhetsbrev",
  "bundle-rail": "Paket-rad",
};
