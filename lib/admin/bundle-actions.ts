"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./guard";
import { slugify } from "@/lib/text/slug";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type BundleActionResult =
  | { ok: true; slug: string }
  | { ok: false; error: string };

export async function createBundle(input: {
  name: string;
  slug?: string;
  description?: string;
  discountPercent: number;
  productSlugs: string[];
}): Promise<BundleActionResult> {
  await requireAdmin();
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Namn krävs." };

  const slug = (input.slug?.trim() || slugify(name)).toLowerCase();
  if (!SLUG_RE.test(slug))
    return { ok: false, error: "Ogiltig slug." };

  if (!Number.isInteger(input.discountPercent) || input.discountPercent < 0 || input.discountPercent > 100)
    return { ok: false, error: "Rabatt måste vara 0–100." };

  if (input.productSlugs.length < 2)
    return { ok: false, error: "Ett paket behöver minst 2 produkter." };

  const collision = await prisma.bundle.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (collision) return { ok: false, error: "Slug används redan." };

  const products = await prisma.product.findMany({
    where: { slug: { in: input.productSlugs } },
    select: { id: true, slug: true },
  });
  const idBySlug = new Map(products.map((p) => [p.slug, p.id]));
  const orderedIds = input.productSlugs
    .map((s) => idBySlug.get(s))
    .filter((id): id is string => !!id);

  if (orderedIds.length < 2)
    return { ok: false, error: "Hittade inte tillräckligt med produkter." };

  try {
    await prisma.bundle.create({
      data: {
        slug,
        name,
        description: input.description?.trim() || null,
        discountPercent: input.discountPercent,
        items: {
          create: orderedIds.map((productId, i) => ({
            productId,
            position: i,
          })),
        },
      },
    });
  } catch (err) {
    console.error("createBundle failed:", err);
    return { ok: false, error: "Kunde inte skapa paketet." };
  }

  revalidatePath("/admin/paket");
  revalidatePath("/paket");
  return { ok: true, slug };
}

export async function updateBundle(input: {
  slug: string;
  name?: string;
  description?: string | null;
  discountPercent?: number;
  productSlugs?: string[];
  active?: boolean;
}): Promise<BundleActionResult> {
  await requireAdmin();
  const existing = await prisma.bundle.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Paketet hittades inte." };

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) {
    const n = input.name.trim();
    if (!n) return { ok: false, error: "Namn krävs." };
    data.name = n;
  }
  if (input.description !== undefined)
    data.description = input.description?.trim() || null;
  if (input.discountPercent !== undefined) {
    if (
      !Number.isInteger(input.discountPercent) ||
      input.discountPercent < 0 ||
      input.discountPercent > 100
    )
      return { ok: false, error: "Rabatt måste vara 0–100." };
    data.discountPercent = input.discountPercent;
  }
  if (input.active !== undefined) data.active = input.active;

  try {
    await prisma.bundle.update({
      where: { id: existing.id },
      data,
    });

    if (input.productSlugs !== undefined) {
      if (input.productSlugs.length < 2)
        return { ok: false, error: "Ett paket behöver minst 2 produkter." };
      const products = await prisma.product.findMany({
        where: { slug: { in: input.productSlugs } },
        select: { id: true, slug: true },
      });
      const idBySlug = new Map(products.map((p) => [p.slug, p.id]));
      const orderedIds = input.productSlugs
        .map((s) => idBySlug.get(s))
        .filter((id): id is string => !!id);
      await prisma.$transaction([
        prisma.bundleItem.deleteMany({ where: { bundleId: existing.id } }),
        prisma.bundleItem.createMany({
          data: orderedIds.map((productId, i) => ({
            bundleId: existing.id,
            productId,
            position: i,
          })),
        }),
      ]);
    }
  } catch (err) {
    console.error("updateBundle failed:", err);
    return { ok: false, error: "Kunde inte spara." };
  }

  revalidatePath("/admin/paket");
  revalidatePath("/paket");
  revalidatePath(`/paket/${input.slug}`);
  return { ok: true, slug: input.slug };
}

export async function deleteBundle(
  slug: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const row = await prisma.bundle.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!row) return { ok: false, error: "Paketet hittades inte." };
  await prisma.bundle.delete({ where: { id: row.id } });
  revalidatePath("/admin/paket");
  revalidatePath("/paket");
  return { ok: true };
}
