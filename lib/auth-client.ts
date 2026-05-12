"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Client-side Better Auth helpers (signIn, signUp, signOut, useSession).
 * Uses the same baseURL the server is configured with.
 */
export const authClient = createAuthClient({
  baseURL:
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
