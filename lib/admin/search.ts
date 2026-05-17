"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./guard";

/**
 * Global admin search — backs the Cmd-K dialog in the admin topbar.
 *
 * Returns up to 5 results per entity type, ranked by:
 *   - exact match > prefix match > contains match (Prisma can't sort by
 *     these in a single query, so we over-fetch with `contains` and let
 *     the client display in the natural list order)
 *
 * Search surfaces:
 *   - Products  (name, slug, sku)
 *   - Orders    (orderNumber, email)
 *   - Customers (email, name, firstName, lastName)
 *   - Settings  (static list of routes; matched in client for now)
 *
 * For small catalogues (~hundreds of products) `mode: "insensitive"` +
 * `contains` is plenty. If we ever exceed ~10k rows per table we'll
 * switch to a Postgres tsvector index — not now.
 */

export type AdminSearchResult = {
  kind: "product" | "order" | "customer";
  href: string;
  title: string;
  sublabel: string;
  /** Optional thumbnail URL — products use imageUrl, customers fall
   *  through to a generated initial avatar in the Cmd-K render. */
  thumbUrl?: string | null;
};

export type AdminSearchResponse = {
  results: AdminSearchResult[];
};

export async function adminSearch(rawQuery: string): Promise<AdminSearchResponse> {
  await requireAdmin();

  const q = rawQuery.trim();
  // Empty query — caller should render a hint state, but be defensive.
  if (!q || q.length < 2) return { results: [] };

  // Order matters: products are the most-edited surface, then orders
  // (admin's daily packlista), then customers. The dialog renders in
  // this order, capped at 5 per group so the list stays scannable.
  const [products, orders, customers] = await Promise.all([
    prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
          { sku: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { slug: true, name: true, sku: true, status: true, imageUrl: true },
    }),
    prisma.order.findMany({
      where: {
        OR: [
          { orderNumber: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        orderNumber: true,
        email: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.user.findMany({
      where: {
        role: "customer",
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
      },
    }),
  ]);

  const results: AdminSearchResult[] = [];

  for (const p of products) {
    results.push({
      kind: "product",
      href: `/admin/produkter/${p.slug}`,
      title: p.name,
      sublabel: `${p.sku ?? p.slug} · ${p.status.toLowerCase()}`,
      thumbUrl: p.imageUrl,
    });
  }

  for (const o of orders) {
    results.push({
      kind: "order",
      href: `/admin/ordrar/${o.orderNumber}`,
      title: o.orderNumber,
      sublabel: `${o.email} · ${o.status.toLowerCase()}`,
    });
  }

  for (const c of customers) {
    const display =
      c.name ||
      [c.firstName, c.lastName].filter(Boolean).join(" ") ||
      c.email;
    results.push({
      kind: "customer",
      href: `/admin/kunder/${c.id}`,
      title: display,
      sublabel: c.email,
    });
  }

  return { results };
}
