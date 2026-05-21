import { prisma } from "@/lib/prisma";

/**
 * Seed Easy Way (Lactium®) variants: 30 kaps & 90 kaps.
 *
 * Prices from current biomax.nu:
 *   - 30 kaps: 189 kr
 *   - 90 kaps: 450 kr  (~17% per-cap discount on the bigger pack)
 *
 * The 30-kaps variant inherits the existing product SKU; the 90-kaps gets
 * a suffixed SKU. Default = 30 kaps to match the cheaper landing price.
 */
async function main() {
  const product = await prisma.product.findFirst({
    where: {
      OR: [
        { slug: { contains: "easy" } },
        { name: { contains: "Easy", mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      slug: true,
      sku: true,
      name: true,
      stock: true,
      manageStock: true,
      tenantId: true,
      variants: { select: { id: true, label: true } },
    },
  });

  if (!product) {
    console.error("Easy Way product not found.");
    process.exit(1);
  }
  console.log(
    `Found ${product.name} (${product.slug}) — sku=${product.sku}, existing variants=${product.variants.length}`
  );

  if (product.variants.length > 0) {
    console.log("Removing existing variants:", product.variants.map((v) => v.label));
    await prisma.productVariant.deleteMany({ where: { productId: product.id } });
  }

  const baseSku = product.sku;
  const carryStock = product.stock || 0;

  // Biomax tenant content — variant rows live under the same tenant
  // as their parent product (post-#3e tenantId is NOT NULL).
  const tenantId = product.tenantId;
  await prisma.productVariant.createMany({
    data: [
      {
        tenantId,
        productId: product.id,
        sku: `${baseSku}-30`,
        label: "30 kapslar",
        position: 0,
        price: 189,
        stock: carryStock,
        manageStock: product.manageStock,
        isDefault: true,
      },
      {
        tenantId,
        productId: product.id,
        sku: `${baseSku}-90`,
        label: "90 kapslar",
        position: 1,
        price: 450,
        stock: carryStock,
        manageStock: product.manageStock,
        isDefault: false,
      },
    ],
  });

  // Sync the parent product.price to the cheapest variant so the catalog
  // card shows "Från 189 kr" via existing displayPrice() logic.
  await prisma.product.update({
    where: { id: product.id },
    data: { price: 189 },
  });

  const after = await prisma.productVariant.findMany({
    where: { productId: product.id },
    orderBy: { position: "asc" },
  });
  console.log("Seeded variants:");
  for (const v of after) {
    console.log(
      `  - ${v.label.padEnd(12)} sku=${v.sku.padEnd(20)} price=${v.price.toString()} default=${v.isDefault}`
    );
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
