import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  enforceRateLimit,
  BREVO_WEBHOOK_RULE,
} from "@/lib/security/rate-limit";

/**
 * Brevo transactional + marketing event webhook.
 *
 * Configured in Brevo dashboard → Senders & Domains → Webhook. Point at
 * `https://www.biomax.nu/api/webhooks/brevo?token=${BREVO_WEBHOOK_SECRET}`
 * and enable these events:
 *   - hard_bounce, blocked, spam, unsubscribed
 *
 * Brevo doesn't sign transactional webhooks (their official recommendation
 * is IP allow-list + a secret query param), so we verify the shared token.
 * Without the secret set, the endpoint refuses requests in production but
 * allows localhost for dev iteration — same pattern as the cron routes.
 *
 * Event semantics:
 *   - hard_bounce / blocked / spam → mark the address as unsubscribed
 *     (permanent delivery failure or explicit user complaint).
 *   - unsubscribed → mark as unsubscribed (Brevo's own unsubscribe footer).
 *   - soft_bounce → log only; Brevo retries internally.
 *
 * Idempotent: setting `unsubscribedAt` twice is a no-op. We upsert a
 * NewsletterSubscriber row even for transactional-only addresses so
 * every lifecycle suppression check (`unsubscribedAt IS NULL`) covers
 * them.
 */
export const runtime = "nodejs";

type BrevoEvent =
  | "hard_bounce"
  | "soft_bounce"
  | "blocked"
  | "spam"
  | "unsubscribed"
  | "deferred"
  | "delivered"
  | "request"
  | "opened"
  | "click"
  | "invalid_email"
  | "error";

const SUPPRESS_EVENTS = new Set<BrevoEvent>([
  "hard_bounce",
  "blocked",
  "spam",
  "unsubscribed",
  "invalid_email",
]);

function tokenAuthorized(req: Request): boolean {
  const expected = process.env.BREVO_WEBHOOK_SECRET;
  const url = new URL(req.url);
  const provided = url.searchParams.get("token") ?? "";
  if (!expected) {
    const host = req.headers.get("host") ?? "";
    return host.startsWith("localhost") || host.startsWith("127.0.0.1");
  }
  // Constant-time compare to dodge timing oracles.
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return diff === 0;
}

export async function POST(req: Request) {
  if (!tokenAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // Rate-limit globally (scope keyed on the rule name, single identifier
  // "global"). The token already authenticates the sender; this is just
  // a sanity ceiling to keep DB writes bounded during a Brevo runaway.
  const rl = await enforceRateLimit(BREVO_WEBHOOK_RULE, "global");
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    );
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  // Brevo sometimes sends a single event object, sometimes an array.
  // Normalise to an array up front.
  const events = Array.isArray(payload) ? payload : [payload];

  let suppressed = 0;
  let ignored = 0;
  for (const evt of events) {
    if (!evt || typeof evt !== "object") {
      ignored++;
      continue;
    }
    const e = evt as { event?: string; email?: string };
    const event = (e.event ?? "").toLowerCase() as BrevoEvent;
    const email = (e.email ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      ignored++;
      continue;
    }
    if (!SUPPRESS_EVENTS.has(event)) {
      ignored++;
      continue;
    }

    try {
      // Upsert: covers both newsletter subscribers and transactional-only
      // customers (cart-snapshot recipients, order-confirmation recipients).
      // We default locale + source so the row remains a valid lifecycle
      // record even if it was never an explicit signup.
      await prisma.newsletterSubscriber.upsert({
        where: { email },
        update: {
          unsubscribedAt: new Date(),
        },
        create: {
          email,
          locale: "sv-SE",
          source: `brevo-webhook:${event}`,
          consentedAt: new Date(),
          unsubscribedAt: new Date(),
        },
      });
      suppressed++;
    } catch (err) {
      // Soft-fail per event so one bad row doesn't poison the whole batch.
      console.error(`[brevo-webhook] upsert failed for ${email}:`, err);
    }
  }

  return NextResponse.json({
    ok: true,
    received: events.length,
    suppressed,
    ignored,
  });
}
