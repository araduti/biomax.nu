import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { twoFactor } from "better-auth/plugins";
import { prisma } from "./prisma";
import { sendTransactional } from "./email/client";
import { passwordResetEmail } from "./email/templates";
import { ensureAccount as ensureLoyaltyAccount } from "./loyalty/account";

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
    : [process.env.BETTER_AUTH_URL ?? "https://www.biomax.nu"],

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
    cookiePrefix: "biomax",
  },

  // Auto-enroll every new customer into Familjen Biomax with a welcome
  // bonus. Loyalty enrolment is the default, not an opt-in — customers
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

  // 2FA (TOTP + backup codes). Customers can enable it from
  // /konto/sakerhet; admins should consider it mandatory before launch.
  // Sign-in flow: after password validates, if the user has 2FA enabled
  // we issue a short-lived "twoFactorRedirect" cookie and the UI prompts
  // for the code. Backup codes are one-shot.
  plugins: [
    twoFactor({
      issuer: "Biomax",
      backupCodeOptions: {
        amount: 10,
        length: 10,
      },
    }),
  ],
});

export type Auth = typeof auth;
