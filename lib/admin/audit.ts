import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { tenantScope } from "@/lib/tenant/db";
import { currentTenant } from "@/lib/tenant";

/**
 * Append-only admin-action logger.
 *
 * Call sites:
 *   - Product / category / bundle / homepage saves (action="product.update")
 *   - Image upload / replacement (action="product.image-update")
 *   - GDPR export / anonymise (action="customer.export" / "customer.anonymize")
 *   - Order refunds + manual status flips (action="order.refund", "order.status")
 *   - Review moderation (action="review.approve" / "review.reject")
 *
 * The pattern is `await audit({ actorId, action, entityType, entityId, diff })`
 * placed after the successful write — best-effort, soft-fail. We never let
 * a logging failure roll back the originating action.
 *
 * `diff` is intentionally untyped JSON. Readers shouldn't depend on its
 * shape across action kinds. Common conventions:
 *   - { before, after } for updates
 *   - { sentTo, amount } for refunds
 *   - { count } for bulk operations
 */

export type AuditEntry = {
  actorId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  diff?: unknown;
};

async function detectIp(): Promise<string | null> {
  try {
    const h = await headers();
    const xff = h.get("x-forwarded-for");
    if (xff) return xff.split(",")[0]!.trim().slice(0, 64);
    return h.get("x-real-ip")?.slice(0, 64) ?? null;
  } catch {
    return null;
  }
}

export async function audit(entry: AuditEntry): Promise<void> {
  try {
    const ip = await detectIp();
    // Audit always runs from a tenant-scoped admin request (Host
    // present); scope + stamp the write so the entry is RLS-isolated
    // to the acting tenant.
    const { id: tenantId } = await currentTenant();
    await tenantScope(tenantId, (tx) =>
      tx.adminAuditEntry.create({
        data: {
          actorId: entry.actorId ?? null,
          action: entry.action,
          entityType: entry.entityType ?? null,
          entityId: entry.entityId ?? null,
          diff:
            entry.diff === undefined || entry.diff === null
              ? Prisma.DbNull
              : (entry.diff as Prisma.InputJsonValue),
          ip,
          tenantId,
        },
      })
    );
  } catch (err) {
    console.error("[audit] write failed:", err);
  }
}
