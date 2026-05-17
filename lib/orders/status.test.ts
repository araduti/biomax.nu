import { describe, it, expect } from "vitest";
import {
  VALID_ORDER_TRANSITIONS,
  canTransitionOrder,
} from "@/lib/orders/status";

describe("order status state machine", () => {
  it("allows the legitimate forward transitions", () => {
    expect(canTransitionOrder("PENDING", "PAID")).toBe(true);
    expect(canTransitionOrder("PENDING", "CANCELLED")).toBe(true);
    expect(canTransitionOrder("PAID", "FULFILLED")).toBe(true);
    expect(canTransitionOrder("PAID", "REFUNDED")).toBe(true);
    expect(canTransitionOrder("FULFILLED", "REFUNDED")).toBe(true);
  });

  it("blocks refunding a cancelled order (double-settlement vector)", () => {
    expect(canTransitionOrder("CANCELLED", "REFUNDED")).toBe(false);
  });

  it("blocks re-refunding an already refunded order", () => {
    expect(canTransitionOrder("REFUNDED", "REFUNDED")).toBe(false);
  });

  it("blocks resurrecting a terminal order back to PAID/FULFILLED", () => {
    expect(canTransitionOrder("REFUNDED", "PAID")).toBe(false);
    expect(canTransitionOrder("CANCELLED", "FULFILLED")).toBe(false);
    expect(canTransitionOrder("FULFILLED", "PAID")).toBe(false);
  });

  it("treats CANCELLED and REFUNDED as terminal (no outgoing edges)", () => {
    expect(VALID_ORDER_TRANSITIONS.CANCELLED).toEqual([]);
    expect(VALID_ORDER_TRANSITIONS.REFUNDED).toEqual([]);
  });
});
