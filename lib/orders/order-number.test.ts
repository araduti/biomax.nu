import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { generateOrderNumber, isOrderNumberCollision } from "./order-number";

describe("generateOrderNumber", () => {
  it("matches PREFIX-YYYYMMDD-NNNN with a 4-digit suffix", () => {
    expect(generateOrderNumber()).toMatch(/^BMX-\d{8}-\d{4}$/);
    expect(generateOrderNumber("BMX-SUB")).toMatch(/^BMX-SUB-\d{8}-\d{4}$/);
  });
  it("produces varied suffixes (crypto, not constant)", () => {
    const s = new Set(Array.from({ length: 200 }, () => generateOrderNumber()));
    expect(s.size).toBeGreaterThan(150);
  });
});

describe("isOrderNumberCollision", () => {
  it("true only for P2002 on orderNumber", () => {
    const mk = (target: string[]) =>
      new Prisma.PrismaClientKnownRequestError("x", { code: "P2002", clientVersion: "x", meta: { target } });
    expect(isOrderNumberCollision(mk(["orderNumber"]))).toBe(true);
    expect(isOrderNumberCollision(mk(["paymentReference"]))).toBe(false);
    expect(isOrderNumberCollision(new Error("nope"))).toBe(false);
    expect(isOrderNumberCollision(null)).toBe(false);
  });
});
