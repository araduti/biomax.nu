"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./guard";
import { audit } from "./audit";
import { cuidSchema, fail } from "@/lib/validation/shared";

/**
 * GDPR Article 15 + 17 implementations.
 *
 *  Article 15 — Right of access. `exportCustomerData()` returns a JSON
 *  blob with every row tied to the customer: User, addresses, orders +
 *  line items, reviews, subscriptions, wishlist, newsletter consent,
 *  stock-notify requests, cart snapshots. The admin UI offers this as a
 *  downloadable .json file.
 *
 *  Article 17 — Right to erasure. `anonymizeCustomer()` nullifies all
 *  PII while keeping the *order rows themselves* (we have a legal
 *  obligation to retain financial records under Bokföringslagen 7 kap
 *  for 7 years). The User row gets a sentinel email + cleared name; all
 *  Address rows are deleted; reviews are detached from the user; the
 *  newsletter row is unsubscribed + email scrambled.
 *
 *  Both actions log via AdminAuditEntry (see #8 in the TODO).
 */

const CustomerIdSchema = z.object({ userId: cuidSchema });

export type GdprExportResult =
  | { ok: true; filename: string; payload: string }
  | { ok: false; error: string };

export async function exportCustomerData(
  raw: unknown
): Promise<GdprExportResult> {
  const admin = await requireAdmin();
  const parsed = CustomerIdSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error);
  const { userId } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      addresses: true,
      orders: {
        include: {
          items: true,
          shippingAddress: true,
          billingAddress: true,
        },
      },
      reviews: true,
      subscriptions: { include: { lines: true } },
      wishlist: { include: { items: true } },
    },
  });
  if (!user) return { ok: false, error: "Kunden hittades inte." };

  // Cross-table reads keyed on email for rows that don't have a userId FK.
  const [newsletter, stockNotifications, cartSnapshots] = await Promise.all([
    prisma.newsletterSubscriber.findUnique({ where: { email: user.email } }),
    prisma.stockNotificationRequest.findMany({ where: { email: user.email } }),
    prisma.cartSnapshot.findMany({ where: { email: user.email } }),
  ]);

  const payload = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      gdprArticle: "15",
      user,
      newsletter,
      stockNotifications,
      cartSnapshots,
    },
    null,
    2
  );

  const safeEmail = user.email.replace(/[^a-z0-9.@-]/gi, "_");
  await audit({
    actorId: admin.id,
    action: "customer.export",
    entityType: "User",
    entityId: user.id,
    diff: { email: user.email },
  });
  return {
    ok: true,
    filename: `biomax-gdpr-export-${safeEmail}-${new Date()
      .toISOString()
      .slice(0, 10)}.json`,
    payload,
  };
}

export type GdprAnonymizeResult = { ok: true } | { ok: false; error: string };

/**
 * Anonymise a customer. Order rows are retained (Bokföringslagen) but
 * stripped of identifying detail. Addresses and reviews are scrubbed.
 *
 * This is irreversible. The admin UI gates it behind a confirm step.
 */
export async function anonymizeCustomer(
  raw: unknown
): Promise<GdprAnonymizeResult> {
  const admin = await requireAdmin();
  const parsed = CustomerIdSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error);
  const { userId } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });
  if (!user) return { ok: false, error: "Kunden hittades inte." };

  // Sentinel email keeps the FK valid while leaking nothing identifiable.
  const anonEmail = `anonymized-${user.id}@anonymized.biomax.nu`;
  const now = new Date();

  try {
    await prisma.$transaction([
      // 1) Strip PII from the User row but keep the row so orders FK
      //    stays valid + bookkeeping records intact.
      prisma.user.update({
        where: { id: user.id },
        data: {
          email: anonEmail,
          name: null,
          firstName: null,
          lastName: null,
          phone: null,
          image: null,
          // Disable login — Better Auth checks emailVerified; flipping
          // to false plus the sentinel email makes the account unreachable.
          emailVerified: false,
        },
      }),
      // 2) Detach all addresses. Order.shippingAddressId is SetNull so
      //    the FK becomes orphan after delete — that's intended.
      prisma.address.deleteMany({ where: { userId: user.id } }),
      // 3) Strip personal text from reviews but keep the rating (
      //    aggregate stays correct for the product).
      prisma.review.updateMany({
        where: { userId: user.id },
        data: {
          authorName: "Anonym kund",
          body: "",
          title: null,
        },
      }),
      // 4) Anonymise email + cancel any active subscription so the
      //    renewal cron stops generating orders against a dead account.
      prisma.subscription.updateMany({
        where: { userId: user.id, status: { in: ["ACTIVE", "PAUSED"] } },
        data: {
          status: "CANCELLED",
          cancelledAt: now,
          cancellationReason: "GDPR-anonymisering",
          email: anonEmail,
        },
      }),
      prisma.subscription.updateMany({
        where: { userId: user.id, status: "CANCELLED" },
        data: { email: anonEmail },
      }),
      // 5) Newsletter row — unsubscribe + scramble email.
      prisma.newsletterSubscriber.updateMany({
        where: { email: user.email },
        data: {
          email: anonEmail,
          unsubscribedAt: now,
        },
      }),
      // 6) Stock-notify rows — delete entirely. No bookkeeping reason
      //    to retain.
      prisma.stockNotificationRequest.deleteMany({
        where: { email: user.email },
      }),
      // 7) Cart-snapshot rows — delete entirely.
      prisma.cartSnapshot.deleteMany({ where: { email: user.email } }),
      // 8) Order rows — replace email with sentinel. Keep totals / items
      //    intact for bookkeeping.
      prisma.order.updateMany({
        where: { userId: user.id },
        data: { email: anonEmail },
      }),
      // 9) Sessions + Account rows kill any active login.
      prisma.session.deleteMany({ where: { userId: user.id } }),
      prisma.account.deleteMany({ where: { userId: user.id } }),
    ]);
    await audit({
      actorId: admin.id,
      action: "customer.anonymize",
      entityType: "User",
      entityId: user.id,
      diff: { previousEmail: user.email },
    });
    return { ok: true };
  } catch (err) {
    console.error("anonymizeCustomer failed:", err);
    return { ok: false, error: "Kunde inte anonymisera kunden." };
  }
}
