import { prisma } from "@/lib/prisma";
import { currentSeason, type Season } from "@/lib/seasons";
import { publicProductWhere } from "@/lib/products/availability";
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
import { TopBar } from "@/components/site/top-bar";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { TrustpilotBar } from "@/components/site/trustpilot-bar";
import { Hero } from "@/components/marketing/hero";
import { Bestsellers } from "@/components/marketing/bestsellers";
import { Categories } from "@/components/marketing/categories";
import { FounderBand } from "@/components/marketing/founder-band";
import { KnowledgeTeaser } from "@/components/marketing/knowledge-teaser";
import { Newsletter } from "@/components/marketing/newsletter";

export const revalidate = 300; // ISR: refresh hero/bestsellers data every 5 min

export default async function Home() {
  const season = currentSeason();

  // Editorial first: most-recently-updated featured product wins. Fallback
  // to the seasonal slug map only if no editor has claimed the slot. The
  // featured pool is small enough that this query is essentially free.
  const editorPicked = await prisma.product.findFirst({
    where: { ...publicProductWhere(), featured: true, price: { gt: 0 } },
    orderBy: { updatedAt: "desc" },
    select: { id: true, slug: true, name: true, price: true, imageUrl: true },
  });

  const [bestsellers, fallbackFeatured, categories] = await Promise.all([
    prisma.product.findMany({
      where: { ...publicProductWhere(), price: { gt: 0 } },
      orderBy: { totalSales: "desc" },
      take: 3,
      include: { categories: { select: { name: true }, take: 1 } },
    }),
    editorPicked
      ? Promise.resolve(null)
      : prisma.product.findUnique({
          where: { slug: SEASONAL_FALLBACK_SLUG[season] },
          select: { id: true, slug: true, name: true, price: true, imageUrl: true },
        }),
    prisma.category.findMany({
      where: {
        slug: { not: "uncategorized" },
        products: { some: publicProductWhere() },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        // Count only the products that would actually render publicly,
        // so the chip number never overstates what the user can browse.
        _count: { select: { products: { where: publicProductWhere() } } },
      },
    }),
  ]);

  const featured = editorPicked ?? fallbackFeatured;

  return (
    <>
      <TopBar />
      <Header />
      <main>
        <Hero season={season} featured={featured} />
        <TrustpilotBar />
        <Bestsellers products={bestsellers} />
        <Categories categories={categories} />
        <FounderBand />
        <KnowledgeTeaser />
        <Newsletter />
      </main>
      <Footer />
    </>
  );
}
