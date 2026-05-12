"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./guard";

export type RenameSlugResult =
  | { ok: true; slug: string }
  | { ok: false; error: string };

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Rename a product's slug and write a 301 redirect from the old path. The
 * redirect chain stays a single hop — if the target slug already shows up
 * in the Redirect table as a `fromPath`, that stale row is removed first
 * so we never serve `/produkter/x → /produkter/y → /produkter/z`.
 */
export async function renameProductSlug(
  oldSlug: string,
  newSlug: string
): Promise<RenameSlugResult> {
  await requireAdmin();
  const next = newSlug.trim().toLowerCase();
  if (!SLUG_RE.test(next))
    return {
      ok: false,
      error: "Slug får bara innehålla a–z, 0–9 och bindestreck.",
    };
  if (next === oldSlug) return { ok: true, slug: oldSlug };

  const existing = await prisma.product.findUnique({
    where: { slug: oldSlug },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Produkten hittades inte." };

  const collision = await prisma.product.findUnique({
    where: { slug: next },
    select: { id: true },
  });
  if (collision) return { ok: false, error: "Slug används redan." };

  const oldPath = `/produkter/${oldSlug}`;
  const newPath = `/produkter/${next}`;

  try {
    await prisma.$transaction([
      prisma.product.update({
        where: { id: existing.id },
        data: { slug: next },
      }),
      // Drop a possibly stale redirect that pointed *into* the new slug —
      // prevents redirect chains.
      prisma.redirect.deleteMany({ where: { fromPath: newPath } }),
      prisma.redirect.upsert({
        where: { fromPath: oldPath },
        create: {
          fromPath: oldPath,
          toPath: newPath,
          reason: "slug-rename",
        },
        update: { toPath: newPath, reason: "slug-rename" },
      }),
      // Any redirects that previously targeted oldPath should now hop
      // straight to newPath (collapse the chain).
      prisma.redirect.updateMany({
        where: { toPath: oldPath },
        data: { toPath: newPath },
      }),
    ]);
  } catch (err) {
    console.error("renameProductSlug failed:", err);
    return { ok: false, error: "Kunde inte byta slug." };
  }

  revalidatePath(oldPath);
  revalidatePath(newPath);
  revalidatePath("/produkter");
  revalidatePath("/admin/produkter");
  return { ok: true, slug: next };
}
