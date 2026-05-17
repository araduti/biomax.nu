import { TrustpilotBar } from "@/components/site/trustpilot-bar";
import { Hero } from "@/components/marketing/hero";
import { Bestsellers } from "@/components/marketing/bestsellers";
import { Categories } from "@/components/marketing/categories";
import { FounderBand } from "@/components/marketing/founder-band";
import { KnowledgeTeaser } from "@/components/marketing/knowledge-teaser";
import { Newsletter } from "@/components/marketing/newsletter";
import { BundleRail } from "@/components/marketing/bundle-rail";
import type { ComponentProps } from "react";
import type { Block } from "@/lib/homepage/blocks";
import type { Season, SeasonMeta } from "@/lib/seasons";
import type { BundleSummary } from "@/lib/bundles/queries";

/**
 * Data passed in from the page-level fetch. Each field maps to one block's
 * needs; blocks that don't use a field simply ignore it. The page-level
 * Promise.all fetches everything once and the renderer just dispatches.
 *
 * Field types are inferred from the consumer components' prop types so we
 * don't have to maintain a parallel duck-type that drifts every time a
 * downstream component changes.
 */
export type HomepageContext = {
  season: Season;
  /** Resolved hero metadata — from `HomepageHero` table when a matching
   *  PUBLISHED row is active, else the hardcoded seasons map. NULL only
   *  when the hero block is not active (page-level fetch skipped it). */
  heroMeta: SeasonMeta | null;
  featured: ComponentProps<typeof Hero>["featured"];
  bestsellers: ComponentProps<typeof Bestsellers>["products"];
  categories: ComponentProps<typeof Categories>["categories"];
  bundles: BundleSummary[];
};

/**
 * Render a single homepage block by kind. The page composes this in
 * `position` order from the resolved block list (DB-curated when rows
 * exist, otherwise `DEFAULT_BLOCKS` from `lib/homepage/blocks.ts`).
 */
export function BlockRenderer({
  block,
  ctx,
}: {
  block: Block;
  ctx: HomepageContext;
}) {
  switch (block.kind) {
    case "hero":
      return (
        <Hero
          season={ctx.season}
          meta={ctx.heroMeta}
          featured={ctx.featured}
        />
      );
    case "trustpilot-bar":
      return <TrustpilotBar />;
    case "bestsellers": {
      const p = (block.payload ?? {}) as { take?: number };
      const take = typeof p.take === "number" ? Math.max(1, p.take) : 3;
      return <Bestsellers products={ctx.bestsellers.slice(0, take)} />;
    }
    case "categories":
      return <Categories categories={ctx.categories} />;
    case "founder-band":
      return <FounderBand />;
    case "knowledge-teaser":
      return <KnowledgeTeaser />;
    case "newsletter":
      return <Newsletter />;
    case "bundle-rail":
      return <BundleRail bundles={ctx.bundles} />;
    default:
      // Exhaustiveness — TS will flag if a new kind is added without a branch.
      return null;
  }
}
