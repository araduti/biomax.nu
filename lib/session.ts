import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "./auth";

/**
 * Server-side current session. Memoized per request via React.cache so it
 * can be called from layouts, pages, and server actions without refetching.
 */
export const currentSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export const currentUser = cache(async () => {
  const session = await currentSession();
  return session?.user ?? null;
});
