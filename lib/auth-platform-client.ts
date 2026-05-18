"use client";

import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

/**
 * Client for the platform (Ampliosoft) auth instance — ADR 0031.
 * Talks to /api/platform-auth (separate handler + `korgadm` cookie),
 * NOT the storefront /api/auth. Only loaded on the platform host.
 */
export const platformAuthClient = createAuthClient({
  baseURL:
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.PLATFORM_AUTH_URL ?? "http://admin.localhost:3000",
  basePath: "/api/platform-auth",
  plugins: [twoFactorClient()],
});
