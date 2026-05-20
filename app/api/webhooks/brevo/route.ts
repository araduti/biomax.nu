import { NextResponse } from "next/server";
import {
  enforceRateLimit,
  BREVO_WEBHOOK_RULE,
} from "@/lib/security/rate-limit";
import { forEachActiveTenant } from "@/lib/cron/for-each-tenant";

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
 *
 * Tenant scope (sub-slice 3b-2 cron seam): Brevo delivers an email-only
 * event with no tenant identifier (the same address may exist in
 * multiple tenants' lists). We therefore broadcast the suppression
 * across every ACTIVE tenant via `forEachActiveTenant`: each tenant's
 * RLS-scoped upsert is independent and idempotent. Wasteful in the
 * many-tenant limit but correct; until Brevo's webhook URL can carry a
 * tenant slug (e.g. `/api/webhooks/brevo/<slug>` or a per-tenant
 * sender domain in Brevo config), broadcast is the only safe option.
 *
 * TODO(3b-2 follow-up): once each tenant has its own Brevo sender
 * domain / dedicated webhook URL, route by URL path (or by reverse
 * domain → tenant lookup) and drop the broadcast.
 *
 * NB: `NewsletterSubscriber.email` is currently a *global* @unique in
 * the Prisma schema (pre-strict-isolation). With a single ACTIVE
 * tenant (biomax) this is fine: only that tenant's row matches and
 * gets updated. Once a second tenant becomes ACTIVE and the schema
 * flips to composite (tenantId, email) @@unique, the per-tenant
 * upsert below remains correct without further changes.
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

function constantTimeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function tokenAuthorized(req: Request): boolean {
  const expected = process.env.BREVO_WEBHOOK_SECRET;
  if (!expected) {
    const host = req.headers.get("host") ?? "";
    return host.startsWith("localhost") || host.startsWith("127.0.0.1");
  }
  // Prefer a header — not written to access logs / Referer / browser
  // history the way a query string is. Fall back to the query param
  // for Brevo's native sender, which can only deliver the secret via
  // the URL (their documented IP-allowlist + secret-param approach).
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return constantTimeEq(auth.slice(7), expected);
  const xToken = req.headers.get("x-webhook-token");
  if (xToken) return constantTimeEq(xToken, expected);
  const provided = new URL(req.url).searchParams.get("token") ?? "";
  return constantTimeEq(provided, expected);
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

  // Filter to suppress-worthy events with a parseable email; everything
  // else is counted as ignored and not broadcast.
  const suppressTargets: { event: BrevoEvent; email: string }[] = [];
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
    suppressTargets.push({ event, email });
  }

  let suppressed = 0;
  const summary = await forEachActiveTenant(
    "webhooks/brevo",
    async (tx) => {
      const stamp = new Date();
      for (const { event, email } of suppressTargets) {
        try {
          // Upsert: covers both newsletter subscribers and
          // transactional-only customers (cart-snapshot recipients,
          // order-confirmation recipients). We default locale + source
          // so the row remains a valid lifecycle record even if it was
          // never an explicit signup.
          await tx.newsletterSubscriber.upsert({
            where: { email },
            update: {
              unsubscribedAt: stamp,
            },
            create: {
              email,
              locale: "sv-SE",
              source: `brevo-webhook:${event}`,
              consentedAt: stamp,
              unsubscribedAt: stamp,
            },
          });
          suppressed++;
        } catch (err) {
          // Soft-fail per event so one bad row doesn't poison the
          // whole batch.
          console.error(`[brevo-webhook] upsert failed for ${email}:`, err);
        }
      }
    },
    { txTimeoutMs: 60_000 }
  );

  return NextResponse.json({
    ok: true,
    received: events.length,
    suppressed,
    ignored,
    tenants: summary,
  });
}
