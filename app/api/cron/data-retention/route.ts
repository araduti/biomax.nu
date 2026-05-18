/**
 * Data-retention purge (ADR 0024). Ages out personal-data tables that
 * otherwise grow unbounded, satisfying GDPR Art. 5(1)(e) (storage
 * limitation). Companion to telemetry-cleanup (ADR 0013), kept separate
 * so the windows + their legal rationale aren't buried next to
 * telemetry tuning.
 *
 *   - CartSnapshot: 30 days. Enforces the policy the schema already
 *     documents; the abandoned-cart flow is finished after 72 h.
 *   - StockNotificationRequest: 180 days. A back-in-stock interest is
 *     stale long before this; no bookkeeping basis to retain.
 *   - ConsentEvent: CONSENT_RETENTION_DAYS. Proof of consent is only
 *     useful while the consent (or its withdrawal) is legally relevant.
 *
 * Deliberately NOT here: Order/order-linked PII (Bokföringslagen 7-yr
 * legal retention) and inactive-account anonymisation (destructive,
 * needs business/legal sign-off — see ADR 0024).
 *
 * All target date columns are indexed → index-range deletes.
 *
 * Schedule (vercel.json): weekly. Auth: Bearer CRON_SECRET
 * (localhost-allowed in dev) — same contract as every /api/cron/* route.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cronAuthorized } from "@/lib/api/cron-auth";

export const runtime = "nodejs";

const CART_SNAPSHOT_RETENTION_DAYS = 30;
const STOCK_NOTIFY_RETENTION_DAYS = 180;
/** Exported so ADR 0023's policy + this window stay co-located in docs. */
export const CONSENT_RETENTION_DAYS = 730; // ~24 months

export async function GET(req: Request) {
  if (!cronAuthorized(req)) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  const now = Date.now();
  const cartCutoff = new Date(
    now - CART_SNAPSHOT_RETENTION_DAYS * 86_400_000
  );
  const stockCutoff = new Date(
    now - STOCK_NOTIFY_RETENTION_DAYS * 86_400_000
  );
  const consentCutoff = new Date(
    now - CONSENT_RETENTION_DAYS * 86_400_000
  );

  try {
    const [cartSnapshots, stockNotifications, consentEvents] =
      await Promise.all([
        prisma.cartSnapshot.deleteMany({
          where: { createdAt: { lt: cartCutoff } },
        }),
        prisma.stockNotificationRequest.deleteMany({
          where: { createdAt: { lt: stockCutoff } },
        }),
        prisma.consentEvent.deleteMany({
          where: { createdAt: { lt: consentCutoff } },
        }),
      ]);

    return NextResponse.json({
      ok: true,
      cartSnapshotsDeleted: cartSnapshots.count,
      stockNotificationsDeleted: stockNotifications.count,
      consentEventsDeleted: consentEvents.count,
    });
  } catch (err) {
    console.error("[data-retention] failed:", err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
