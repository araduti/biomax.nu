"use server";

import { revalidatePath } from "next/cache";
import { requireTenantRole } from "./guard";
import { tenantScope } from "@/lib/tenant/db";
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
  const { tenantId } = await requireTenantRole("admin");
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Namn krävs." };

  const slug = (input.slug?.trim() || slugify(name)).toLowerCase();
  if (!SLUG_RE.test(slug))
    return { ok: false, error: "Ogiltig slug." };

  if (!Number.isInteger(input.discountPercent) || input.discountPercent < 0 || input.discountPercent > 100)
    return { ok: false, error: "Rabatt måste vara 0–100." };

  if (input.productSlugs.length < 2)
    return { ok: false, error: "Ett paket behöver minst 2 produkter." };

  type CreateOutcome =
    | { kind: "collision" }
    | { kind: "tooFewProducts" }
    | { kind: "ok" };
  let outcome: CreateOutcome;
  try {
    outcome = await tenantScope(tenantId, async (tx): Promise<CreateOutcome> => {
      const collision = await tx.bundle.findFirst({
        where: { slug },
        select: { id: true },
      });
      if (collision) return { kind: "collision" };

      const products = await tx.product.findMany({
        where: { slug: { in: input.productSlugs } },
        select: { id: true, slug: true },
      });
      const idBySlug = new Map(products.map((p) => [p.slug, p.id]));
      const orderedIds = input.productSlugs
        .map((s) => idBySlug.get(s))
        .filter((id): id is string => !!id);

      if (orderedIds.length < 2) return { kind: "tooFewProducts" };

      await tx.bundle.create({
        data: {
          slug,
          name,
          description: input.description?.trim() || null,
          discountPercent: input.discountPercent,
          tenantId,
          items: {
            create: orderedIds.map((productId, i) => ({
              productId,
              position: i,
              tenantId,
            })),
          },
        },
      });
      return { kind: "ok" };
    });
  } catch (err) {
    console.error("createBundle failed:", err);
    return { ok: false, error: "Kunde inte skapa paketet." };
  }
  if (outcome.kind === "collision")
    return { ok: false, error: "Slug används redan." };
  if (outcome.kind === "tooFewProducts")
    return { ok: false, error: "Hittade inte tillräckligt med produkter." };

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
  const { tenantId } = await requireTenantRole("admin");

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

  // Validate productSlugs cardinality BEFORE the scope so no partial
  // write (the bundle update) happens when the product list is invalid.
  if (input.productSlugs !== undefined && input.productSlugs.length < 2)
    return { ok: false, error: "Ett paket behöver minst 2 produkter." };

  type UpdateOutcome = { kind: "missing" } | { kind: "ok" };
  let outcome: UpdateOutcome;
  try {
    outcome = await tenantScope(tenantId, async (tx): Promise<UpdateOutcome> => {
      const existing = await tx.bundle.findFirst({
        where: { slug: input.slug },
        select: { id: true },
      });
      if (!existing) return { kind: "missing" };

      await tx.bundle.update({
        where: { id: existing.id },
        data,
      });

      if (input.productSlugs !== undefined) {
        const products = await tx.product.findMany({
          where: { slug: { in: input.productSlugs } },
          select: { id: true, slug: true },
        });
        const idBySlug = new Map(products.map((p) => [p.slug, p.id]));
        const orderedIds = input.productSlugs
          .map((s) => idBySlug.get(s))
          .filter((id): id is string => !!id);
        await tx.bundleItem.deleteMany({ where: { bundleId: existing.id } });
        await tx.bundleItem.createMany({
          data: orderedIds.map((productId, i) => ({
            bundleId: existing.id,
            productId,
            position: i,
            tenantId,
          })),
        });
      }
      return { kind: "ok" };
    });
  } catch (err) {
    console.error("updateBundle failed:", err);
    return { ok: false, error: "Kunde inte spara." };
  }
  if (outcome.kind === "missing")
    return { ok: false, error: "Paketet hittades inte." };

  revalidatePath("/admin/paket");
  revalidatePath("/paket");
  revalidatePath(`/paket/${input.slug}`);
  return { ok: true, slug: input.slug };
}

export async function deleteBundle(
  slug: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { tenantId } = await requireTenantRole("admin");
  const found = await tenantScope(tenantId, async (tx) => {
    const row = await tx.bundle.findFirst({
      where: { slug },
      select: { id: true },
    });
    if (!row) return false;
    await tx.bundle.delete({ where: { id: row.id } });
    return true;
  });
  if (!found) return { ok: false, error: "Paketet hittades inte." };
  revalidatePath("/admin/paket");
  revalidatePath("/paket");
  return { ok: true };
}
