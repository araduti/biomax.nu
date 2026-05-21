/**
 * WordPress → Postgres migration script for biomax.nu
 *
 * Reads the WXR XML export at biomax.WordPress.YYYY-MM-DD.xml in the project
 * root, transforms WooCommerce data, and inserts into the Prisma-managed
 * Postgres database.
 *
 * Usage:
 *   npm run db:import-wp [-- path/to/biomax.WordPress.xml]
 *
 * The script is idempotent — running it twice on the same export will not
 * create duplicates. Each WP entity is upserted by `legacyWpId`.
 *
 * Limitations of WP WXR export (these are NOT in the file):
 *  - WooCommerce order line items (stored in wc_order_items / wc_order_itemmeta)
 *  - Customer billing addresses outside billing_email/_first_name/_last_name
 *
 * If you need full line-item history, do a separate WooCommerce CSV export
 * via WP Admin > WooCommerce > Reports.
 */

import { config as dotenv } from "dotenv";
dotenv({ path: ".env" });
dotenv({ path: ".env.local", override: true });

import { PrismaClient, ProductStatus, OrderStatus, PaymentProvider } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, basename, extname, join } from "node:path";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Check .env.local");
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({
  adapter,
  log: ["error", "warn"],
});

// ──────────────────────────────────────────────────────────── helpers

const decodeEntities = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'");

const stripCdata = (s: string) => {
  const m = s.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return m ? m[1] : s;
};

const extractCdata = (xml: string, tag: string): string | null => {
  const re = new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`);
  const m = xml.match(re);
  return m ? m[1] : null;
};

const extractText = (xml: string, tag: string): string | null => {
  // Allow CDATA or plain text inside the tag
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`);
  const m = xml.match(re);
  if (!m) return null;
  return decodeEntities(stripCdata(m[1]).trim());
};

const extractMeta = (xml: string, key: string): string | null => {
  const re = new RegExp(
    `<wp:meta_key><!\\[CDATA\\[${key.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    )}\\]\\]></wp:meta_key>\\s*<wp:meta_value><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></wp:meta_value>`
  );
  const m = xml.match(re);
  return m ? m[1] : null;
};

const parsePrice = (s: string | null): number => {
  if (!s) return 0;
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const parseDate = (s: string | null): Date | null => {
  if (!s || s === "0000-00-00 00:00:00") return null;
  const d = new Date(s.replace(" ", "T") + "Z");
  return Number.isNaN(d.getTime()) ? null : d;
};

const parseInteger = (s: string | null): number | null => {
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
};

// ──────────────────────────────────────────────────────────── XML splitting

interface WpItem {
  postId: number;
  postType: string;
  raw: string;
}

function splitItems(xml: string): WpItem[] {
  const items: WpItem[] = [];
  const parts = xml.split(/<item>/);
  for (const part of parts.slice(1)) {
    const end = part.indexOf("</item>");
    if (end === -1) continue;
    const raw = part.slice(0, end);
    const idMatch = raw.match(/<wp:post_id>(\d+)<\/wp:post_id>/);
    const typeMatch = raw.match(/<wp:post_type><!\[CDATA\[([^\]]+)\]\]><\/wp:post_type>/);
    if (!idMatch || !typeMatch) continue;
    items.push({
      postId: parseInt(idMatch[1], 10),
      postType: typeMatch[1],
      raw,
    });
  }
  return items;
}

// ──────────────────────────────────────────────────────────── categories

interface WpCategory {
  termId: number;
  slug: string;
  name: string;
  description: string | null;
}

function parseCategories(fullXml: string): WpCategory[] {
  // Look for <wp:term> blocks with taxonomy = product_cat
  const out: WpCategory[] = [];
  const termBlocks = fullXml.match(/<wp:term>[\s\S]*?<\/wp:term>/g) ?? [];
  for (const block of termBlocks) {
    const tax = block.match(/<wp:term_taxonomy><!\[CDATA\[([^\]]+)\]\]>/);
    if (!tax || tax[1] !== "product_cat") continue;
    const id = block.match(/<wp:term_id>(\d+)<\/wp:term_id>/);
    const slug = block.match(/<wp:term_slug><!\[CDATA\[([^\]]+)\]\]>/);
    const name = block.match(/<wp:term_name><!\[CDATA\[([^\]]+)\]\]>/);
    const desc = block.match(/<wp:term_description><!\[CDATA\[([\s\S]*?)\]\]>/);
    if (!id || !slug || !name) continue;
    out.push({
      termId: parseInt(id[1], 10),
      slug: slug[1],
      name: decodeEntities(name[1]),
      description: desc ? decodeEntities(desc[1]).trim() || null : null,
    });
  }
  return out;
}

// ──────────────────────────────────────────────────────────── attachments

interface WpAttachment {
  attachmentId: number;
  parentId: number;
  url: string;
  title: string;
}

function parseAttachments(items: WpItem[]): Map<number, WpAttachment> {
  const map = new Map<number, WpAttachment>();
  for (const item of items) {
    if (item.postType !== "attachment") continue;
    const url = extractCdata(item.raw, "wp:attachment_url");
    const parent = item.raw.match(/<wp:post_parent>(\d+)<\/wp:post_parent>/);
    const title = extractText(item.raw, "title") ?? "";
    if (!url) continue;
    map.set(item.postId, {
      attachmentId: item.postId,
      parentId: parent ? parseInt(parent[1], 10) : 0,
      url,
      title,
    });
  }
  return map;
}

// ──────────────────────────────────────────────────────────── products

interface WpProduct {
  postId: number;
  slug: string;
  name: string;
  status: string;
  shortDescription: string;
  longDescription: string;
  sku: string;
  regularPrice: number;
  salePrice: number | null;
  stock: number;
  manageStock: boolean;
  totalSales: number;
  weight: number | null;
  averageRating: number | null;
  reviewCount: number;
  thumbnailId: number | null;
  galleryIds: number[];
  categoryNames: string[];
  permalink: string | null;
  publishedAt: Date | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoFocusKw: string | null;
  seoKeywords: string | null;
}

function parseProducts(items: WpItem[]): WpProduct[] {
  const products: WpProduct[] = [];
  for (const item of items) {
    if (item.postType !== "product") continue;
    const xml = item.raw;
    const slug = extractCdata(xml, "wp:post_name") ?? `product-${item.postId}`;
    const name = extractText(xml, "title") ?? "Untitled";
    const status = extractCdata(xml, "wp:status") ?? "draft";
    const shortDescription = extractCdata(xml, "excerpt:encoded") ?? "";
    const longDescription = extractCdata(xml, "content:encoded") ?? "";
    const permalink = extractText(xml, "link");
    const publishedAt = parseDate(extractText(xml, "pubDate"));

    const sku = extractMeta(xml, "_sku") ?? slug.toUpperCase();
    const regularPrice = parsePrice(extractMeta(xml, "_regular_price"));
    const salePriceRaw = extractMeta(xml, "_sale_price");
    const salePrice = salePriceRaw ? parsePrice(salePriceRaw) : null;
    const stockRaw = extractMeta(xml, "_stock");
    const stock = stockRaw ? parseInt(stockRaw, 10) || 0 : 0;
    const manageStock = (extractMeta(xml, "_manage_stock") ?? "no") === "yes";
    const totalSales = parseInteger(extractMeta(xml, "total_sales")) ?? 0;
    const weightRaw = extractMeta(xml, "_weight");
    const weight = weightRaw ? parsePrice(weightRaw) : null;
    const averageRatingRaw = extractMeta(xml, "_wc_average_rating");
    const averageRating = averageRatingRaw && averageRatingRaw !== "0" ? parsePrice(averageRatingRaw) : null;
    const reviewCount = parseInteger(extractMeta(xml, "_wc_review_count")) ?? 0;
    const thumbnailId = parseInteger(extractMeta(xml, "_thumbnail_id"));
    const galleryRaw = extractMeta(xml, "_product_image_gallery");
    const galleryIds = galleryRaw
      ? galleryRaw.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => Number.isFinite(n))
      : [];

    // Categories — extract category names from product_cat domain
    const catRe = /<category domain="product_cat" nicename="[^"]*"><!\[CDATA\[([^\]]+)\]\]><\/category>/g;
    const categoryNames: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = catRe.exec(xml)) !== null) {
      categoryNames.push(decodeEntities(m[1]));
    }

    // Yoast SEO
    const seoTitle = extractMeta(xml, "_yoast_wpseo_title");
    const seoDescription = extractMeta(xml, "_yoast_wpseo_metadesc");
    const seoFocusKw = extractMeta(xml, "_yoast_wpseo_focuskw");
    const seoKeywords = extractMeta(xml, "_yoast_wpseo_metakeywords");

    products.push({
      postId: item.postId,
      slug,
      name,
      status,
      shortDescription: decodeEntities(shortDescription).trim(),
      longDescription: decodeEntities(longDescription).trim(),
      sku,
      regularPrice,
      salePrice,
      stock,
      manageStock,
      totalSales,
      weight,
      averageRating,
      reviewCount,
      thumbnailId,
      galleryIds,
      categoryNames,
      permalink,
      publishedAt,
      seoTitle,
      seoDescription,
      seoFocusKw,
      seoKeywords,
    });
  }
  return products;
}

// ──────────────────────────────────────────────────────────── orders

interface WpOrder {
  postId: number;
  status: string;
  postDate: Date | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  total: number;
  currency: string;
  paymentMethod: string | null;
  orderKey: string | null;
  customerUserId: number | null;
}

function parseOrders(items: WpItem[]): WpOrder[] {
  const orders: WpOrder[] = [];
  for (const item of items) {
    if (item.postType !== "shop_order") continue;
    const xml = item.raw;
    const status = extractCdata(xml, "wp:status") ?? "wc-pending";
    const postDate = parseDate(extractCdata(xml, "wp:post_date"));
    const email = extractMeta(xml, "_billing_email");
    const firstName = extractMeta(xml, "_billing_first_name");
    const lastName = extractMeta(xml, "_billing_last_name");
    const phone = extractMeta(xml, "_billing_phone");
    const total = parsePrice(extractMeta(xml, "_order_total"));
    const currency = extractMeta(xml, "_order_currency") ?? "SEK";
    const paymentMethod = extractMeta(xml, "_payment_method");
    const orderKey = extractMeta(xml, "_order_key");
    const customerUserRaw = extractMeta(xml, "_customer_user");
    const customerUserId = customerUserRaw ? parseInt(customerUserRaw, 10) || null : null;

    orders.push({
      postId: item.postId,
      status,
      postDate,
      email: email?.toLowerCase().trim() || null,
      firstName: firstName?.trim() || null,
      lastName: lastName?.trim() || null,
      phone: phone?.trim() || null,
      total,
      currency,
      paymentMethod,
      orderKey,
      customerUserId,
    });
  }
  return orders;
}

const mapOrderStatus = (wpStatus: string): OrderStatus => {
  const s = wpStatus.replace(/^wc-/, "");
  switch (s) {
    case "completed":
    case "shipped":
      return "FULFILLED";
    case "processing":
    case "on-hold":
      return "PAID";
    case "cancelled":
    case "failed":
      return "CANCELLED";
    case "refunded":
      return "REFUNDED";
    case "pending":
    default:
      return "PENDING";
  }
};

const mapPaymentProvider = (method: string | null): PaymentProvider => {
  if (!method) return "MANUAL";
  if (method.includes("klarna")) return "KLARNA";
  if (method.includes("stripe")) return "STRIPE";
  return "MANUAL";
};

// ──────────────────────────────────────────────────────────── image download

async function downloadImage(
  url: string,
  destDir: string,
  filename: string
): Promise<string | null> {
  const dest = join(destDir, filename);
  if (existsSync(dest)) {
    return `/products/${filename}`;
  }
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "biomax-migration/1.0" },
      // Some servers are slow; give it a generous timeout
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      console.warn(`  ⚠️  fetch ${res.status} ${url}`);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(dest, buf);
    return `/products/${filename}`;
  } catch (err) {
    console.warn(`  ⚠️  download error ${url}: ${(err as Error).message}`);
    return null;
  }
}

function fileNameForAttachment(att: WpAttachment, productSlug: string): string {
  const ext = extname(att.url) || ".jpg";
  const base = basename(att.url, ext)
    .replace(/[^a-z0-9-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `${productSlug}-${att.attachmentId}-${base}${ext}`;
}

// ──────────────────────────────────────────────────────────── main

async function main() {
  const tenant = await prisma.tenant.findFirstOrThrow({ where: { slug: "biomax" } });
  const tenantId = tenant.id;
  const xmlPath = resolve(
    process.cwd(),
    process.argv[2] ?? "biomax.WordPress.2026-05-10.xml"
  );
  console.log(`📂 Reading ${xmlPath}`);
  const xml = await readFile(xmlPath, "utf-8");
  console.log(`   ${(xml.length / 1024 / 1024).toFixed(1)} MB`);

  console.log(`🔪 Splitting items...`);
  const items = splitItems(xml);
  console.log(`   ${items.length} <item> blocks`);

  // ── 1. Categories ──────────────────────────────────────────
  console.log(`\n📁 Importing categories`);
  const wpCats = parseCategories(xml);
  console.log(`   ${wpCats.length} product_cat terms found`);
  for (const c of wpCats) {
    await prisma.category.upsert({
      where: { tenantId_legacyWpId: { tenantId, legacyWpId: c.termId } },
      update: { name: c.name, description: c.description, slug: c.slug },
      create: {
        tenantId,
        legacyWpId: c.termId,
        slug: c.slug,
        name: c.name,
        description: c.description,
      },
    });
  }
  const dbCats = await prisma.category.findMany();
  const catByName = new Map(dbCats.map((c) => [c.name.toLowerCase(), c]));
  console.log(`   ✓ ${dbCats.length} categories in DB`);

  // ── 2. Attachments index ───────────────────────────────────
  console.log(`\n🖼  Indexing attachments`);
  const attachments = parseAttachments(items);
  console.log(`   ${attachments.size} attachments indexed`);

  // ── 3. Products ────────────────────────────────────────────
  console.log(`\n🌿 Importing products`);
  const wpProducts = parseProducts(items);
  console.log(`   ${wpProducts.length} products found`);

  const productImageDir = resolve(process.cwd(), "public/products");
  await mkdir(productImageDir, { recursive: true });

  for (const p of wpProducts) {
    // Resolve thumbnail + gallery URLs (download to public/products/)
    let imageUrl = "/products/_placeholder.svg";
    const galleryUrls: string[] = [];

    if (p.thumbnailId && attachments.has(p.thumbnailId)) {
      const att = attachments.get(p.thumbnailId)!;
      const fname = fileNameForAttachment(att, p.slug);
      const local = await downloadImage(att.url, productImageDir, fname);
      if (local) imageUrl = local;
    }

    for (const gid of p.galleryIds) {
      if (!attachments.has(gid)) continue;
      const att = attachments.get(gid)!;
      const fname = fileNameForAttachment(att, p.slug);
      const local = await downloadImage(att.url, productImageDir, fname);
      if (local) galleryUrls.push(local);
    }

    // Connect categories by name match
    const categoryConnect = p.categoryNames
      .map((cn) => catByName.get(cn.toLowerCase()))
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
      .map((c) => ({ id: c.id }));

    const status: ProductStatus = p.status === "publish" ? "PUBLISHED" : "DRAFT";

    const data = {
      sku: p.sku || `WP-${p.postId}`,
      slug: p.slug,
      name: p.name,
      shortDescription: p.shortDescription || p.name,
      longDescription: p.longDescription || p.shortDescription || p.name,
      status,
      price: p.regularPrice || 0,
      compareAtPrice: p.salePrice && p.salePrice < p.regularPrice ? p.regularPrice : null,
      stock: p.stock,
      manageStock: p.manageStock,
      totalSales: p.totalSales,
      weight: p.weight,
      imageUrl,
      galleryUrls,
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
      seoFocusKw: p.seoFocusKw,
      aiKeywords: p.seoKeywords ? p.seoKeywords.split(",").map((s) => s.trim()).filter(Boolean) : [],
      legacyWpId: p.postId,
      legacyPermalink: p.permalink,
      publishedAt: p.publishedAt,
    };

    const existing = await prisma.product.findFirst({
      where: { legacyWpId: p.postId },
      include: { categories: true },
    });

    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          ...data,
          categories: {
            disconnect: existing.categories.map((c) => ({ id: c.id })),
            connect: categoryConnect,
          },
        },
      });
    } else {
      await prisma.product.create({
        data: {
          ...data,
          tenantId,
          categories: { connect: categoryConnect },
        },
      });
    }
    process.stdout.write(`.`);
  }
  console.log(`\n   ✓ ${wpProducts.length} products imported`);

  // ── 4. Customers (from order billing emails) ───────────────
  console.log(`\n👤 Importing customers`);
  const wpOrders = parseOrders(items);
  console.log(`   ${wpOrders.length} orders found`);

  // Group orders by email to derive unique customers (with their latest billing data)
  const customerMap = new Map<
    string,
    {
      email: string;
      firstName: string | null;
      lastName: string | null;
      phone: string | null;
      legacyWpUserId: number | null;
      lastSeen: Date;
    }
  >();
  for (const o of wpOrders) {
    if (!o.email) continue;
    const prev = customerMap.get(o.email);
    if (!prev || (o.postDate && o.postDate > prev.lastSeen)) {
      customerMap.set(o.email, {
        email: o.email,
        firstName: o.firstName,
        lastName: o.lastName,
        phone: o.phone,
        legacyWpUserId: o.customerUserId,
        lastSeen: o.postDate ?? new Date(0),
      });
    }
  }
  console.log(`   ${customerMap.size} unique customer emails`);

  // Email is the canonical key. legacyWpId on User is intentionally NOT set during this
  // bulk import — WP customer_user IDs sometimes collide across email changes, and the
  // value isn't load-bearing for any current feature. Can be backfilled later if needed.
  let customersCreated = 0;
  let customersUpdated = 0;
  for (const c of customerMap.values()) {
    const fullName = [c.firstName, c.lastName].filter(Boolean).join(" ").trim() || null;
    const result = await prisma.user.upsert({
      where: { email: c.email },
      update: {
        firstName: c.firstName,
        lastName: c.lastName,
        name: fullName,
        phone: c.phone,
      },
      create: {
        email: c.email,
        firstName: c.firstName,
        lastName: c.lastName,
        name: fullName,
        phone: c.phone,
        role: "customer",
        locale: "sv-SE",
        emailVerified: false, // they'll verify on first password reset
      },
    });
    if (result.createdAt.getTime() === result.updatedAt.getTime()) customersCreated++;
    else customersUpdated++;
  }
  console.log(`   ✓ ${customersCreated} created, ${customersUpdated} updated`);

  // ── 5. Orders ──────────────────────────────────────────────
  console.log(`\n📦 Importing orders (this is the slow part)`);
  // Build email → user.id map for FK linking
  const allUsers = await prisma.user.findMany({ select: { id: true, email: true } });
  const userByEmail = new Map(allUsers.map((u) => [u.email.toLowerCase(), u.id]));

  let imported = 0;
  let skipped = 0;
  const batchSize = 500;
  // Process in batches to avoid overwhelming the DB
  for (let i = 0; i < wpOrders.length; i += batchSize) {
    const batch = wpOrders.slice(i, i + batchSize);
    const data = batch.map((o) => {
      // Swedish supplements were 25% VAT pre-2026, prices stored gross.
      // VAT = total × (0.25 / 1.25) = total × 0.20. taxRateBp = 2500
      // is persisted on the row so the historical rate survives future
      // rate changes (schema default was dropped in the post-audit
      // migration to force callers to be explicit about the rate).
      const taxAmount = Math.round(o.total * 0.2 * 100) / 100;
      const HISTORICAL_VAT_BP = 2500;
      return {
        tenantId,
        orderNumber: `WP-${o.postId}`,
        email: o.email ?? "unknown@biomax.nu",
        userId: o.email ? userByEmail.get(o.email) ?? null : null,
        status: mapOrderStatus(o.status),
        paymentProvider: mapPaymentProvider(o.paymentMethod),
        paymentReference: o.orderKey,
        currency: o.currency || "SEK",
        subtotal: o.total, // we don't have line-item breakdown
        totalAmount: o.total,
        taxAmount,
        taxRateBp: HISTORICAL_VAT_BP,
        legacyWpId: o.postId,
        legacySource: "wp-wxr-2026-05-10",
        createdAt: o.postDate ?? new Date(),
        updatedAt: o.postDate ?? new Date(),
      };
    });

    const result = await prisma.order.createMany({
      data,
      skipDuplicates: true,
    });
    imported += result.count;
    skipped += data.length - result.count;
    process.stdout.write(
      `   batch ${Math.floor(i / batchSize) + 1}: +${result.count} (cumulative ${imported})\n`
    );
  }
  console.log(`   ✓ ${imported} orders inserted, ${skipped} skipped (existed)`);

  // ── 6. Summary ─────────────────────────────────────────────
  const counts = await prisma.$transaction([
    prisma.category.count(),
    prisma.product.count(),
    prisma.user.count(),
    prisma.order.count(),
  ]);
  console.log(`\n📊 FINAL DB STATE`);
  console.log(`   Categories: ${counts[0]}`);
  console.log(`   Products:   ${counts[1]}`);
  console.log(`   Users:      ${counts[2]}`);
  console.log(`   Orders:     ${counts[3]}`);

  // Top products by total sales
  const topProducts = await prisma.product.findMany({
    orderBy: { totalSales: "desc" },
    take: 5,
    select: { name: true, sku: true, totalSales: true, price: true },
  });
  console.log(`\n🏆 TOP 5 PRODUCTS BY SALES`);
  for (const p of topProducts) {
    console.log(`   ${p.totalSales.toString().padStart(5)}  ${p.name} (${p.sku}, ${p.price} kr)`);
  }
}

main()
  .catch((err) => {
    console.error("\n❌ Import failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
