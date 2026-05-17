"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./guard";
import { slugify } from "@/lib/text/slug";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type CategoryActionResult =
  | { ok: true; slug: string }
  | { ok: false; error: string };

export async function createCategory(input: {
  name: string;
  slug?: string;
  description?: string;
}): Promise<CategoryActionResult> {
  await requireAdmin();
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Namn krävs." };

  const slug = (input.slug?.trim() || slugify(name)).toLowerCase();
  if (!SLUG_RE.test(slug))
    return { ok: false, error: "Ogiltig slug — använd a–z, 0–9, bindestreck." };

  const collision = await prisma.category.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (collision) return { ok: false, error: "Slug används redan." };

  try {
    await prisma.category.create({
      data: { slug, name, description: input.description?.trim() || null },
    });
  } catch (err) {
    console.error("createCategory failed:", err);
    return { ok: false, error: "Kunde inte skapa kategorin." };
  }

  revalidatePath("/admin/kategorier");
  revalidatePath("/kategorier");
  return { ok: true, slug };
}

export async function updateCategory(input: {
  slug: string;
  name?: string;
  description?: string | null;
  newSlug?: string;
}): Promise<CategoryActionResult> {
  await requireAdmin();
  const existing = await prisma.category.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Kategorin hittades inte." };

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) {
    const n = input.name.trim();
    if (!n) return { ok: false, error: "Namn krävs." };
    data.name = n;
  }
  if (input.description !== undefined)
    data.description = input.description?.trim() || null;

  let finalSlug = input.slug;
  if (input.newSlug !== undefined) {
    const next = input.newSlug.trim().toLowerCase();
    if (next && next !== input.slug) {
      if (!SLUG_RE.test(next))
        return {
          ok: false,
          error: "Ogiltig slug — använd a–z, 0–9, bindestreck.",
        };
      const collision = await prisma.category.findUnique({
        where: { slug: next },
        select: { id: true },
      });
      if (collision) return { ok: false, error: "Slug används redan." };
      data.slug = next;
      finalSlug = next;
    }
  }

  try {
    await prisma.category.update({
      where: { id: existing.id },
      data,
    });
    if (finalSlug !== input.slug) {
      // Mirror the product slug-rename pattern: 301 the old category URL.
      const oldPath = `/kategorier/${input.slug}`;
      const newPath = `/kategorier/${finalSlug}`;
      await prisma.redirect.deleteMany({ where: { fromPath: newPath } });
      await prisma.redirect.upsert({
        where: { fromPath: oldPath },
        create: { fromPath: oldPath, toPath: newPath, reason: "category-rename" },
        update: { toPath: newPath, reason: "category-rename" },
      });
      await prisma.redirect.updateMany({
        where: { toPath: oldPath },
        data: { toPath: newPath },
      });
    }
  } catch (err) {
    console.error("updateCategory failed:", err);
    return { ok: false, error: "Kunde inte spara kategorin." };
  }

  revalidatePath("/admin/kategorier");
  revalidatePath("/kategorier");
  revalidatePath(`/kategorier/${input.slug}`);
  revalidatePath(`/kategorier/${finalSlug}`);
  return { ok: true, slug: finalSlug };
}

export async function deleteCategory(
  slug: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  if (slug === "uncategorized")
    return { ok: false, error: "Standardkategorin kan inte tas bort." };

  const existing = await prisma.category.findUnique({
    where: { slug },
    select: { id: true, _count: { select: { products: true } } },
  });
  if (!existing) return { ok: false, error: "Kategorin hittades inte." };
  if (existing._count.products > 0)
    return {
      ok: false,
      error: `Kategorin har ${existing._count.products} produkter — flytta eller avpublicera dem först.`,
    };

  try {
    await prisma.category.delete({ where: { id: existing.id } });
  } catch (err) {
    console.error("deleteCategory failed:", err);
    return { ok: false, error: "Kunde inte ta bort kategorin." };
  }

  revalidatePath("/admin/kategorier");
  revalidatePath("/kategorier");
  return { ok: true };
}
