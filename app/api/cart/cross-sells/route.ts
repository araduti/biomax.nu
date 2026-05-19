/**
 * Cross-sell suggestions for the cart.
 *
 * Input: `?ids=<productId>,<productId>,…` — current cart product ids.
 *
 * Output: up to 4 PUBLISHED products that admins have flagged via
 * `ProductCrossSell` rows from any of the cart items. We exclude
 * products already in the cart so the strip never recommends what's
 * already there.
 *
 * Auth: none — the data is public catalog content. Rate-limited per IP
 * to keep abuse bounded.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { hostTenantScope } from "@/lib/tenant/db";
import { publicProductWhere } from "@/lib/products/availability";
import { cuidSchema } from "@/lib/validation/shared";

export const runtime = "nodejs";

const MAX_RESULTS = 4;

const QuerySchema = z.object({
  ids: z
    .array(cuidSchema)
    .max(50),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get("ids") ?? "";
  const parsed = QuerySchema.safeParse({
    ids: raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  });
  if (!parsed.success || parsed.data.ids.length === 0) {
    return NextResponse.json({ products: [] });
  }
  const cartIds = parsed.data.ids;
  const cartIdSet = new Set(cartIds);

  // Editor-pinned suggestions ordered by score per source product. Dedupe
  // by target id across all source products, drop any already in cart.
  const rows = await hostTenantScope((tx) =>
    tx.productCrossSell.findMany({
      where: {
        sourceProductId: { in: cartIds },
        targetProduct: { ...publicProductWhere() },
      },
      orderBy: { score: "desc" },
      select: {
        targetProduct: {
          select: {
            id: true,
            slug: true,
            name: true,
            shortDescription: true,
            imageUrl: true,
            price: true,
          },
        },
      },
    })
  );

  const seen = new Set<string>();
  const products: Array<{
    id: string;
    slug: string;
    name: string;
    shortDescription: string;
    imageUrl: string;
    price: string;
  }> = [];
  for (const { targetProduct: p } of rows) {
    if (cartIdSet.has(p.id) || seen.has(p.id)) continue;
    seen.add(p.id);
    products.push({
      id: p.id,
      slug: p.slug,
      name: p.name,
      shortDescription: p.shortDescription,
      imageUrl: p.imageUrl,
      price: p.price.toString(),
    });
    if (products.length >= MAX_RESULTS) break;
  }

  return NextResponse.json(
    { products },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } }
  );
}
