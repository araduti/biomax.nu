import { prisma } from "@/lib/prisma";
import { DEFAULT_BLOCKS, type Block, type BlockKind } from "./blocks";

/**
 * Resolve the ordered, active list of homepage blocks. Falls back to
 * `DEFAULT_BLOCKS` when no curation rows exist in DB — keeps the
 * page identical to the pre-curation baseline until an editor flips it.
 */
export async function getHomepageBlocks(): Promise<Block[]> {
  const rows = await prisma.homepageBlock.findMany({
    where: { active: true },
    orderBy: { position: "asc" },
    select: { kind: true, payload: true, position: true, active: true },
  });

  if (rows.length === 0) {
    return DEFAULT_BLOCKS.filter((b) => b.active);
  }
  return rows.map((r) => ({
    kind: r.kind as BlockKind,
    payload: r.payload,
    position: r.position,
    active: r.active,
  }));
}
