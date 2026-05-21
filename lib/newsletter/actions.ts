"use server";

import crypto from "node:crypto";
import { z } from "zod";
import { tenantScope } from "@/lib/tenant/db";
import { currentTenant } from "@/lib/tenant";
import { emailSchema, fail } from "@/lib/validation/shared";
import {
  enforceRateLimit,
  enforceTenantRateLimit,
  clientIp,
  NEWSLETTER_SIGNUP_RULE,
} from "@/lib/security/rate-limit";

const SubscribeSchema = z.object({
  email: emailSchema,
  source: z.string().trim().max(60).optional(),
  consentGiven: z.literal(true, {
    message: "Du måste acceptera att vi får skicka brev till dig.",
  }),
});

export type SubscribeResult =
  | { ok: true; alreadySubscribed: boolean }
  | { ok: false; error: string };

/**
 * Newsletter signup. Single-opt-in per Swedish e-marketing law: the form
 * checkbox makes the consent explicit, and we record the source string
 * so we can segment ("homepage-form", "checkout-marketing-consent", etc.).
 *
 * Idempotent: re-submitting an email that's already subscribed is a no-op.
 * If the address previously unsubscribed, we re-activate it (rare, but a
 * cleaner UX than refusing).
 */
export async function subscribeToNewsletter(
  raw: unknown
): Promise<SubscribeResult> {
  const parsed = SubscribeSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error);
  const email = parsed.data.email;
  const source = parsed.data.source ?? "homepage";

  const ip = await clientIp();
  const ipLimit = await enforceRateLimit(NEWSLETTER_SIGNUP_RULE, ip);
  if (!ipLimit.allowed) {
    return {
      ok: false,
      error: `För många försök just nu — försök igen om ${Math.ceil(ipLimit.retryAfterSeconds / 60)} minuter.`,
    };
  }

  const { id: tenantId } = await currentTenant();
  // ADR 0033 A1: per-tenant cap (additionally to the global per-IP one
  // above) — a single tenant being scraped for newsletter abuse can't
  // burn the global IP budget for unrelated tenants.
  const tenantLimit = await enforceTenantRateLimit(
    NEWSLETTER_SIGNUP_RULE,
    tenantId,
    ip
  );
  if (!tenantLimit.allowed) {
    return {
      ok: false,
      error: `För många försök just nu — försök igen om ${Math.ceil(tenantLimit.retryAfterSeconds / 60)} minuter.`,
    };
  }
  try {
    return await tenantScope(tenantId, async (tx) => {
      const existing = await tx.newsletterSubscriber.findFirst({
        where: { email },
        select: { id: true, unsubscribedAt: true },
      });

      if (existing && !existing.unsubscribedAt) {
        return { ok: true, alreadySubscribed: true };
      }

      if (existing) {
        // Re-activate a previously-unsubscribed address. Reset welcome stage
        // so they get the series again — they're a "new" subscriber from
        // our perspective, and have explicitly opted back in.
        await tx.newsletterSubscriber.update({
          where: { id: existing.id },
          data: {
            unsubscribedAt: null,
            welcomeSeriesStage: 0,
            welcomeSeriesStartedAt: null,
            source,
            consentedAt: new Date(),
          },
        });
        return { ok: true, alreadySubscribed: false };
      }

      await tx.newsletterSubscriber.create({
        data: {
          email,
          source,
          tenantId,
          unsubscribeToken: crypto.randomBytes(24).toString("base64url"),
        },
      });
      return { ok: true, alreadySubscribed: false };
    });
  } catch (err) {
    console.error("subscribeToNewsletter failed:", err);
    return { ok: false, error: "Kunde inte spara prenumerationen." };
  }
}

/**
 * One-click unsubscribe handler — called from the link in every marketing
 * email. Always returns ok=true so the customer always sees confirmation
 * (we never want to fail a "please stop emailing me" because of a DB blip).
 */
export async function unsubscribeByToken(token: string): Promise<{
  ok: true;
  emailMasked: string | null;
}> {
  if (!token) return { ok: true, emailMasked: null };
  const { id: tenantId } = await currentTenant();
  try {
    return await tenantScope(tenantId, async (tx) => {
      const row = await tx.newsletterSubscriber.findUnique({
        where: { unsubscribeToken: token },
        select: { id: true, email: true },
      });
      if (!row) return { ok: true, emailMasked: null };
      await tx.newsletterSubscriber.update({
        where: { id: row.id },
        data: { unsubscribedAt: new Date() },
      });
      return { ok: true, emailMasked: maskEmail(row.email) };
    });
  } catch (err) {
    console.error("unsubscribeByToken failed:", err);
    return { ok: true, emailMasked: null };
  }
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const head = local.slice(0, 2);
  return `${head}${"*".repeat(Math.max(2, local.length - 2))}@${domain}`;
}
