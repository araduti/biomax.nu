"use server";

import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { tenantScope } from "@/lib/tenant/db";
import { currentTenant } from "@/lib/tenant";
import { emailSchema, cuidSchema } from "@/lib/validation/shared";
import {
  enforceRateLimit,
  clientIp,
  CART_SNAPSHOT_RULE,
} from "@/lib/security/rate-limit";

/**
 * What we PERSIST. Authoritative — built server-side from the DB. Never
 * trust client values for the public-facing fields (name/image/price)
 * because this is an unauthenticated server action callable from anywhere.
 */
export type SnapshotItem = {
  productId: string;
  productSlug: string;
  productName: string;
  productImageUrl: string;
  quantity: number;
  unitPrice: number;
};

const MAX_LINES = 50;
const MAX_QUANTITY_PER_LINE = 99;

/**
 * Trust boundary — anyone on the internet can POST to this action.
 * Schema rejects bad shapes silently (we return early) rather than
 * surfacing detailed parse errors that would help abuse.
 */
const SnapshotInputSchema = z.object({
  email: emailSchema,
  userId: cuidSchema.nullable().optional(),
  items: z
    .array(
      z.object({
        productId: cuidSchema,
        variantId: cuidSchema.nullable().optional(),
        quantity: z.coerce.number().int().min(1).max(MAX_QUANTITY_PER_LINE),
      })
    )
    .max(MAX_LINES),
});

export type SnapshotLineInput = z.infer<
  typeof SnapshotInputSchema
>["items"][number];

/**
 * Persist (or refresh) a cart snapshot for the abandoned-cart flow.
 *
 * SECURITY: this is an unauthenticated `"use server"` action — anyone on
 * the internet can POST to it. We therefore:
 *   - accept only productId + quantity from the caller
 *   - re-fetch authoritative product data from the DB
 *   - recompute subtotal from authoritative prices
 *   - cap item count / per-line quantity to bound abuse
 *   - require the email/productIds to actually resolve (silent no-op
 *     otherwise — we never tell the caller "this email is in our DB")
 *
 * Behaviour:
 *   - Replaces an existing open snapshot for the same email (one open
 *     snapshot per address).
 *   - Empty/zero-resolved cart deletes any open snapshot — no point
 *     emailing someone about an empty cart.
 *   - When an order is later created, `markCartRecovered(email)` flips
 *     the recoveredAt flag so the cron stops emailing.
 */
export async function upsertCartSnapshot(raw: unknown): Promise<void> {
  // Rate-limit per IP. Silent no-op on deny — same posture as the parse
  // failure below.
  const ip = await clientIp();
  const limit = await enforceRateLimit(CART_SNAPSHOT_RULE, ip);
  if (!limit.allowed) return;

  // Parse — silent no-op on bad input. We never tell callers why their
  // payload was rejected; that's how this stays a low-value target.
  const parsed = SnapshotInputSchema.safeParse(raw);
  if (!parsed.success) return;
  const input = parsed.data;
  const email = input.email;
  const rawLines = input.items;

  const { id: tenantId } = await currentTenant();
  await tenantScope(tenantId, async (tx) => {
    if (rawLines.length === 0) {
      await tx.cartSnapshot
        .deleteMany({ where: { email, recoveredAt: null } })
        .catch(() => {});
      return;
    }

    // Re-fetch products to recompute name/image/price authoritatively.
    // Anything that doesn't resolve (deleted, draft) is silently dropped.
    const productIds = [...new Set(rawLines.map((l) => l.productId))];
    const products = await tx.product.findMany({
      where: { id: { in: productIds }, status: "PUBLISHED" },
      select: {
        id: true,
        slug: true,
        name: true,
        imageUrl: true,
        price: true,
      },
    });

    const resolved: SnapshotItem[] = [];
    for (const line of rawLines) {
      const p = products.find((x) => x.id === line.productId);
      if (!p) continue;
      resolved.push({
        productId: p.id,
        productSlug: p.slug,
        productName: p.name,
        productImageUrl: p.imageUrl,
        quantity: line.quantity,
        unitPrice: parseFloat(p.price.toString()),
      });
    }

    if (resolved.length === 0) {
      await tx.cartSnapshot
        .deleteMany({ where: { email, recoveredAt: null } })
        .catch(() => {});
      return;
    }

    const subtotalSek = resolved.reduce(
      (s, it) => s + it.unitPrice * it.quantity,
      0
    );

    try {
      // Use updateMany-then-create to avoid the findFirst+update race.
      const updated = await tx.cartSnapshot.updateMany({
        where: { email, recoveredAt: null },
        data: {
          items: resolved as unknown as object,
          subtotalSek,
          userId: input.userId ?? null,
          firstEmailSentAt: null,
          secondEmailSentAt: null,
        },
      });
      if (updated.count > 0) return;

      await tx.cartSnapshot.create({
        data: {
          email,
          userId: input.userId ?? null,
          items: resolved as unknown as object,
          subtotalSek,
          tenantId,
          recoveryToken: crypto.randomBytes(24).toString("base64url"),
        },
      });
    } catch (err) {
      // Cart capture is best-effort. Don't surface errors to the user.
      console.error("[cart-snapshot] upsert failed:", err);
    }
  });
}

/**
 * Mark all open snapshots for an email as recovered. Called from the
 * order-placement server action so cron stops chasing a customer who
 * already completed checkout.
 */
export async function markCartRecovered(email: string): Promise<void> {
  const e = email.trim().toLowerCase();
  if (!e) return;
  await prisma.cartSnapshot
    .updateMany({
      where: { email: e, recoveredAt: null },
      data: { recoveredAt: new Date() },
    })
    .catch(() => {});
}
