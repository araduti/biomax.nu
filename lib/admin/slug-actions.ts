"use server";

import { revalidatePath } from "next/cache";
import { requireTenantRole } from "./guard";
import { tenantScope } from "@/lib/tenant/db";

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
  const { tenantId } = await requireTenantRole("admin");
  const next = newSlug.trim().toLowerCase();
  if (!SLUG_RE.test(next))
    return {
      ok: false,
      error: "Slug får bara innehålla a–z, 0–9 och bindestreck.",
    };
  if (next === oldSlug) return { ok: true, slug: oldSlug };

  const oldPath = `/produkter/${oldSlug}`;
  const newPath = `/produkter/${next}`;

  type RenameOutcome =
    | { kind: "missing" }
    | { kind: "collision" }
    | { kind: "ok" };
  let outcome: RenameOutcome;
  try {
    outcome = await tenantScope(tenantId, async (tx): Promise<RenameOutcome> => {
      const existing = await tx.product.findUnique({
        where: { slug: oldSlug },
        select: { id: true },
      });
      if (!existing) return { kind: "missing" };

      const collision = await tx.product.findUnique({
        where: { slug: next },
        select: { id: true },
      });
      if (collision) return { kind: "collision" };

      await tx.product.update({
        where: { id: existing.id },
        data: { slug: next },
      });
      // Drop a possibly stale redirect that pointed *into* the new slug —
      // prevents redirect chains.
      await tx.redirect.deleteMany({ where: { fromPath: newPath } });
      await tx.redirect.upsert({
        where: { fromPath: oldPath },
        create: {
          fromPath: oldPath,
          toPath: newPath,
          reason: "slug-rename",
          tenantId,
        },
        update: { toPath: newPath, reason: "slug-rename" },
      });
      // Any redirects that previously targeted oldPath should now hop
      // straight to newPath (collapse the chain).
      await tx.redirect.updateMany({
        where: { toPath: oldPath },
        data: { toPath: newPath },
      });
      return { kind: "ok" };
    });
  } catch (err) {
    console.error("renameProductSlug failed:", err);
    return { ok: false, error: "Kunde inte byta slug." };
  }
  if (outcome.kind === "missing")
    return { ok: false, error: "Produkten hittades inte." };
  if (outcome.kind === "collision")
    return { ok: false, error: "Slug används redan." };

  revalidatePath(oldPath);
  revalidatePath(newPath);
  revalidatePath("/produkter");
  revalidatePath("/admin/produkter");
  return { ok: true, slug: next };
}
