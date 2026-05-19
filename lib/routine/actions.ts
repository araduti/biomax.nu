"use server";

import type { Prisma } from "@prisma/client";
import { tenantScope } from "@/lib/tenant/db";
import { currentTenant } from "@/lib/tenant";
import { currentUser } from "@/lib/session";
import { cuidSchema, fail } from "@/lib/validation/shared";

/**
 * "Min rutin" — saved-list of products the customer takes. Wraps the
 * Wishlist model.
 *
 * Tenant pattern for WRITE actions (ADR 0032 D2 + WITH CHECK):
 * resolve the tenant from the request Host, then run inside
 * `tenantScope(tenantId, …)` AND set `tenantId` explicitly on every
 * create/upsert — RLS (USING) scopes reads, the explicit column +
 * WITH CHECK (enabled at the 3b-2 lock-down) stop cross-tenant writes.
 */

export type RoutineActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function ensureWishlist(
  tx: Prisma.TransactionClient,
  tenantId: string,
  userId: string
): Promise<string> {
  const wl = await tx.wishlist.upsert({
    where: { userId },
    create: { userId, tenantId },
    update: {},
    select: { id: true },
  });
  return wl.id;
}

export async function addToRoutine(
  rawProductId: unknown
): Promise<RoutineActionResult> {
  const parsed = cuidSchema.safeParse(rawProductId);
  if (!parsed.success) return fail(parsed.error);
  const productId = parsed.data;
  const user = await currentUser();
  if (!user) return { ok: false, error: "Logga in för att spara i din rutin." };
  const { id: tenantId } = await currentTenant();
  try {
    return await tenantScope(tenantId, async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { id: true, status: true },
      });
      if (!product || product.status !== "PUBLISHED") {
        return { ok: false, error: "Produkten är inte tillgänglig." };
      }
      const wishlistId = await ensureWishlist(tx, tenantId, user.id);
      await tx.wishlistProduct.upsert({
        where: {
          wishlistId_productId: { wishlistId, productId: product.id },
        },
        create: { wishlistId, productId: product.id, tenantId },
        update: {},
      });
      return { ok: true };
    });
  } catch (err) {
    console.error("addToRoutine failed:", err);
    return { ok: false, error: "Kunde inte spara." };
  }
}

export async function removeFromRoutine(
  rawProductId: unknown
): Promise<RoutineActionResult> {
  const parsed = cuidSchema.safeParse(rawProductId);
  if (!parsed.success) return fail(parsed.error);
  const productId = parsed.data;
  const user = await currentUser();
  if (!user) return { ok: false, error: "Logga in först." };
  const { id: tenantId } = await currentTenant();
  try {
    return await tenantScope(tenantId, async (tx) => {
      const wl = await tx.wishlist.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (!wl) return { ok: true };
      await tx.wishlistProduct.deleteMany({
        where: { wishlistId: wl.id, productId },
      });
      return { ok: true };
    });
  } catch (err) {
    console.error("removeFromRoutine failed:", err);
    return { ok: false, error: "Kunde inte ta bort." };
  }
}

/**
 * Whether a given product is already in the viewer's routine. Used by
 * the PDP button to render its toggled state on first paint.
 */
export async function isInRoutine(productId: string): Promise<boolean> {
  const user = await currentUser();
  if (!user) return false;
  const { id: tenantId } = await currentTenant();
  const row = await tenantScope(tenantId, (tx) =>
    tx.wishlistProduct.findFirst({
      where: { productId, wishlist: { userId: user.id } },
      select: { id: true },
    })
  );
  return Boolean(row);
}
