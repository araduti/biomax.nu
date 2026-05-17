"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./guard";
import { DEFAULT_BLOCKS, type BlockKind } from "@/lib/homepage/blocks";

const VALID_KINDS: BlockKind[] = [
  "hero",
  "trustpilot-bar",
  "bestsellers",
  "categories",
  "founder-band",
  "knowledge-teaser",
  "newsletter",
  "bundle-rail",
];

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Seed the HomepageBlock table from `DEFAULT_BLOCKS` if it's empty.
 * Lets an editor go from "rendering from defaults" to "rendering from
 * DB" with one click — they can then tweak rather than recreate.
 */
export async function seedFromDefaults(): Promise<ActionResult> {
  await requireAdmin();
  const count = await prisma.homepageBlock.count();
  if (count > 0) return { ok: false, error: "Tabellen är inte tom." };
  await prisma.homepageBlock.createMany({
    data: DEFAULT_BLOCKS.map((b) => ({
      kind: b.kind,
      payload: b.payload as object,
      position: b.position,
      active: b.active,
    })),
  });
  revalidatePath("/admin/startsida");
  revalidatePath("/");
  return { ok: true };
}

export async function setBlockActive(
  id: string,
  active: boolean
): Promise<ActionResult> {
  await requireAdmin();
  await prisma.homepageBlock.update({ where: { id }, data: { active } });
  revalidatePath("/admin/startsida");
  revalidatePath("/");
  return { ok: true };
}

export async function setBlockPosition(
  id: string,
  position: number
): Promise<ActionResult> {
  await requireAdmin();
  if (!Number.isFinite(position)) return { ok: false, error: "Ogiltig position." };
  await prisma.homepageBlock.update({
    where: { id },
    data: { position: Math.round(position) },
  });
  revalidatePath("/admin/startsida");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteBlock(id: string): Promise<ActionResult> {
  await requireAdmin();
  await prisma.homepageBlock.delete({ where: { id } });
  revalidatePath("/admin/startsida");
  revalidatePath("/");
  return { ok: true };
}

export async function createBlock(
  kind: BlockKind,
  position: number
): Promise<ActionResult> {
  await requireAdmin();
  if (!VALID_KINDS.includes(kind))
    return { ok: false, error: "Okänd blocktyp." };
  await prisma.homepageBlock.create({
    data: { kind, payload: {}, position, active: true },
  });
  revalidatePath("/admin/startsida");
  revalidatePath("/");
  return { ok: true };
}
