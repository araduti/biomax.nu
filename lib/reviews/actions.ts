"use server";

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { tenantScope } from "@/lib/tenant/db";
import { currentTenant } from "@/lib/tenant";
import { currentUser } from "@/lib/session";
import { BEHOV_LABELS } from "@/lib/symptoms/behov-labels";
import { fail } from "@/lib/validation/shared";
import {
  enforceRateLimit,
  enforceTenantRateLimit,
  clientIp,
  REVIEW_SUBMISSION_RULE,
} from "@/lib/security/rate-limit";

const MIN_BODY = 10;
const MAX_BODY = 2000;
const MAX_TITLE = 120;
const MAX_AUTHOR_NAME = 60;

const ALLOWED_GOAL_SLUGS = BEHOV_LABELS.map((b) => b.slug) as [string, ...string[]];

const SubmitReviewSchema = z.object({
  productSlug: z.string().trim().min(1).max(120),
  rating: z.coerce.number().int().min(1, "Betyget måste vara 1–5 stjärnor.").max(5),
  title: z.string().trim().max(MAX_TITLE).optional(),
  body: z
    .string()
    .trim()
    .min(MIN_BODY, `Recensionen måste innehålla minst ${MIN_BODY} tecken.`)
    .max(MAX_BODY, `Recensionen får vara högst ${MAX_BODY} tecken.`),
  authorName: z.string().trim().max(MAX_AUTHOR_NAME).optional(),
  reviewerGoal: z.enum(ALLOWED_GOAL_SLUGS).nullable().optional(),
});

export type SubmitReviewResult =
  | { ok: true; status: "PENDING" }
  | { ok: false; error: string };

/**
 * Customer-submitted review. Lands as PENDING; an admin moves it to
 * APPROVED via the moderation queue before it renders publicly.
 *
 * Verification: the `verified` flag is computed server-side from order
 * history — we never trust client input for this. A row is marked verified
 * if the submitter's userId has at least one OrderItem with this productId.
 */
export async function submitReview(raw: unknown): Promise<SubmitReviewResult> {
  const parsed = SubmitReviewSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error);
  const input = parsed.data;

  const user = await currentUser();
  if (!user) {
    return { ok: false, error: "Du måste vara inloggad för att lämna en recension." };
  }

  // Rate-limit per IP to slow brute-force / multi-account abuse.
  const ip = await clientIp();
  const rl = await enforceRateLimit(REVIEW_SUBMISSION_RULE, ip);
  if (!rl.allowed) {
    return {
      ok: false,
      error: `För många recensioner just nu — försök igen om ${Math.ceil(rl.retryAfterSeconds / 60)} minuter.`,
    };
  }

  const body = input.body;
  const title = input.title?.trim() || null;
  const authorName = input.authorName?.trim() || null;
  const reviewerGoal = input.reviewerGoal ?? null;

  const { id: tenantId } = await currentTenant();
  // ADR 0033 A1: per-tenant bucket on top of the global IP cap.
  const tenantRl = await enforceTenantRateLimit(
    REVIEW_SUBMISSION_RULE,
    tenantId,
    ip
  );
  if (!tenantRl.allowed) {
    return {
      ok: false,
      error: `För många recensioner just nu — försök igen om ${Math.ceil(tenantRl.retryAfterSeconds / 60)} minuter.`,
    };
  }
  let created: boolean;
  try {
    created = await tenantScope(tenantId, async (tx) => {
      const product = await tx.product.findUnique({
        where: { slug: input.productSlug },
        select: { id: true },
      });
      if (!product) return false;

      // Rate-limit: one PENDING or APPROVED review per user per product.
      // Prevents accidental double-submit and obvious spam. Editors can
      // still request a re-write via support if the first review needs
      // correction.
      const existing = await tx.review.findFirst({
        where: {
          productId: product.id,
          userId: user.id,
          status: { in: ["PENDING", "APPROVED"] },
        },
        select: { id: true },
      });
      if (existing) {
        throw new DuplicateReviewError();
      }

      const verified = await isVerifiedPurchase(tx, user.id, product.id);

      await tx.review.create({
        data: {
          productId: product.id,
          userId: user.id,
          tenantId,
          rating: input.rating,
          title,
          body,
          authorName,
          verified,
          reviewerGoal,
          status: "PENDING",
        },
      });
      return true;
    });
  } catch (err) {
    if (err instanceof DuplicateReviewError) {
      return {
        ok: false,
        error: "Du har redan lämnat en recension för denna produkt.",
      };
    }
    console.error("submitReview failed:", err);
    return { ok: false, error: "Kunde inte spara recensionen." };
  }

  if (!created) return { ok: false, error: "Produkten hittades inte." };

  revalidatePath(`/produkter/${input.productSlug}`);
  revalidatePath("/admin/recensioner");
  return { ok: true, status: "PENDING" };
}

class DuplicateReviewError extends Error {}

async function isVerifiedPurchase(
  tx: Prisma.TransactionClient,
  userId: string,
  productId: string
): Promise<boolean> {
  const hit = await tx.orderItem.findFirst({
    where: {
      productId,
      order: {
        userId,
        status: { in: ["PAID", "FULFILLED"] },
      },
    },
    select: { id: true },
  });
  return Boolean(hit);
}

// ── Admin moderation ─────────────────────────────────────────────

import { requireTenantRole } from "@/lib/admin/guard";

export type ModerateResult = { ok: true } | { ok: false; error: string };

export async function approveReview(id: string): Promise<ModerateResult> {
  const { tenantId } = await requireTenantRole("admin");
  const row = await tenantScope(tenantId, (tx) =>
    tx.review.update({
      where: { id },
      data: { status: "APPROVED" },
      select: { product: { select: { slug: true } } },
    })
  );
  revalidatePath("/admin/recensioner");
  revalidatePath(`/produkter/${row.product.slug}`);
  return { ok: true };
}

export async function rejectReview(id: string): Promise<ModerateResult> {
  const { tenantId } = await requireTenantRole("admin");
  const row = await tenantScope(tenantId, (tx) =>
    tx.review.update({
      where: { id },
      data: { status: "REJECTED" },
      select: { product: { select: { slug: true } } },
    })
  );
  revalidatePath("/admin/recensioner");
  revalidatePath(`/produkter/${row.product.slug}`);
  return { ok: true };
}

export async function deleteReview(id: string): Promise<ModerateResult> {
  const { tenantId } = await requireTenantRole("admin");
  const slug = await tenantScope(tenantId, async (tx) => {
    const row = await tx.review.findUnique({
      where: { id },
      select: { product: { select: { slug: true } } },
    });
    if (!row) return null;
    await tx.review.delete({ where: { id } });
    return row.product.slug;
  });
  if (!slug) return { ok: false, error: "Recensionen hittades inte." };
  revalidatePath("/admin/recensioner");
  revalidatePath(`/produkter/${slug}`);
  return { ok: true };
}

export async function setStoreResponse(
  id: string,
  response: string
): Promise<ModerateResult> {
  const { tenantId } = await requireTenantRole("admin");
  const trimmed = response.trim();
  const row = await tenantScope(tenantId, (tx) =>
    tx.review.update({
      where: { id },
      data: {
        storeResponse: trimmed || null,
        storeRespondedAt: trimmed ? new Date() : null,
      },
      select: { product: { select: { slug: true } } },
    })
  );
  revalidatePath("/admin/recensioner");
  revalidatePath(`/produkter/${row.product.slug}`);
  return { ok: true };
}
