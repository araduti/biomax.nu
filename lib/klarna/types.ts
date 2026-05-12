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

export type KlarnaCreateOrderPayload = {
  purchase_country: "SE";
  purchase_currency: "SEK";
  locale: "sv-SE";
  order_amount: number;
  order_tax_amount: number;
  order_lines: KlarnaOrderLine[];
  merchant_urls: KlarnaMerchantUrls;
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

export type KlarnaOrderStatus =
  | "checkout_incomplete"
  | "checkout_complete"
  | "captured"
  | "cancelled";

export type KlarnaOrder = KlarnaCreateOrderPayload & {
  order_id: string;
  status: KlarnaOrderStatus;
  /** HTML snippet to embed in our checkout page (the Klarna iframe). */
  html_snippet: string;
  started_at?: string;
  completed_at?: string;
  customer?: KlarnaAddress;
};
