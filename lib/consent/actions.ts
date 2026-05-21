"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { tenantScope } from "@/lib/tenant/db";
import { currentTenant } from "@/lib/tenant";
import { currentUser } from "@/lib/session";
import { CONSENT_POLICY_VERSION } from "./constants";

/**
 * Append-only consent proof (ADR 0023). Called fire-and-forget from the
 * cookie banner on every save. Best-effort + fail-soft: a logging
 * failure must never block or throw into the banner UI — localStorage
 * remains the source of truth for banner *behaviour*; this row is the
 * source of truth for legal *proof*.
 *
 * Session-derived `userId` only — never trust a client-supplied id.
 */

const Input = z.object({
  // Client-minted random id; clamp length, don't trust contents.
  subjectKey: z.string().trim().min(8).max(64),
  analytics: z.boolean(),
  marketing: z.boolean(),
  source: z.enum([
    "banner-accept-all",
    "banner-necessary-only",
    "banner-custom",
  ]),
});

export async function recordConsent(raw: unknown): Promise<void> {
  try {
    const parsed = Input.safeParse(raw);
    if (!parsed.success) return;
    const { subjectKey, analytics, marketing, source } = parsed.data;

    const user = await currentUser().catch(() => null);

    let ip: string | null = null;
    let userAgent: string | null = null;
    try {
      const h = await headers();
      const xff = h.get("x-forwarded-for");
      ip = xff
        ? xff.split(",")[0]!.trim().slice(0, 64)
        : (h.get("x-real-ip")?.slice(0, 64) ?? null);
      userAgent = h.get("user-agent")?.slice(0, 256) ?? null;
    } catch {
      /* headers unavailable — log without forensic fields */
    }

    const { id: tenantId } = await currentTenant();
    await tenantScope(tenantId, (tx) =>
      tx.consentEvent.create({
        data: {
          tenantId,
          subjectKey,
          userId: user?.id ?? null,
          analytics,
          marketing,
          policyVersion: CONSENT_POLICY_VERSION,
          source,
          ip,
          userAgent,
        },
      })
    );
  } catch (err) {
    console.error("[consent] log write failed:", err);
  }
}
