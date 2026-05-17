import { describe, it, expect } from "vitest";
import { validateRedemption } from "./burn";
import { MIN_REDEMPTION_POINTS, pointsToOre } from "./constants";

describe("validateRedemption", () => {
  const base = { balance: 1000, subtotalOre: 1_000_000 };

  it("treats 0 / negative as opt-out (ok, no discount)", () => {
    expect(validateRedemption({ ...base, pointsRequested: 0 })).toEqual({
      ok: true,
      points: 0,
      oreDiscount: 0,
    });
    expect(validateRedemption({ ...base, pointsRequested: -50 })).toEqual({
      ok: true,
      points: 0,
      oreDiscount: 0,
    });
  });

  it("rejects below the minimum block", () => {
    expect(
      validateRedemption({ ...base, pointsRequested: MIN_REDEMPTION_POINTS - 1 })
    ).toEqual({ ok: false, reason: "below-min" });
  });

  it("rejects non-multiples of the minimum block", () => {
    expect(
      validateRedemption({
        ...base,
        pointsRequested: MIN_REDEMPTION_POINTS + 1,
      })
    ).toEqual({ ok: false, reason: "not-multiple" });
  });

  it("rejects more points than the balance", () => {
    expect(
      validateRedemption({
        balance: MIN_REDEMPTION_POINTS,
        subtotalOre: 1_000_000,
        pointsRequested: MIN_REDEMPTION_POINTS * 2,
      })
    ).toEqual({ ok: false, reason: "exceeds-balance" });
  });

  it("rejects a discount larger than the subtotal", () => {
    const pts = MIN_REDEMPTION_POINTS * 2;
    // subtotal exactly one block's worth of öre — 2 blocks must exceed it
    expect(
      validateRedemption({
        balance: 10_000,
        subtotalOre: pointsToOre(MIN_REDEMPTION_POINTS),
        pointsRequested: pts,
      })
    ).toEqual({ ok: false, reason: "exceeds-subtotal" });
  });

  it("accepts a valid redemption at the exact balance/subtotal boundary", () => {
    const pts = MIN_REDEMPTION_POINTS;
    expect(
      validateRedemption({
        balance: pts,
        subtotalOre: pointsToOre(pts), // discount == subtotal is allowed
        pointsRequested: pts,
      })
    ).toEqual({ ok: true, points: pts, oreDiscount: pointsToOre(pts) });
  });

  it("floors fractional point requests before validating", () => {
    // 149.9 floors to 149 → not a multiple of 100
    expect(
      validateRedemption({ ...base, pointsRequested: MIN_REDEMPTION_POINTS + 49.9 })
    ).toEqual({ ok: false, reason: "not-multiple" });
  });
});
