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
 *
 * Tenant scope (sub-slice 3b-2 cron seam): each delete runs inside a
 * per-tenant tx, so RLS WITH CHECK enforces that one tenant's purge
 * cannot reach across into another's rows. The summary is aggregated
 * across all tenants.
 */
import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/api/cron-auth";
import { forEachActiveTenant } from "@/lib/cron/for-each-tenant";

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
  const cartCutoff = new Date(now - CART_SNAPSHOT_RETENTION_DAYS * 86_400_000);
  const stockCutoff = new Date(now - STOCK_NOTIFY_RETENTION_DAYS * 86_400_000);
  const consentCutoff = new Date(now - CONSENT_RETENTION_DAYS * 86_400_000);

  let cartSnapshotsDeleted = 0;
  let stockNotificationsDeleted = 0;
  let consentEventsDeleted = 0;

  const summary = await forEachActiveTenant("data-retention", async (tx) => {
    const [cartSnapshots, stockNotifications, consentEvents] = await Promise.all([
      tx.cartSnapshot.deleteMany({ where: { createdAt: { lt: cartCutoff } } }),
      tx.stockNotificationRequest.deleteMany({
        where: { createdAt: { lt: stockCutoff } },
      }),
      tx.consentEvent.deleteMany({ where: { createdAt: { lt: consentCutoff } } }),
    ]);
    cartSnapshotsDeleted += cartSnapshots.count;
    stockNotificationsDeleted += stockNotifications.count;
    consentEventsDeleted += consentEvents.count;
  });

  return NextResponse.json({
    ok: summary.failed === 0,
    tenants: summary,
    cartSnapshotsDeleted,
    stockNotificationsDeleted,
    consentEventsDeleted,
  });
}
