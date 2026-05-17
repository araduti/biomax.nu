import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";

/**
 * Generate a human-facing order number `PREFIX-YYYYMMDD-NNNN`.
 *
 * The 4-digit suffix uses `crypto.randomInt` (uniform, unpredictable)
 * rather than `Math.random()`. The space is small by design (the
 * number is read aloud / typed by customers), so callers MUST treat
 * `orderNumber`'s DB unique constraint as authoritative and retry on
 * a collision — see `isOrderNumberCollision`.
 */
export function generateOrderNumber(prefix = "BMX"): string {
  const now = new Date();
  const yyyymmdd =
    now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, "0") +
    now.getDate().toString().padStart(2, "0");
  const rand = randomInt(1000, 10000); // 1000–9999, crypto-strong
  return `${prefix}-${yyyymmdd}-${rand}`;
}

/**
 * True when `err` is a Prisma unique-constraint violation on the
 * `orderNumber` column — i.e. a generated number collided and the
 * caller should regenerate and retry rather than fail the customer.
 */
export function isOrderNumberCollision(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (err.code !== "P2002") return false;
  const target = err.meta?.target;
  const s = Array.isArray(target) ? target.join(",") : String(target ?? "");
  return s.includes("orderNumber");
}
