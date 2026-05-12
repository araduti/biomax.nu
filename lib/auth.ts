import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { sendTransactional } from "./email/client";
import { passwordResetEmail } from "./email/templates";

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET is not set. Check .env.local");
}

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
  secret: process.env.BETTER_AUTH_SECRET,

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
      ]
    : [process.env.BETTER_AUTH_URL ?? "https://www.biomax.nu"],

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    autoSignIn: true,
    // Email verification will flip to true in Phase 3D when Postmark is wired.
    requireEmailVerification: false,
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
    cookiePrefix: "biomax",
  },
});

export type Auth = typeof auth;
