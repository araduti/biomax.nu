/**
 * Prisjakt / PriceRunner product feed.
 *
 * Swedish comparison-shopping engines (Prisjakt is the dominant one,
 * PriceRunner the runner-up). They both accept the same loose XML shape:
 * a `<products>` root with one `<product>` per SKU, fields they accept
 * documented at https://www.prisjakt.nu/info/dataspec.
 *
 * Free listing — the value is appearing in head-to-head price comparison
 * for keywords like "Q10 100mg pris", which converts well for users who
 * are already in buying mode. Unlike Google Shopping this does NOT flow
 * into Google Business Profile — it's a separate acquisition channel.
 *
 * Setup steps for the human (one-time):
 *   1. Apply at https://www.prisjakt.nu/info/become-a-merchant.
 *   2. Once accepted, point Prisjakt at
 *      https://www.biomax.nu/feeds/prisjakt.xml as the data feed.
 *   3. Daily fetch is the default cadence.
 */
import { prisma } from "@/lib/prisma";
import { publicProductWhere } from "@/lib/products/availability";
import { stripHtml } from "@/lib/sanitize";

export const runtime = "nodejs";
export const revalidate = 86400;

const SITE = "https://www.biomax.nu";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const products = await prisma.product.findMany({
    where: { ...publicProductWhere(), price: { gt: 0 } },
    orderBy: { totalSales: "desc" },
    select: {
      slug: true,
      sku: true,
      name: true,
      shortDescription: true,
      imageUrl: true,
      price: true,
      stock: true,
      manageStock: true,
      weight: true,
      categories: { select: { name: true }, take: 1 },
    },
  });

  const items = products
    .map((p) => {
      const category = p.categories[0]?.name ?? "Kosttillskott";
      const description = stripHtml(p.shortDescription).slice(0, 1000);
      const inStock = !p.manageStock || p.stock > 0;
      const price = parseFloat(p.price.toString()).toFixed(2);
      const imageUrl = p.imageUrl.startsWith("http")
        ? p.imageUrl
        : `${SITE}${p.imageUrl}`;

      return `  <product>
    <sku>${escapeXml(p.sku)}</sku>
    <name>${escapeXml(p.name)}</name>
    <description>${escapeXml(description)}</description>
    <url>${SITE}/produkter/${escapeXml(p.slug)}</url>
    <image>${escapeXml(imageUrl)}</image>
    <price>${price}</price>
    <currency>SEK</currency>
    <stock>${inStock ? "yes" : "no"}</stock>
    <shipping_cost>49.00</shipping_cost>
    <delivery_time>1-3 arbetsdagar</delivery_time>
    <category>${escapeXml(category)}</category>
    <manufacturer>Biomax</manufacturer>
  </product>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<products>
${items}
</products>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
