import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { twoFactor } from "better-auth/plugins";
import { prisma } from "./prisma";

/**
 * Platform (Ampliosoft) Better Auth instance — ADR 0031 D3 + the
 * resolved open question: **admin.korg.nu gets its OWN cookie.**
 *
 * Separate from the storefront `auth` (lib/auth.ts):
 *   - distinct `cookiePrefix: "korgadm"` so the platform session
 *     cookie never collides with / is never reachable from the
 *     `biomax`-prefixed storefront or any `*.korg.nu` tenant cookie.
 *   - **no cross-subdomain cookie domain** — host-scoped to the
 *     platform host only. A stolen tenant/storefront session can never
 *     be a platform session and vice versa.
 *   - shares the same Postgres + Prisma adapter (Session/User rows are
 *     just data); authority is gated separately by `requirePlatformAdmin`
 *     (a PlatformAdmin row), so being able to *log in* is necessary but
 *     not sufficient.
 *   - 2FA mandatory on this plane (crown-jewel, cross-tenant).
 *
 * Storefront-only concerns (loyalty auto-enrol, rate-limit hooks) are
 * deliberately omitted here — this instance authenticates operators,
 * not shoppers.
 */

const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

if (!process.env.BETTER_AUTH_SECRET && !isBuildPhase) {
  throw new Error("BETTER_AUTH_SECRET is not set. Check .env.local");
}

const betterAuthSecret =
  process.env.BETTER_AUTH_SECRET ??
  "build-phase-placeholder-not-used-at-runtime";

export const platformAuth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  baseURL:
    process.env.PLATFORM_AUTH_URL ?? "http://admin.localhost:3000",
  secret: betterAuthSecret,

  emailAndPassword: { enabled: true },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7d — shorter than storefront (30d)
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },

  advanced: {
    // Own cookie namespace; host-scoped (no `crossSubDomainCookies`,
    // no wildcard domain) — the decided isolation (ADR 0031).
    cookiePrefix: "korgadm",
  },

  plugins: [
    twoFactor({
      issuer: "Korg Platform",
      backupCodeOptions: { amount: 10, length: 10 },
    }),
  ],
});

export type PlatformAuth = typeof platformAuth;
