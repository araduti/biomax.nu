"use client";

import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

/**
 * Client-side Better Auth helpers (signIn, signUp, signOut, useSession).
 * Uses the same baseURL the server is configured with.
 *
 * Two-factor plugin wired so `authClient.twoFactor.enable()` /
 * `verifyTotp()` / `disable()` are available from the security panel
 * at /konto/sakerhet and from the sign-in 2FA challenge view.
 */
export const authClient = createAuthClient({
  baseURL:
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  plugins: [twoFactorClient()],
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
