import { prisma } from "@/lib/prisma";

/**
 * Single GDPR implementation shared by the admin actions
 * (`lib/admin/gdpr-actions.ts`) and customer self-service
 * (`lib/account/gdpr-self-service.ts`) — ADR 0025.
 *
 * These functions do NOT authorize and do NOT write the audit log. The
 * caller owns both: admin path gates on `requireAdmin()` + audits with
 * the admin's id; self-service path derives the user from the session +
 * audits with the user's own id. Keeping authz/audit at the call site
 * means there is exactly one copy of the hard part (export aggregation,
 * Bokföringslagen-safe anonymisation) and it cannot drift.
 */

export type UserExport = { filename: string; payload: string };

/**
 * Article 15 + 20 — assemble every row tied to a user into a single
 * machine-readable JSON document. Returns null if the user is gone.
 */
export async function buildUserExport(
  userId: string
): Promise<UserExport | null> {
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
  if (!user) return null;

  // Rows without a userId FK are keyed on email.
  const [newsletter, stockNotifications, cartSnapshots, consentEvents] =
    await Promise.all([
      prisma.newsletterSubscriber.findUnique({
        where: { email: user.email },
      }),
      prisma.stockNotificationRequest.findMany({
        where: { email: user.email },
      }),
      prisma.cartSnapshot.findMany({ where: { email: user.email } }),
      prisma.consentEvent.findMany({ where: { userId: user.id } }),
    ]);

  const payload = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      gdprArticle: "15",
      user,
      newsletter,
      stockNotifications,
      cartSnapshots,
      consentEvents,
    },
    null,
    2
  );

  const safeEmail = user.email.replace(/[^a-z0-9.@-]/gi, "_");
  return {
    filename: `biomax-gdpr-export-${safeEmail}-${new Date()
      .toISOString()
      .slice(0, 10)}.json`,
    payload,
  };
}

export type AnonymizeResult =
  | { ok: true; previousEmail: string }
  | { ok: false; error: string };

/**
 * Article 17 — anonymise in place. Order rows are RETAINED (we have a
 * legal obligation to keep financial records under Bokföringslagen 7
 * kap for 7 years) but stripped of identifying detail. Irreversible.
 */
export async function anonymizeUser(
  userId: string
): Promise<AnonymizeResult> {
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
      prisma.address.deleteMany({ where: { userId: user.id } }),
      prisma.review.updateMany({
        where: { userId: user.id },
        data: { authorName: "Anonym kund", body: "", title: null },
      }),
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
      prisma.newsletterSubscriber.updateMany({
        where: { email: user.email },
        data: { email: anonEmail, unsubscribedAt: now },
      }),
      prisma.stockNotificationRequest.deleteMany({
        where: { email: user.email },
      }),
      prisma.cartSnapshot.deleteMany({ where: { email: user.email } }),
      prisma.order.updateMany({
        where: { userId: user.id },
        data: { email: anonEmail },
      }),
      prisma.session.deleteMany({ where: { userId: user.id } }),
      prisma.account.deleteMany({ where: { userId: user.id } }),
    ]);
    return { ok: true, previousEmail: user.email };
  } catch (err) {
    console.error("anonymizeUser failed:", err);
    return { ok: false, error: "Kunde inte anonymisera kunden." };
  }
}
