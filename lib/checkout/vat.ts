/**
 * VAT-rate constants — safe to import from client components.
 *
 * Split out of `lib/klarna/cart-to-order.ts` because that file also
 * houses `shippingForSubtotal()`, which dynamic-imports
 * `@/lib/site/settings`, which transitively pulls in Prisma + `pg`.
 * Turbopack traces dynamic imports as bundle deps even when the
 * consumer only needs the const — landing `pg` (and Node's `dns`)
 * in client bundles. This file has zero runtime dependencies.
 *
 * Source of truth for the value lives here; `cart-to-order.ts`
 * re-exports for back-compat with existing call sites.
 */

/**
 * Swedish VAT for kosttillskott — 6 % (was 12 % before 2026).
 * Stored in basis points so the gross→net math stays integer-friendly.
 * Each Order persists `taxRateBp` so historical accuracy survives
 * future rate changes — never read this constant when displaying a
 * past order; read the column.
 */
export const CURRENT_VAT_BP = 600;
