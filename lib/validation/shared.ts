/**
 * Shared zod schemas + helpers used across server actions and route
 * handlers. Centralising these here means a tweak (e.g. raising the
 * email length cap) updates every trust boundary in one place.
 *
 * Pattern across the codebase:
 *
 *   import { z } from "zod";
 *   import { fail, ActionResult } from "@/lib/validation/shared";
 *
 *   const Input = z.object({ … });
 *
 *   export async function myAction(input: unknown): Promise<ActionResult> {
 *     const parsed = Input.safeParse(input);
 *     if (!parsed.success) return fail(parsed.error);
 *     // …use parsed.data with full type safety
 *   }
 *
 * Why we don't `throw` on validation failure: server actions surface
 * errors directly to the client. Returning `{ ok: false, error }` keeps
 * the error message in Swedish, our control, and avoids leaking
 * field-by-field zod paths to the UI.
 */
import { z } from "zod";

/** Trim + lowercase email, 320-char RFC 5321 limit. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(320, "E-postadressen är för lång.")
  .refine((v) => v.includes("@") && v.includes("."), {
    message: "Ogiltig e-postadress.",
  });

/** Optional trimmed string, becomes null when empty. */
export const optionalTrimmedString = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .transform((v) => (v.length === 0 ? null : v))
    .nullable();

/** Phone — loose; we never validate format because Swedish customers
 *  enter +46, 070-, 070 with spaces, etc. Just clamp length. */
export const phoneSchema = z.string().trim().max(40).optional();

/** Swedish postal code — 5 digits with optional space, "123 45" or "12345". */
export const postalCodeSchema = z
  .string()
  .trim()
  .max(10)
  .refine((v) => /^\d{3}\s?\d{2}$/.test(v), {
    message: "Ange ett giltigt postnummer (t.ex. 412 50).",
  });

/** Cuid pattern Prisma produces by default. Cheap server-side sanity. */
export const cuidSchema = z
  .string()
  .min(20)
  .max(40)
  .regex(/^[a-z0-9]+$/i, "Ogiltigt id.");

/** Positive integer with a configurable cap. */
export const positiveIntSchema = (max = 999) =>
  z.coerce.number().int().min(1).max(max);

/** Discriminated union for action results — used everywhere. */
export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/**
 * Translate a zod error into a single Swedish error string. We don't
 * surface field paths — they leak the schema shape. We return the first
 * issue's `message` which the schemas above set to Swedish copy.
 */
export function fail(error: z.ZodError): { ok: false; error: string } {
  const first = error.issues[0];
  return {
    ok: false,
    error: first?.message ?? "Något i formuläret är ogiltigt.",
  };
}
