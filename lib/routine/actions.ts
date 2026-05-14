"use server";

import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";
import { cuidSchema, fail } from "@/lib/validation/shared";

/**
 * "Min rutin" — a saved-list of products the customer takes (or plans
 * to take) as part of their daily routine. Wraps the underlying
 * Wishlist model with shopping-friendly Swedish ("rutin", not "önskelista").
 *
 * Why a routine, not a wishlist? Per the 2026 category research, supplement
 * customers think in terms of daily habits — "what's in my morning stack"
 * — not gift registries. The data shape is the same; the framing isn't.
 *
 * Auth: every action requires a session. Logged-out users see the prompt
 * to sign in, never an empty list.
 */

export type RoutineActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function ensureWishlist(userId: string): Promise<string> {
  // Wishlist is 1:1 with user. Upsert so the first add doesn't need a
  // separate setup step.
  const wl = await prisma.wishlist.upsert({
    where: { userId },
    create: { userId },
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
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, status: true },
  });
  if (!product || product.status !== "PUBLISHED") {
    return { ok: false, error: "Produkten är inte tillgänglig." };
  }
  try {
    const wishlistId = await ensureWishlist(user.id);
    await prisma.wishlistProduct.upsert({
      where: {
        wishlistId_productId: { wishlistId, productId: product.id },
      },
      create: { wishlistId, productId: product.id },
      update: {},
    });
    return { ok: true };
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
  try {
    const wl = await prisma.wishlist.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!wl) return { ok: true };
    await prisma.wishlistProduct.deleteMany({
      where: { wishlistId: wl.id, productId },
    });
    return { ok: true };
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
  const row = await prisma.wishlistProduct.findFirst({
    where: { productId, wishlist: { userId: user.id } },
    select: { id: true },
  });
  return Boolean(row);
}
