/**
 * Google Merchant Center product feed.
 *
 * Feeds two distinct surfaces from one file:
 *   1. **Free Google Shopping listings** — products appear in the Shopping
 *      tab and in unpaid product carousels in regular search.
 *   2. **Google Business Profile (GBP) products** — when Merchant Center is
 *      linked to the GBP for Eken Hälsobutik, Google auto-syncs products
 *      from this feed into the "Products" section of the profile. Solves
 *      the "only one product shows in GBP" problem without manual upkeep.
 *
 * Setup steps for the human (one-time):
 *   1. Register at merchants.google.com using the same Google account that
 *      manages the GBP for Biomax HB.
 *   2. Verify and claim biomax.nu (TXT record or HTML tag).
 *   3. Products → Feeds → "Scheduled fetch" pointing at
 *      https://www.biomax.nu/feeds/google-shopping.xml
 *      Pick fetch frequency = daily.
 *   4. Settings → Linked accounts → link the GBP for Eken Hälsobutik so
 *      products flow through.
 *
 * Format: RSS 2.0 with the `g:` namespace, the canonical Merchant Center
 * spec. JSON-format feed is also supported but XML has wider tooling and
 * documentation.
 *
 * Reference: https://support.google.com/merchants/answer/7052112
 */
import { prisma } from "@/lib/prisma";
import { publicProductWhere } from "@/lib/products/availability";
import { stripHtml } from "@/lib/sanitize";

export const runtime = "nodejs";
// Daily revalidation matches Merchant Center's typical fetch cadence.
export const revalidate = 86400;

const SITE = "https://www.biomax.nu";

/**
 * Google's product taxonomy ID for "Health & Beauty > Health Care >
 * Nutrition > Vitamins & Supplements". Required field for unpaid listings
 * eligibility per Merchant Center's Vitamins & Supplements category rules.
 */
const SUPPLEMENT_TAXONOMY_ID = "469";

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
      longDescription: true,
      imageUrl: true,
      galleryUrls: true,
      price: true,
      compareAtPrice: true,
      stock: true,
      manageStock: true,
      weight: true,
    },
  });

  const now = new Date().toUTCString();

  const items = products
    .map((p) => {
      const description = stripHtml(
        p.longDescription || p.shortDescription
      ).slice(0, 4900); // Google caps description at 5000 chars
      const inStock = !p.manageStock || p.stock > 0;
      const price = `${parseFloat(p.price.toString()).toFixed(2)} SEK`;
      const salePrice = p.compareAtPrice
        ? `${parseFloat(p.compareAtPrice.toString()).toFixed(2)} SEK`
        : null;

      // When `compareAtPrice` is set, treat it as the original list price
      // and `price` as the sale price. Google's Shopping UI surfaces this
      // as a strikethrough.
      const priceFields = salePrice
        ? `
        <g:price>${escapeXml(salePrice)}</g:price>
        <g:sale_price>${escapeXml(price)}</g:sale_price>`
        : `
        <g:price>${escapeXml(price)}</g:price>`;

      const additionalImages = p.galleryUrls
        .slice(0, 10)
        .map(
          (url) =>
            `        <g:additional_image_link>${escapeXml(
              url.startsWith("http") ? url : `${SITE}${url}`
            )}</g:additional_image_link>`
        )
        .join("\n");

      const shippingWeight = p.weight
        ? `\n        <g:shipping_weight>${parseFloat(p.weight.toString()).toFixed(3)} kg</g:shipping_weight>`
        : "";

      return `      <item>
        <g:id>${escapeXml(p.sku)}</g:id>
        <g:title>${escapeXml(p.name)}</g:title>
        <g:description>${escapeXml(description)}</g:description>
        <g:link>${SITE}/produkter/${escapeXml(p.slug)}</g:link>
        <g:image_link>${escapeXml(
          p.imageUrl.startsWith("http") ? p.imageUrl : `${SITE}${p.imageUrl}`
        )}</g:image_link>
${additionalImages}
        <g:availability>${inStock ? "in_stock" : "out_of_stock"}</g:availability>${priceFields}
        <g:condition>new</g:condition>
        <g:brand>Biomax</g:brand>
        <g:identifier_exists>false</g:identifier_exists>
        <g:google_product_category>${SUPPLEMENT_TAXONOMY_ID}</g:google_product_category>
        <g:product_type>Kosttillskott</g:product_type>${shippingWeight}
        <g:shipping>
          <g:country>SE</g:country>
          <g:service>Standard</g:service>
          <g:price>49.00 SEK</g:price>
        </g:shipping>
      </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Biomax — Kosttillskott från Kållered</title>
    <link>${SITE}</link>
    <description>Kosttillskott, naturpreparat och Rockland®-serien från Biomax HB i Kållered. Familjeägd hälsobutik sedan 2001.</description>
    <language>sv-SE</language>
    <lastBuildDate>${now}</lastBuildDate>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
