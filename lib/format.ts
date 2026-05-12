/**
 * Swedish locale formatting helpers (sv-SE).
 */

export function formatPriceSEK(amount: number | string | { toString(): string }): string {
  const n = typeof amount === "number" ? amount : parseFloat(amount.toString());
  if (!Number.isFinite(n)) return "—";
  return `${new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(Math.round(n))} kr`;
}

export function formatPriceFractional(amount: number | string | { toString(): string }): string {
  const n = typeof amount === "number" ? amount : parseFloat(amount.toString());
  if (!Number.isFinite(n)) return "—";
  return `${new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)} kr`;
}
