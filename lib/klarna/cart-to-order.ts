import type {
  KlarnaAddress,
  KlarnaCreateOrderPayload,
  KlarnaOrderLine,
  KustomShippingOption,
} from "./types";
import { CURRENT_VAT_BP } from "@/lib/checkout/vat";

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

// Swedish VAT for kosttillskott — re-exported from the dependency-free
// `lib/checkout/vat` so client components can read it without dragging
// Prisma + `pg` into the bundle. New imports should hit that path
// directly; this re-export is kept for the existing call sites.
export { CURRENT_VAT_BP };

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
    total_discount_amount: 0,
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
 * Last-resort fallback constants — used only when the SiteSetting read
 * itself throws. The single source of truth is the SiteSetting table
 * (editable at /admin/installningar). All callers must `await
 * shippingForSubtotal()`; there is no sync variant on purpose — a sync
 * path would silently drift from admin edits (see audit 2026-05-13).
 */
const FALLBACK_FREE_THRESHOLD = 499;
const FALLBACK_FLAT_SEK = 49;

/** Re-exported for back-compat where call sites only need the cap label. */
export const STANDARD_SHIPPING_SEK = FALLBACK_FLAT_SEK;

export async function shippingForSubtotal(
  subtotalSek: number
): Promise<number> {
  try {
    const { getShippingRules } = await import("@/lib/site/settings");
    const rules = await getShippingRules();
    if (rules.freeThresholdSek !== null && subtotalSek >= rules.freeThresholdSek)
      return 0;
    return rules.flatSek;
  } catch {
    return subtotalSek >= FALLBACK_FREE_THRESHOLD ? 0 : FALLBACK_FLAT_SEK;
  }
}

/**
 * Optional discount applied to the Klarna order. When set, we emit a
 * Klarna `discount` line with a negative amount so the Klarna screen
 * shows the deduction explicitly to the customer (rather than silently
 * adjusting product line prices).
 *
 * Currently used by Familjen Biomax point redemption. Same shape will
 * cover future coupon-code application without further changes.
 */
export type CheckoutDiscount = {
  /** Discount amount in SEK (positive number). */
  amountKr: number;
  /** Display label shown to the customer on the Klarna screen. */
  label: string;
  /** Stable reference for the line — surfaces in Klarna's admin. */
  reference?: string;
};

export async function buildKlarnaPayload(
  lines: CheckoutLine[],
  baseURL: string,
  discount?: CheckoutDiscount | null,
  /** Pre-fill for logged-in customers. Kustom shows these in the
   *  iframe pre-filled but still editable; omit for guests. */
  billingAddress?: KlarnaAddress | null
): Promise<KlarnaCreateOrderPayload> {
  const productLines = lines.map((l) => buildLine(l, baseURL));
  const productAmount = productLines.reduce((s, l) => s + l.total_amount, 0);
  const subtotalSek = productAmount / 100;
  const shippingSek = await shippingForSubtotal(subtotalSek);

  // ADR 0020: KSA-driven shipping. We do NOT emit a `shipping_fee`
  // order line — Kustom adds the customer-selected option's price
  // itself (and pulls portal-configured PostNord pickup points).
  // `order_amount` therefore excludes shipping. We still pass one
  // fallback option, priced from our SiteSetting rules, so KSA has a
  // baseline if the carrier TMS returns nothing.
  const allLines = [...productLines];
  const shippingOre = Math.round(shippingSek * 100);
  const shippingTax = Math.round(
    (shippingOre * CURRENT_VAT_BP) / (10000 + CURRENT_VAT_BP)
  );
  const shipping_options: KustomShippingOption[] = [
    {
      id: "postnord-home",
      name: "PostNord Hemleverans",
      price: shippingOre,
      tax_amount: shippingTax,
      tax_rate: CURRENT_VAT_BP,
      shipping_method: "Home",
      preselected: true,
    },
  ];

  // Discount line — Klarna convention is negative unit_price + total_amount
  // for `type: "discount"`. We cap at the productAmount so we never push
  // the order negative; placeOrder's server-side validator should have
  // already enforced that, but we double-guard here in case a future call
  // site forgets. The discount's tax follows the same gross-inclusive
  // math as product lines so the order-level tax stays consistent.
  if (discount && discount.amountKr > 0) {
    const rawOre = Math.round(discount.amountKr * 100);
    const cappedOre = Math.min(rawOre, productAmount);
    if (cappedOre > 0) {
      const negOre = -cappedOre;
      const total_tax_amount = -Math.round(
        (cappedOre * CURRENT_VAT_BP) / (10000 + CURRENT_VAT_BP)
      );
      allLines.push({
        type: "discount",
        reference: discount.reference ?? "DISCOUNT",
        name: discount.label,
        quantity: 1,
        unit_price: negOre,
        tax_rate: CURRENT_VAT_BP,
        total_amount: negOre,
        total_discount_amount: 0,
        total_tax_amount,
      });
    }
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
    shipping_options,
    options: {
      allow_separate_shipping_address: true,
      // Biomax brand (deep navy) — see ADR 0020. HEX only; Kustom
      // passes these to Stripe Elements which rejects rgba().
      color_button: "#0F2440",
      color_button_text: "#FBFAF7",
      color_header: "#0F2440",
      color_link: "#1E3A5F",
      color_checkbox: "#0F2440",
      color_checkbox_checkmark: "#FBFAF7",
      color_background: "#FFFFFF",
      radius_border: "12",
      // Kustom owns the authoritative summary in-iframe; make it the
      // full breakdown so our sidebar doesn't need to duplicate it.
      show_subtotal_detail: true,
    },
    ...(billingAddress ? { billing_address: billingAddress } : {}),
    merchant_urls: {
      terms: `${baseURL}/villkor`,
      checkout: `${baseURL}/checkout`,
      confirmation: `${baseURL}/checkout/bekraftelse?klarna_order_id={checkout.order.id}`,
      // Append the shared webhook secret so the push receiver can
      // authenticate the caller (Kustom/Klarna v3 push is unsigned —
      // a secret query param is the documented mitigation). Omitted
      // when unset so dev/stub keeps working.
      push: `${baseURL}/api/webhooks/klarna?klarna_order_id={checkout.order.id}${
        process.env.KLARNA_WEBHOOK_SECRET
          ? `&token=${encodeURIComponent(process.env.KLARNA_WEBHOOK_SECRET)}`
          : ""
      }`,
    },
  };
}
