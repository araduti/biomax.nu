/**
 * Cron-route authorization — single source of truth.
 *
 * Every `/app/api/cron/*` route GET handler should call `cronAuthorized(req)`
 * and 401 on false. When `CRON_SECRET` is unset (typical local dev), we
 * allow any request from localhost/127.0.0.1 so developers can hit the
 * route from a browser tab without configuring env. In any other env,
 * absence of the secret means lock down — fail closed.
 */
export function cronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    const host = req.headers.get("host") ?? "";
    return host.startsWith("localhost") || host.startsWith("127.0.0.1");
  }
  return req.headers.get("authorization") === `Bearer ${secret}`;
}
