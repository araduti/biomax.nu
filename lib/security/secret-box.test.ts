import { describe, it, expect, beforeAll } from "vitest";
import { seal, open } from "./secret-box";

describe("secret-box (ADR 0034 D3)", () => {
  beforeAll(() => {
    process.env.KINE_PAYMENT_KEK = "test-kek-aaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  });

  it("round-trips a secret", () => {
    const s = "kustom_api_password_å3#";
    expect(open(seal(s))).toBe(s);
  });

  it("produces a self-describing v1 envelope with a fresh IV", () => {
    const a = seal("same");
    const b = seal("same");
    expect(a.startsWith("v1:")).toBe(true);
    expect(a).not.toBe(b); // random IV → different ciphertext
    expect(open(a)).toBe(open(b));
  });

  it("rejects a tampered ciphertext (GCM auth)", () => {
    const sealed = seal("secret");
    const parts = sealed.split(":");
    parts[3] = Buffer.from("tampered").toString("base64");
    expect(() => open(parts.join(":"))).toThrow();
  });

  it("rejects an unknown scheme", () => {
    expect(() => open("v9:a:b:c")).toThrow(/unrecognised sealed format/);
  });
});
