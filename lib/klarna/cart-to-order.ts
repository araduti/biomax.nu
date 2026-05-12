import type {
  KlarnaCreateOrderPayload,
  KlarnaOrderLine,
} from "./types";

/** Anything Prisma's Decimal can decay to — Prisma 7 ships its own type. */
type DecimalLike = { toString(): string } | string | number;

/**
 * Map a server-validated cart (after Prisma price lookup) to a Klarna
 * Checkout v3 payload. All prices are converted to öre.
 *
 * Tax rate: Swedish dietary supplements / kosttillskott are 6 % VAT (600 bp)
 * from 2026 (was 12 % before). The Order schema also persists `taxRateBp`
 * per order so historical records stay accurate when the rate changes again.
 */

// Swedish VAT for kosttillskott is 6% (was 12% before 2026). Stored in
// basis points so the gross→net math stays integer-friendly.
export const CURRENT_VAT_BP = 600;

export type CheckoutLine = {
  productId: string;
  slug: string;
  sku: string;
  name: string;
  imageUrl: string;
  /** Decimal from Prisma — will be converted to öre. */
  price: DecimalLike;
  quantity: number;
};

const toOre = (sek: DecimalLike): number =>
  Math.round(parseFloat(sek.toString()) * 100);

function buildLine(
  line: CheckoutLine,
  baseURL: string
): KlarnaOrderLine {
  const unit_price = toOre(line.price);
  const total_amount = unit_price * line.quantity;
  // Klarna's total_tax_amount = total_amount * tax_rate / (10000 + tax_rate)
  // (because the price is *gross* / inclusive of VAT)
  const total_tax_amount = Math.round(
    (total_amount * CURRENT_VAT_BP) / (10000 + CURRENT_VAT_BP)
  );
  return {
    type: "physical",
    reference: line.sku || line.productId,
    name: line.name,
    quantity: line.quantity,
    unit_price,
    tax_rate: CURRENT_VAT_BP,
    total_amount,
    total_tax_amount,
    image_url: line.imageUrl
      ? line.imageUrl.startsWith("http")
        ? line.imageUrl
        : `${baseURL}${line.imageUrl}`
      : undefined,
    product_url: `${baseURL}/produkter/${line.slug}`,
  };
}

export type CheckoutShipping = {
  amountSek: number; // SEK as number, e.g. 49
  freeOver: number; // free above this many SEK
};

/**
 * Synchronous fallback constants — kept for code paths that can't yet
 * await the SiteSetting helper (Klarna payload assembly is server-only,
 * so it should call `shippingForSubtotalAsync` instead). These values
 * mirror the SiteSetting defaults; an editor change in /admin/installningar
 * does NOT update these.
 */
export const FREE_SHIPPING_THRESHOLD = 599;
export const STANDARD_SHIPPING_SEK = 49;

export function shippingForSubtotal(subtotalSek: number): number {
  return subtotalSek >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_SEK;
}

/**
 * Editor-aware shipping calculation. Reads the SiteSetting table; falls
 * back to the constants above on read failure. Use this in any new code
 * path; existing call sites are migrated over time.
 */
export async function shippingForSubtotalAsync(
  subtotalSek: number
): Promise<number> {
  try {
    const { getShippingRules } = await import("@/lib/site/settings");
    const rules = await getShippingRules();
    if (rules.freeThresholdSek !== null && subtotalSek >= rules.freeThresholdSek)
      return 0;
    return rules.flatSek;
  } catch {
    return shippingForSubtotal(subtotalSek);
  }
}

export function buildKlarnaPayload(
  lines: CheckoutLine[],
  baseURL: string
): KlarnaCreateOrderPayload {
  const productLines = lines.map((l) => buildLine(l, baseURL));
  const productAmount = productLines.reduce((s, l) => s + l.total_amount, 0);
  const productTax = productLines.reduce((s, l) => s + l.total_tax_amount, 0);
  const subtotalSek = productAmount / 100;
  const shippingSek = shippingForSubtotal(subtotalSek);

  const allLines = [...productLines];
  if (shippingSek > 0) {
    const shippingOre = shippingSek * 100;
    const shippingTax = Math.round(
      (shippingOre * CURRENT_VAT_BP) / (10000 + CURRENT_VAT_BP)
    );
    allLines.push({
      type: "shipping_fee",
      reference: "SHIPPING-STANDARD",
      name: "Standardfrakt",
      quantity: 1,
      unit_price: shippingOre,
      tax_rate: CURRENT_VAT_BP,
      total_amount: shippingOre,
      total_tax_amount: shippingTax,
    });
  }

  const order_amount = allLines.reduce((s, l) => s + l.total_amount, 0);
  const order_tax_amount = allLines.reduce(
    (s, l) => s + l.total_tax_amount,
    0
  );

  return {
    purchase_country: "SE",
    purchase_currency: "SEK",
    locale: "sv-SE",
    order_amount,
    order_tax_amount,
    order_lines: allLines,
    merchant_urls: {
      terms: `${baseURL}/villkor`,
      checkout: `${baseURL}/checkout`,
      confirmation: `${baseURL}/checkout/bekraftelse?klarna_order_id={checkout.order.id}`,
      push: `${baseURL}/api/webhooks/klarna?klarna_order_id={checkout.order.id}`,
    },
  };
}
