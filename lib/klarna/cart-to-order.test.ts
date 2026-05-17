import { describe, it, expect, vi, beforeEach } from "vitest";

// shippingForSubtotal dynamically imports this; intercept it so the
// tests are pure (no DB / Next runtime).
const getShippingRules = vi.fn();
vi.mock("@/lib/site/settings", () => ({ getShippingRules }));

import {
  buildKlarnaPayload,
  shippingForSubtotal,
  CURRENT_VAT_BP,
  type CheckoutLine,
} from "./cart-to-order";

const line = (over: Partial<CheckoutLine> = {}): CheckoutLine => ({
  productId: "p1",
  slug: "balans",
  sku: "WP-1",
  name: "Balans",
  imageUrl: "/products/balans.jpg",
  price: 100,
  quantity: 1,
  ...over,
});

const grossTax = (amount: number) =>
  Math.round((amount * CURRENT_VAT_BP) / (10000 + CURRENT_VAT_BP));

beforeEach(() => {
  getShippingRules.mockReset();
});

describe("shippingForSubtotal", () => {
  it("charges the flat rate below the free threshold", async () => {
    getShippingRules.mockResolvedValue({ flatSek: 49, freeThresholdSek: 499 });
    expect(await shippingForSubtotal(100)).toBe(49);
  });

  it("is free at and above the threshold (boundary inclusive)", async () => {
    getShippingRules.mockResolvedValue({ flatSek: 49, freeThresholdSek: 499 });
    expect(await shippingForSubtotal(499)).toBe(0);
    expect(await shippingForSubtotal(500)).toBe(0);
  });

  it("never goes free when freeThresholdSek is null", async () => {
    getShippingRules.mockResolvedValue({ flatSek: 49, freeThresholdSek: null });
    expect(await shippingForSubtotal(99999)).toBe(49);
  });

  it("falls back to constants when the settings read throws", async () => {
    getShippingRules.mockRejectedValue(new Error("db down"));
    expect(await shippingForSubtotal(100)).toBe(49);
    expect(await shippingForSubtotal(499)).toBe(0);
  });
});

describe("buildKlarnaPayload", () => {
  beforeEach(() => {
    getShippingRules.mockResolvedValue({ flatSek: 49, freeThresholdSek: 499 });
  });

  it("computes gross-inclusive line tax and a shipping-excluded order_amount", async () => {
    const p = await buildKlarnaPayload([line({ price: 100, quantity: 2 })], "https://x");
    const l = p.order_lines[0];
    expect(l.unit_price).toBe(10000);
    expect(l.total_amount).toBe(20000);
    expect(l.total_tax_amount).toBe(grossTax(20000));
    // order_amount excludes shipping (ADR 0020 / KSA-driven)
    expect(p.order_amount).toBe(20000);
  });

  it("sums multiple product lines", async () => {
    const p = await buildKlarnaPayload(
      [line({ price: 100 }), line({ productId: "p2", price: 250, quantity: 3 })],
      "https://x"
    );
    expect(p.order_amount).toBe(10000 + 75000);
    expect(p.order_tax_amount).toBe(grossTax(10000) + grossTax(75000));
  });

  it("emits a capped negative discount line and lowers order_amount", async () => {
    const p = await buildKlarnaPayload(
      [line({ price: 100 })],
      "https://x",
      { amountKr: 30, label: "Poäng", reference: "LOYALTY" }
    );
    const d = p.order_lines.find((x) => x.type === "discount")!;
    expect(d.unit_price).toBe(-3000);
    expect(d.total_amount).toBe(-3000);
    expect(d.total_tax_amount).toBe(-grossTax(3000));
    expect(p.order_amount).toBe(10000 - 3000);
  });

  it("caps the discount at the product total (order can't go negative)", async () => {
    const p = await buildKlarnaPayload(
      [line({ price: 100 })],
      "https://x",
      { amountKr: 9999, label: "Poäng" }
    );
    const d = p.order_lines.find((x) => x.type === "discount")!;
    expect(d.total_amount).toBe(-10000);
    expect(p.order_amount).toBe(0);
  });

  it("emits no discount line when amountKr is 0", async () => {
    const p = await buildKlarnaPayload([line()], "https://x", {
      amountKr: 0,
      label: "Poäng",
    });
    expect(p.order_lines.some((x) => x.type === "discount")).toBe(false);
  });
});
