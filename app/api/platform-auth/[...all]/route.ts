import { platformAuth } from "@/lib/auth-platform";
import { toNextJsHandler } from "better-auth/next-js";

// Platform (Ampliosoft) auth handler — separate instance + cookie
// from the storefront /api/auth (ADR 0031). Served on admin.korg.nu.
export const { POST, GET } = toNextJsHandler(platformAuth);
