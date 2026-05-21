import { currentTenant } from "@/lib/tenant";
import { tenantScope } from "@/lib/tenant/db";
import { currentSeason, type Season } from "@/lib/seasons";
import { getActiveHero } from "@/lib/homepage/hero";
import { publicProductWhere } from "@/lib/products/availability";
import { TopBar } from "@/components/site/top-bar";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { BlockRenderer, type HomepageContext } from "@/components/homepage/block-renderer";
import { getHomepageBlocks } from "@/lib/homepage/queries";
import { getActiveBundles } from "@/lib/bundles/queries";
import { JsonLd } from "@/components/seo/json-ld";
import { websiteLd, organizationLd } from "@/lib/jsonld";
import type { Metadata } from "next";

// Homepage gets its own tuned metadata rather than inheriting the layout
// default. `absolute` so the brand isn't doubled by the "%s | Biomax"
// title template on the one page that should just be the brand.
export const metadata: Metadata = {
  title: { absolute: "Biomax — Livskvalitet i fokus sedan 2001" },
  description:
    "Svensk familjeägd hälsofackhandel sedan 2001. Vetenskapligt baserade naturpreparat med tydligt deklarerat innehåll — för sömn, lugn, immunförsvar och vardagsbalans. Snabb leverans i hela Sverige.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "sv_SE",
    siteName: "Biomax",
    url: "https://www.biomax.nu/",
    title: "Biomax — Livskvalitet i fokus sedan 2001",
    description:
      "Vetenskapligt baserade naturpreparat från svensk familjeägd hälsofackhandel sedan 2001.",
  },
};

// Multi-tenant (ADR 0032 D4): path-keyed route ISR would serve one
// tenant's homepage HTML to another (route cache is keyed by URL, not
// Host). Dynamic per request; data-layer caching belongs in
// tenant-keyed helpers, not route-level ISR.
export const dynamic = "force-dynamic";

// Last-resort fallback when no editor has marked any product as featured for
// the current season. Kept narrow — the goal is "homepage never blank", not
// "match every season perfectly". Editors should claim this with the
// "Säsongsval" toggle in the product editor.
const SEASONAL_FALLBACK_SLUG: Record<Season, string> = {
  var: "bjorkglukos",
  sommar: "balans",
  host: "beta-glucan",
  vinter: "balans",
};

export default async function Home() {
  const season = currentSeason();
  const blocks = await getHomepageBlocks();

  // Page-level fetch: pull every dataset any active block could need in
  // one Promise.all. Each block's renderer just picks the field it needs
  // from the resulting context. Cheaper than per-block fetches because
  // most queries share the `publicProductWhere()` filter and Prisma
  // batches them in flight.
  const needs = new Set(blocks.map((b) => b.kind));

  // Tenant-scoped reads (ADR 0032 D2): resolve once, run owned-model
  // queries through the seam → withTenantRLS → FORCE RLS.
  const { id: tenantId } = await currentTenant();

  const editorPickedPromise = needs.has("hero")
    ? tenantScope(tenantId, (tx) =>
        tx.product.findFirst({
          where: { ...publicProductWhere(), featured: true, price: { gt: 0 } },
          orderBy: { updatedAt: "desc" },
          select: { id: true, slug: true, name: true, price: true, imageUrl: true },
        })
      )
    : Promise.resolve(null);

  const bestsellersPromise = needs.has("bestsellers")
    ? tenantScope(tenantId, (tx) =>
        tx.product.findMany({
          where: { ...publicProductWhere(), price: { gt: 0 } },
          orderBy: { totalSales: "desc" },
          take: 6, // take the max any block payload could need; renderer slices
          select: {
            id: true,
            slug: true,
            name: true,
            shortDescription: true,
            imageUrl: true,
            price: true,
            totalSales: true,
            categories: { select: { name: true }, take: 1 },
          },
        })
      )
    : Promise.resolve([]);

  const categoriesPromise = needs.has("categories")
    ? tenantScope(tenantId, (tx) =>
        tx.category.findMany({
          where: {
            slug: { not: "uncategorized" },
            products: { some: publicProductWhere() },
          },
          select: {
            id: true,
            name: true,
            slug: true,
            _count: { select: { products: { where: publicProductWhere() } } },
          },
        })
      )
    : Promise.resolve([]);

  const bundlesPromise = needs.has("bundle-rail")
    ? getActiveBundles()
    : Promise.resolve([]);

  const heroMetaPromise = needs.has("hero")
    ? getActiveHero()
    : Promise.resolve(null);

  const [editorPicked, bestsellers, categories, bundles, heroMeta] =
    await Promise.all([
      editorPickedPromise,
      bestsellersPromise,
      categoriesPromise,
      bundlesPromise,
      heroMetaPromise,
    ]);

  // Seasonal fallback only resolves when the hero block is active AND no
  // editor pick exists. Sequential after the Promise.all so we don't fire
  // an unnecessary query when the editor has claimed the slot.
  const fallbackFeatured =
    needs.has("hero") && !editorPicked
      ? await tenantScope(tenantId, (tx) =>
          tx.product.findFirst({
            where: { slug: SEASONAL_FALLBACK_SLUG[season] },
            select: { id: true, slug: true, name: true, price: true, imageUrl: true },
          })
        )
      : null;

  const ctx: HomepageContext = {
    season,
    heroMeta,
    featured: editorPicked ?? fallbackFeatured,
    bestsellers,
    categories,
    bundles,
  };

  return (
    <>
      <TopBar />
      <Header />
      {/* WebSite + Organization JSON-LD render only on the homepage —
          per Google's sitelinks searchbox guidelines. */}
      <JsonLd data={websiteLd()} />
      <JsonLd data={organizationLd()} />
      <main>
        {blocks.map((block) => (
          <BlockRenderer
            key={`${block.kind}-${block.position}`}
            block={block}
            ctx={ctx}
          />
        ))}
      </main>
      <Footer />
    </>
  );
}
