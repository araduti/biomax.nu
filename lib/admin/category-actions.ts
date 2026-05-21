"use server";

import { revalidatePath } from "next/cache";
import { requireTenantRole } from "./guard";
import { tenantScope } from "@/lib/tenant/db";
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
  const { tenantId } = await requireTenantRole("admin");
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Namn krävs." };

  const slug = (input.slug?.trim() || slugify(name)).toLowerCase();
  if (!SLUG_RE.test(slug))
    return { ok: false, error: "Ogiltig slug — använd a–z, 0–9, bindestreck." };

  try {
    const dup = await tenantScope(tenantId, async (tx) => {
      const collision = await tx.category.findFirst({
        where: { slug },
        select: { id: true },
      });
      if (collision) return true;
      await tx.category.create({
        data: {
          slug,
          name,
          description: input.description?.trim() || null,
          tenantId,
        },
      });
      return false;
    });
    if (dup) return { ok: false, error: "Slug används redan." };
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
  const { tenantId } = await requireTenantRole("admin");

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) {
    const n = input.name.trim();
    if (!n) return { ok: false, error: "Namn krävs." };
    data.name = n;
  }
  if (input.description !== undefined)
    data.description = input.description?.trim() || null;

  let finalSlug = input.slug;
  let nextSlug: string | null = null;
  if (input.newSlug !== undefined) {
    const next = input.newSlug.trim().toLowerCase();
    if (next && next !== input.slug) {
      if (!SLUG_RE.test(next))
        return {
          ok: false,
          error: "Ogiltig slug — använd a–z, 0–9, bindestreck.",
        };
      nextSlug = next;
    }
  }

  type UpdateOutcome =
    | { kind: "missing" }
    | { kind: "collision" }
    | { kind: "ok" };
  let outcome: UpdateOutcome;
  try {
    outcome = await tenantScope(tenantId, async (tx): Promise<UpdateOutcome> => {
      const existing = await tx.category.findFirst({
        where: { slug: input.slug },
        select: { id: true },
      });
      if (!existing) return { kind: "missing" };

      if (nextSlug) {
        const collision = await tx.category.findFirst({
          where: { slug: nextSlug },
          select: { id: true },
        });
        if (collision) return { kind: "collision" };
        data.slug = nextSlug;
        finalSlug = nextSlug;
      }

      await tx.category.update({ where: { id: existing.id }, data });
      if (finalSlug !== input.slug) {
        // Mirror the product slug-rename pattern: 301 the old URL.
        const oldPath = `/kategorier/${input.slug}`;
        const newPath = `/kategorier/${finalSlug}`;
        await tx.redirect.deleteMany({ where: { fromPath: newPath } });
        await tx.redirect.upsert({
          where: { tenantId_fromPath: { tenantId, fromPath: oldPath } },
          create: {
            fromPath: oldPath,
            toPath: newPath,
            reason: "category-rename",
            tenantId,
          },
          update: { toPath: newPath, reason: "category-rename" },
        });
        await tx.redirect.updateMany({
          where: { toPath: oldPath },
          data: { toPath: newPath },
        });
      }
      return { kind: "ok" };
    });
  } catch (err) {
    console.error("updateCategory failed:", err);
    return { ok: false, error: "Kunde inte spara kategorin." };
  }
  if (outcome.kind === "missing")
    return { ok: false, error: "Kategorin hittades inte." };
  if (outcome.kind === "collision")
    return { ok: false, error: "Slug används redan." };

  revalidatePath("/admin/kategorier");
  revalidatePath("/kategorier");
  revalidatePath(`/kategorier/${input.slug}`);
  revalidatePath(`/kategorier/${finalSlug}`);
  return { ok: true, slug: finalSlug };
}

export async function deleteCategory(
  slug: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { tenantId } = await requireTenantRole("admin");
  if (slug === "uncategorized")
    return { ok: false, error: "Standardkategorin kan inte tas bort." };

  type DelOutcome =
    | { kind: "missing" }
    | { kind: "hasProducts"; count: number }
    | { kind: "ok" };
  let outcome: DelOutcome;
  try {
    outcome = await tenantScope(tenantId, async (tx): Promise<DelOutcome> => {
      const existing = await tx.category.findFirst({
        where: { slug },
        select: { id: true, _count: { select: { products: true } } },
      });
      if (!existing) return { kind: "missing" };
      if (existing._count.products > 0)
        return { kind: "hasProducts", count: existing._count.products };
      await tx.category.delete({ where: { id: existing.id } });
      return { kind: "ok" };
    });
  } catch (err) {
    console.error("deleteCategory failed:", err);
    return { ok: false, error: "Kunde inte ta bort kategorin." };
  }
  if (outcome.kind === "missing")
    return { ok: false, error: "Kategorin hittades inte." };
  if (outcome.kind === "hasProducts")
    return {
      ok: false,
      error: `Kategorin har ${outcome.count} produkter — flytta eller avpublicera dem först.`,
    };

  revalidatePath("/admin/kategorier");
  revalidatePath("/kategorier");
  return { ok: true };
}
