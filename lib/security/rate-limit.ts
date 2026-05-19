/**
 * DB-backed fixed-window rate limiter for unauthenticated public
 * endpoints. Each scope (newsletter signup, cart-snapshot, review
 * submission, …) has its own bucket and limit; the identifier is
 * typically the client IP, but can also be an email for slow per-account
 * abuse (e.g. account-enumeration via newsletter signup).
 *
 * Fixed window: each (scope, identifier) row tracks `windowStart` and a
 * `count`. When `now - windowStart >= windowMs` we reset the window to
 * now and the count to 1. Otherwise we increment until `limit` is hit;
 * any further calls within the window return `allowed: false`.
 *
 * Why DB instead of in-process / Redis:
 *   - In-process state doesn't survive serverless invocations. Useless
 *     on Vercel.
 *   - Redis adds an external dep we don't yet need. The DB write is one
 *     UPSERT against an indexed PK; well within Postgres' comfort zone
 *     for our request volume.
 *   - When traffic outgrows this, swap the implementation behind the
 *     `enforceRateLimit` signature for Upstash Redis without touching
 *     call sites.
 *
 * Garbage collection: stale rows (windowStart older than 7 days) are
 * cleaned up by `app/api/cron/rate-limit-gc/route.ts`. The table stays
 * tiny in practice — most identifiers cycle through the same row.
 */
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export type RateLimitRule = {
  /** Stable name written to DB. e.g. "newsletter-signup". */
  scope: string;
  /** Maximum requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
};

export type RateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSeconds: number };

/**
 * Best-effort client IP extraction. Vercel sets `x-forwarded-for`;
 * locally we fall back to a "dev" sentinel so a developer doesn't lock
 * themselves out by hammering forms.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) {
    // First IP in the chain is the original client.
    return xff.split(",")[0]!.trim().slice(0, 64);
  }
  const real = h.get("x-real-ip");
  if (real) return real.slice(0, 64);
  return "dev-local";
}

/**
 * Check + increment the rate-limit bucket for `(scope, identifier)`.
 * Returns whether the call is allowed; on deny, returns the seconds
 * until the window resets so callers can set a Retry-After header.
 *
 * Idempotency note: this is intentionally racy — under concurrent load,
 * two simultaneous calls might both see count=limit-1 and both succeed,
 * exceeding the limit by 1. Acceptable; we're rate-limiting against
 * humans + naive bots, not adversarial throughput attacks.
 */
export async function enforceRateLimit(
  rule: RateLimitRule,
  identifier: string
): Promise<RateLimitResult> {
  const now = Date.now();
  const id = identifier.slice(0, 128); // hard cap to keep the table tidy
  try {
    const existing = await prisma.rateLimitBucket.findUnique({
      where: { scope_identifier: { scope: rule.scope, identifier: id } },
      select: { count: true, windowStart: true },
    });

    if (!existing) {
      await prisma.rateLimitBucket.create({
        data: {
          scope: rule.scope,
          identifier: id,
          count: 1,
          windowStart: new Date(now),
        },
      });
      return { allowed: true, remaining: rule.limit - 1 };
    }

    const elapsed = now - existing.windowStart.getTime();
    if (elapsed >= rule.windowMs) {
      // Reset the window — fresh count of 1.
      await prisma.rateLimitBucket.update({
        where: { scope_identifier: { scope: rule.scope, identifier: id } },
        data: { count: 1, windowStart: new Date(now) },
      });
      return { allowed: true, remaining: rule.limit - 1 };
    }

    if (existing.count >= rule.limit) {
      const retryAfterSeconds = Math.ceil((rule.windowMs - elapsed) / 1000);
      return { allowed: false, retryAfterSeconds };
    }

    await prisma.rateLimitBucket.update({
      where: { scope_identifier: { scope: rule.scope, identifier: id } },
      data: { count: { increment: 1 } },
    });
    return { allowed: true, remaining: rule.limit - existing.count - 1 };
  } catch (err) {
    // Fail-open: DB hiccup must not block legitimate traffic. We do log
    // so a sustained failure is visible.
    console.error("[rate-limit] db error, failing open:", err);
    return { allowed: true, remaining: rule.limit - 1 };
  }
}

// ── Pre-baked rules — single source of truth for limits across actions.

export const NEWSLETTER_SIGNUP_RULE: RateLimitRule = {
  scope: "newsletter-signup",
  limit: 5,
  windowMs: 60 * 60 * 1000, // 5 signups / hour / IP
};

export const REVIEW_SUBMISSION_RULE: RateLimitRule = {
  scope: "review-submission",
  // Logged-in only, plus the one-review-per-product gate; the IP cap is
  // belt-and-braces for someone juggling burner accounts.
  limit: 10,
  windowMs: 60 * 60 * 1000,
};

export const CART_SNAPSHOT_RULE: RateLimitRule = {
  scope: "cart-snapshot",
  limit: 20,
  windowMs: 60 * 60 * 1000,
};

export const STOCK_NOTIFY_RULE: RateLimitRule = {
  scope: "stock-notify",
  limit: 10,
  windowMs: 60 * 60 * 1000,
};

export const BREVO_WEBHOOK_RULE: RateLimitRule = {
  // Brevo's docs cap their webhook sender; a generous limit keeps us
  // safe from accidental floods without throttling legitimate batches.
  scope: "brevo-webhook",
  limit: 1000,
  windowMs: 60 * 1000, // 1000 events / minute
};

export const KLARNA_WEBHOOK_RULE: RateLimitRule = {
  // Klarna/Kustom retries a push a bounded number of times per order.
  // A generous global ceiling stops an unauthenticated flood from
  // hammering getKlarnaOrder + the order pipeline without throttling
  // legitimate bursts.
  scope: "klarna-webhook",
  limit: 600,
  windowMs: 60 * 1000,
};

export const ORDER_PLACEMENT_RULE: RateLimitRule = {
  scope: "order-placement",
  // 10 orders/hour from one IP is generous for legitimate use (multi-
  // person household, shared office) and tight enough to slow a bot.
  limit: 10,
  windowMs: 60 * 60 * 1000,
};

// ── Auth brute-force / credential-stuffing protection ───────────────
// Two independent buckets per sign-in attempt (both must pass):
//   - per-IP: stops one host spraying many accounts.
//   - per-email: stops a botnet (many IPs) hammering ONE known account
//     — the realistic attack on a known admin address.
// Enforced in lib/auth.ts via a Better Auth `before` hook on the
// sign-in path. Fail-open (DB hiccup) is acceptable: this slows
// humans/naive bots, it is not the only admin control (2FA is enforced
// on the admin surface regardless).

export const LOGIN_IP_RULE: RateLimitRule = {
  scope: "auth-login-ip",
  limit: 20,
  windowMs: 5 * 60 * 1000, // 20 attempts / 5 min / IP
};

export const LOGIN_EMAIL_RULE: RateLimitRule = {
  scope: "auth-login-email",
  // Tight per-account: a legit user needs a handful of tries; 8 in 15
  // min then a cool-down blunts targeted credential stuffing.
  limit: 8,
  windowMs: 15 * 60 * 1000,
};

export const TWO_FACTOR_IP_RULE: RateLimitRule = {
  scope: "auth-2fa-ip",
  // 6-digit TOTP / backup codes — throttle online guessing hard.
  limit: 10,
  windowMs: 5 * 60 * 1000,
};

// ── Per-tenant noisy-neighbour buckets (ADR 0033 Part A1) ───────────
// These run ALONGSIDE the global IP/email buckets above — additive,
// never weakening. The identifier form is `t:<tenantId>:<ip-or-email>`,
// so the bucket is keyed by *(scope, tenantId, source)*: a single IP
// that hammers tenant A is throttled in tenant A's bucket without
// affecting its budget under tenant B, and one tenant being attacked
// can't burn the global IP budget for another tenant on the same row.
//
// Only rules that fire AFTER the host-tenant has been resolved get a
// per-tenant variant: login / 2FA stay global because tenant context
// at that point is ambiguous (auth happens before/independent of the
// org->tenant link). Webhooks (Klarna/Brevo) also stay global — they
// resolve the tenant from the payload, not the request host, and the
// tenant attribution is what the limiter would itself need to gate on.
//
// Per-tenant **connection-pool ceilings** (e.g. pgbouncer pool_size
// per role/database) are deliberately deferred to the hosting build
// (ADR 0029 / ADR 0033 Part A1, "pgbouncer choice"). Add them when
// the trigger thresholds in ADR 0033 Part B are first reviewed —
// premature pooler config is wasted infra today, when there is one
// real tenant.

export async function enforceTenantRateLimit(
  rule: RateLimitRule,
  tenantId: string,
  identifier: string
): Promise<RateLimitResult> {
  // Distinct scope so per-tenant counts don't pollute the global
  // bucket's row + the DB is greppable: `…:tenant` rows belong to A1.
  return enforceRateLimit(
    { ...rule, scope: `${rule.scope}:tenant` },
    `t:${tenantId}:${identifier}`
  );
}
