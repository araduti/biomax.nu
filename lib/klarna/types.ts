/**
 * Klarna Checkout v3 API types — minimal subset Biomax needs.
 * Reference: https://docs.klarna.com/api/checkout/
 *
 * Money is in **minor units (öre)** for Klarna. SEK 311.00 = 31100.
 */

export type KlarnaOrderLineType =
  | "physical"
  | "discount"
  | "shipping_fee"
  | "sales_tax"
  | "digital"
  | "gift_card"
  | "store_credit"
  | "surcharge";

export type KlarnaOrderLine = {
  type: KlarnaOrderLineType;
  reference: string;
  name: string;
  quantity: number;
  /** öre, e.g. 31100 = 311.00 SEK */
  unit_price: number;
  /** Tax rate in basis points: 2500 = 25 %, 1200 = 12 %, 600 = 6 %. */
  tax_rate: number;
  /** öre, quantity × unit_price (post-discount). */
  total_amount: number;
  /** öre, per-line discount already reflected in total_amount. Kustom
   *  lists this on every order line; emit 0 when no line-level discount. */
  total_discount_amount: number;
  /** öre, tax portion of total_amount. */
  total_tax_amount: number;
  product_url?: string;
  image_url?: string;
};

export type KlarnaMerchantUrls = {
  terms: string;
  checkout: string;
  /** Confirmation page; Klarna substitutes {checkout.order.id}. */
  confirmation: string;
  /** Server-to-server push notification URL. */
  push: string;
  validation?: string;
};

/**
 * Fallback shipping option that triggers the Kustom Shipping Assistant.
 * When present, Kustom prices/handles shipping itself (and pulls
 * portal-configured carrier options like PostNord), so the payload
 * must NOT also carry a `shipping_fee` order line. Money in öre.
 */
export type KustomShippingOption = {
  id: string;
  name: string;
  description?: string;
  price: number;
  tax_amount: number;
  tax_rate: number;
  /** Kustom delivery class, e.g. "Home" | "PickUpStore". */
  shipping_method: string;
  preselected?: boolean;
};

/** Kustom create-order `options` object (subset Biomax uses).
 *  All colours MUST be HEX/rgb()/hsl() — Kustom forwards them to
 *  Stripe Elements, which rejects rgba() (see the colorDanger
 *  incident). Keep these as #RRGGBB. */
export type KustomOrderOptions = {
  /** Lets Kustom collect a delivery address separate from billing —
   *  required for KSA to resolve a full address and fetch real
   *  (non-preview) shipping options. */
  allow_separate_shipping_address?: boolean;
  /** Brand theming — Biomax design tokens (deep navy). */
  color_button?: string;
  color_button_text?: string;
  color_header?: string;
  color_link?: string;
  color_checkbox?: string;
  color_checkbox_checkmark?: string;
  color_background?: string;
  /** Border radius in px, as a string per Kustom's API. */
  radius_border?: string;
  /** Show the subtotal/line breakdown inside Kustom's own summary. */
  show_subtotal_detail?: boolean;
};

export type KlarnaCreateOrderPayload = {
  purchase_country: "SE";
  purchase_currency: "SEK";
  locale: "sv-SE";
  order_amount: number;
  order_tax_amount: number;
  order_lines: KlarnaOrderLine[];
  merchant_urls: KlarnaMerchantUrls;
  /** KSA trigger — see ADR 0020. */
  shipping_options?: KustomShippingOption[];
  /** Kustom nests behavioural flags here — NOT top-level. */
  options?: KustomOrderOptions;
  /** Passthrough (max 6000 chars) — echoed back on read-order. We
   *  stash the loyalty redemption here so the confirmation/webhook
   *  can burn points + record the discount. JSON string. */
  merchant_data?: string;
  /** Optional pre-fill of customer details. */
  shipping_address?: KlarnaAddress;
  billing_address?: KlarnaAddress;
};

export type KlarnaAddress = {
  given_name?: string;
  family_name?: string;
  email?: string;
  street_address?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  phone?: string;
};

/** Legacy Klarna (lowercase) + Kustom (uppercase) status strings.
 *  Compare case-insensitively — never assume one casing. */
export type KlarnaOrderStatus =
  | "checkout_incomplete"
  | "checkout_complete"
  | "captured"
  | "cancelled"
  | "CHECKOUT_INCOMPLETE"
  | "CHECKOUT_COMPLETE"
  | "CHECKOUT_ORDER"
  | "CAPTURED"
  | "CANCELLED"
  | (string & {});

/** True when the customer has completed checkout (paid/authorised),
 *  regardless of Klarna/Kustom casing. */
export function isKustomOrderComplete(status: string): boolean {
  const s = status.toUpperCase();
  return (
    s === "CHECKOUT_COMPLETE" || s === "CHECKOUT_ORDER" || s === "CAPTURED"
  );
}

/** Read-order's selected option carries the customer's pickup point +
 *  tracking under delivery_details. Read defensively — Kustom has
 *  shipped casing/shape variants (cf. lib/postnord/booking.ts). */
export type KustomSelectedShippingOption = KustomShippingOption & {
  delivery_details?: {
    carrier?: string;
    pickup_location?: {
      id?: string;
      name?: string;
      address?: KlarnaAddress & { street_name?: string };
    };
    tracking_id?: string;
    tracking_number?: string;
  };
  tms_reference?: string;
};

export type KlarnaOrder = KlarnaCreateOrderPayload & {
  order_id: string;
  status: KlarnaOrderStatus;
  /** HTML snippet to embed: the checkout iframe on /checkout, the
   *  confirmation snippet when read back on /checkout/bekraftelse. */
  html_snippet: string;
  started_at?: string;
  completed_at?: string;
  customer?: KlarnaAddress;
  /** Customer-selected shipping option (read-order response). */
  selected_shipping_option?: KustomSelectedShippingOption;
};
