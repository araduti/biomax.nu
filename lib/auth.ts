import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { twoFactor, organization } from "better-auth/plugins";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { prisma } from "./prisma";
import { sendTransactional } from "./email/client";
import { passwordResetEmail } from "./email/templates";
import { ensureAccount as ensureLoyaltyAccount } from "./loyalty/account";
import {
  enforceRateLimit,
  LOGIN_IP_RULE,
  LOGIN_EMAIL_RULE,
  TWO_FACTOR_IP_RULE,
} from "./security/rate-limit";

/** Best-effort client IP from the Better Auth request headers. */
function ipFromHeaders(h: Headers | undefined): string {
  const xff = h?.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim().slice(0, 64);
  const real = h?.get("x-real-ip");
  if (real) return real.slice(0, 64);
  return "dev-local";
}

const TOO_MANY = (retryAfterSeconds: number) =>
  new APIError("TOO_MANY_REQUESTS", {
    message:
      "För många försök. Vänta en stund och försök igen.",
    // surfaces as Retry-After on the 429
    retryAfter: retryAfterSeconds,
  });

// `next build` evaluates this module while collecting page data for
// /api/auth/[...all]. CI has no .env.local, so a hard throw at import
// time breaks the production build (and the Lighthouse workflow) even
// though the secret is only ever *used* at request time. Fail closed
// at runtime in production, but tolerate the build phase with a
// deterministic placeholder so static collection can proceed.
const isBuildPhase =
  process.env.NEXT_PHASE === "phase-production-build";

if (!process.env.BETTER_AUTH_SECRET && !isBuildPhase) {
  throw new Error("BETTER_AUTH_SECRET is not set. Check .env.local");
}

const betterAuthSecret =
  process.env.BETTER_AUTH_SECRET ??
  "build-phase-placeholder-not-used-at-runtime";

/**
 * Server-side Better Auth instance.
 *
 * Used by:
 *   - app/api/auth/[...all]/route.ts  (HTTP handler)
 *   - server actions, server components (auth.api.* methods)
 *
 * Per ADR 0003 we own the full auth stack — passwords are stored in the
 * Account table (Argon2id by default), sessions in Session, no third-party
 * SaaS handles user data.
 *
 * Per ADR 0008 the 2,778 imported customers have no passwords; they reset
 * via "forgot password" on first login and the Account record is created
 * at that point.
 */
const isDev = process.env.NODE_ENV !== "production";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3001",
  secret: betterAuthSecret,

  // Per Better Auth docs: trustedOrigins is a string[] with wildcard support
  // (`*`, `?` via wildcardMatch on the origin). In dev we list localhost + a
  // wildcard for any host on the dev ports — that covers LAN access from
  // your laptop or another device on the same network. Production stays
  // locked to the canonical URL.
  trustedOrigins: isDev
    ? [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://*:3001",
        "http://*:3002",
        // HTTPS dev tunnel (same one Kustom is pointed at) so auth
        // works when browsing via ngrok to test the Kustom flow.
        ...(() => {
          try {
            const h = process.env.KUSTOM_MERCHANT_BASE_URL;
            return h ? [new URL(h).origin] : [];
          } catch {
            return [];
          }
        })(),
      ]
    // #22.2 / #16 audit: no hardcoded tenant URL. BETTER_AUTH_URL is
    // required in production (no fallback). biomax.nu sets it to
    // https://www.biomax.nu in deploy env. The kine extraction will
    // resolve this per-tenant at @kine/auth construction time.
    : [
        process.env.BETTER_AUTH_URL ??
          (() => {
            throw new Error(
              "BETTER_AUTH_URL is not set. Required in production — see lib/auth.ts (#22.2)."
            );
          })(),
      ],

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    autoSignIn: true,
    // Email verification will flip to true in Phase 3D when Postmark is wired.
    requireEmailVerification: false,
    // Account-takeover containment: a password RESET (forgot-password
    // flow) revokes every existing session for that user. Without this
    // a stolen 30-day session token survives the victim resetting their
    // password. (The authenticated change-password path already passes
    // revokeOtherSessions:true — see password-change-form.tsx.)
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      // Phase 3D will replace this with a Postmark transactional email.
      // For now (dev), log the link prominently so it's easy to grab from
      // the terminal where `npm run dev` is running.
      console.log(
        "\n────────────────────────────────────────────────────────────\n" +
          ` PASSWORD RESET — ${user.email}\n` +
          ` ${url}\n` +
          "────────────────────────────────────────────────────────────\n"
      );
    },
  },

  user: {
    additionalFields: {
      firstName: { type: "string", required: false, input: true },
      lastName: { type: "string", required: false, input: true },
      role: { type: "string", required: false, input: false, defaultValue: "customer" },
      locale: { type: "string", required: false, input: false, defaultValue: "sv-SE" },
      phone: { type: "string", required: false, input: true },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh every day
    cookieCache: { enabled: true, maxAge: 60 * 5 }, // 5-minute cookie cache
  },

  advanced: {
    // #22.2 / #16 audit: cookie prefix is env-driven, not hardcoded.
    // biomax.nu sets AUTH_COOKIE_PREFIX=biomax to preserve existing
    // session cookies; changing this invalidates every logged-in user.
    // In the extracted kine repo this becomes per-deploy (storefront
    // plane uses "kinesf" / platform plane uses "kineadm" per ADR 0031).
    cookiePrefix: process.env.AUTH_COOKIE_PREFIX ?? "kinesf",
  },

  // Brute-force / credential-stuffing throttle on the auth paths
  // (Better Auth's default limiter is a coarse per-path counter, not a
  // per-account one). Two independent DB-backed buckets on sign-in —
  // per-IP and per-email — plus a per-IP cap on 2FA code verification.
  // Fail-open on a DB hiccup (the limiter itself logs); admin access is
  // still 2FA-gated regardless (see lib/admin/guard.ts).
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      const path = ctx.path;

      if (path === "/sign-in/email") {
        const ip = ipFromHeaders(ctx.headers);
        const email =
          typeof ctx.body?.email === "string"
            ? ctx.body.email.toLowerCase().slice(0, 128)
            : "unknown";

        const [byIp, byEmail] = await Promise.all([
          enforceRateLimit(LOGIN_IP_RULE, ip),
          enforceRateLimit(LOGIN_EMAIL_RULE, email),
        ]);
        if (!byIp.allowed) throw TOO_MANY(byIp.retryAfterSeconds);
        if (!byEmail.allowed) throw TOO_MANY(byEmail.retryAfterSeconds);
        return;
      }

      if (path.startsWith("/two-factor/")) {
        const ip = ipFromHeaders(ctx.headers);
        const r = await enforceRateLimit(TWO_FACTOR_IP_RULE, ip);
        if (!r.allowed) throw TOO_MANY(r.retryAfterSeconds);
      }
    }),
  },

  // Auto-enroll every new customer into the tenant's loyalty program
  // with a welcome bonus. Loyalty enrolment is the default, not an opt-in — customers
  // who never want to use points just ignore the balance. Better Auth
  // fires `user.create.after` immediately after the user row is committed,
  // so the loyalty account creation is in a follow-up transaction. If it
  // throws we swallow the error rather than aborting signup; the account
  // creates lazily on first `/konto` visit instead.
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            await ensureLoyaltyAccount(user.id);
          } catch (err) {
            console.error("[loyalty] auto-enroll failed for", user.id, err);
          }
        },
      },
    },
  },

  // 2FA (TOTP + backup codes). Optional for customers (/konto/sakerhet);
  // MANDATORY for admins — enforced in lib/admin/guard.ts (an admin
  // without 2FA is bounced to enrol before any /admin access).
  // Sign-in flow: after password validates, if the user has 2FA enabled
  // we issue a short-lived "twoFactorRedirect" cookie and the UI prompts
  // for the code. Backup codes are one-shot.
  plugins: [
    twoFactor({
      // #22.2 / #16 audit: TOTP issuer (the label shown in authenticator
      // apps like Google Authenticator / 1Password) is env-driven, not
      // hardcoded. biomax.nu sets AUTH_TOTP_ISSUER=Biomax. In the
      // extracted kine repo this becomes per-tenant — the tenant's
      // brand name from @kine/tenancy.
      issuer: process.env.AUTH_TOTP_ISSUER ?? "Kine",
      backupCodeOptions: {
        amount: 10,
        length: 10,
      },
    }),
    // Kine tenant plane (ADR 0031 D2): Organization 1:1 Tenant. The
    // session's active organization → Tenant (Watchtower pattern;
    // wired into resolution in the tenantId+RLS sub-slice). Org
    // deletion is disabled — tenant lifecycle is a platform action
    // (ADR 0031 D6), not a self-serve org delete. Invitation email
    // delivery is added with the merchant-staff UI later.
    organization({
      disableOrganizationDeletion: true,
    }),
  ],
});

export type Auth = typeof auth;
