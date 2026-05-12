import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// Better Auth catch-all handler. Schema migrated 2026-05-10.
export const { POST, GET } = toNextJsHandler(auth);
