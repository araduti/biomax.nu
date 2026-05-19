import { prisma } from "@/lib/prisma";
import { hostTenantScope } from "@/lib/tenant/db";

/**
 * Recent admin activity for the dashboard's "Senaste aktivitet"-strip.
 *
 * Reads the AdminAuditEntry table (append-only since the post-audit
 * migration) and renders the last N entries with human-readable labels
 * + a link to the affected entity when one exists.
 *
 * We deliberately don't expose the `diff` JSON in the feed view — it's
 * structurally heterogeneous (different shapes per action kind) and
 * surfaces too much detail for a glanceable strip. Admins who need
 * forensic detail can hit the future /admin/system/loggar surface.
 */

export type ActivityRow = {
  id: string;
  createdAt: Date;
  action: string;
  /** "product.update" → "Uppdaterade produkt". Swedish, sentence-case. */
  actionLabel: string;
  /** Entity name surfaced inline ("Easy Way") when we can derive it. */
  entityLabel: string | null;
  /** Optional admin link for the affected entity. */
  entityHref: string | null;
  /** Display name of the admin who took the action. */
  actorName: string;
};

const ACTION_LABELS: Record<string, string> = {
  // Product
  "product.update": "Uppdaterade produkt",
  "product.image-update": "Uppdaterade produktbild",
  // Customer / GDPR
  "customer.export": "GDPR-export av kund",
  "customer.anonymize": "Anonymiserade kund",
  // Orders
  "order.book-shipment": "Bokade frakt för order",
  "order.fulfill": "Markerade order som skickad",
  // Returns
  "return.approved": "Godkände retur",
  "return.received": "Markerade retur som mottagen",
  "return.rejected": "Avvisade retur",
  "return.refunded": "Bokförde återbetalning",
  // Inventory
  "inventory.product-stock-update": "Uppdaterade lagersaldo",
  "inventory.variant-stock-update": "Uppdaterade variantens lager",
  // Reports
  "moms.export": "Exporterade momsrapport",
};

function labelForAction(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

/**
 * Resolve the linkable entity for an audit row. We do best-effort
 * lookups in parallel rather than per-row to keep the dashboard query
 * fast — Map of (entityType, entityId) → { label, href }.
 */
async function resolveEntities(
  rows: Array<{ entityType: string | null; entityId: string | null }>
): Promise<Map<string, { label: string; href: string }>> {
  const productIds = new Set<string>();
  const userIds = new Set<string>();
  const orderIds = new Set<string>();
  const returnIds = new Set<string>();
  const variantIds = new Set<string>();

  for (const r of rows) {
    if (!r.entityId) continue;
    if (r.entityType === "Product") productIds.add(r.entityId);
    else if (r.entityType === "User") userIds.add(r.entityId);
    else if (r.entityType === "Order") orderIds.add(r.entityId);
    else if (r.entityType === "Return") returnIds.add(r.entityId);
    else if (r.entityType === "ProductVariant") variantIds.add(r.entityId);
  }

  // Tenant-owned entities (product/order/return/productVariant) run
  // inside a single RLS-scoped tx. User is non-owned (auth/identity)
  // and stays on `prisma`.
  const [users, { products, orders, returns, variants }] = await Promise.all([
    userIds.size > 0
      ? prisma.user.findMany({
          where: { id: { in: [...userIds] } },
          select: { id: true, email: true, name: true },
        })
      : Promise.resolve([] as Array<{ id: string; email: string; name: string | null }>),
    hostTenantScope(async (tx) => {
      const [products, orders, returns, variants] = await Promise.all([
        productIds.size > 0
          ? tx.product.findMany({
              where: { id: { in: [...productIds] } },
              select: { id: true, slug: true, name: true },
            })
          : [],
        orderIds.size > 0
          ? tx.order.findMany({
              where: { id: { in: [...orderIds] } },
              select: { id: true, orderNumber: true },
            })
          : [],
        returnIds.size > 0
          ? tx.return.findMany({
              where: { id: { in: [...returnIds] } },
              select: { id: true, returnNumber: true },
            })
          : [],
        variantIds.size > 0
          ? tx.productVariant.findMany({
              where: { id: { in: [...variantIds] } },
              select: {
                id: true,
                label: true,
                product: { select: { slug: true, name: true } },
              },
            })
          : [],
      ]);
      return { products, orders, returns, variants };
    }),
  ]);

  const out = new Map<string, { label: string; href: string }>();
  for (const p of products)
    out.set(`Product:${p.id}`, {
      label: p.name,
      href: `/admin/produkter/${p.slug}`,
    });
  for (const u of users)
    out.set(`User:${u.id}`, {
      label: u.name || u.email,
      href: `/admin/kunder/${u.id}`,
    });
  for (const o of orders)
    out.set(`Order:${o.id}`, {
      label: o.orderNumber,
      href: `/admin/ordrar/${o.orderNumber}`,
    });
  for (const r of returns)
    out.set(`Return:${r.id}`, {
      label: r.returnNumber,
      href: `/admin/returer`,
    });
  for (const v of variants)
    out.set(`ProductVariant:${v.id}`, {
      label: `${v.product.name} — ${v.label}`,
      href: `/admin/produkter/${v.product.slug}`,
    });
  return out;
}

export async function getRecentActivity(limit = 8): Promise<ActivityRow[]> {
  const rows = await hostTenantScope((tx) =>
    tx.adminAuditEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        createdAt: true,
        action: true,
        entityType: true,
        entityId: true,
        actorId: true,
      },
    })
  );
  if (rows.length === 0) return [];

  const actorIds = [
    ...new Set(rows.map((r) => r.actorId).filter((x): x is string => !!x)),
  ];
  // User is non-owned — stays on `prisma`. `resolveEntities` handles the
  // tenant-owned lookups inside its own scoped tx.
  const [actors, entities] = await Promise.all([
    actorIds.length > 0
      ? prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: {
            id: true,
            firstName: true,
            name: true,
            email: true,
          },
        })
      : [],
    resolveEntities(rows),
  ]);
  const actorById = new Map(actors.map((a) => [a.id, a]));

  return rows.map((r) => {
    const actor = r.actorId ? actorById.get(r.actorId) : null;
    const actorName = actor
      ? actor.firstName || actor.name || actor.email.split("@")[0]!
      : "System";
    const entity =
      r.entityType && r.entityId
        ? entities.get(`${r.entityType}:${r.entityId}`)
        : null;
    return {
      id: r.id,
      createdAt: r.createdAt,
      action: r.action,
      actionLabel: labelForAction(r.action),
      entityLabel: entity?.label ?? null,
      entityHref: entity?.href ?? null,
      actorName,
    };
  });
}
