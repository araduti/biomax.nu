import { NextResponse } from "next/server";

/**
 * Liveness probe for Traefik / Docker Compose (Ampliosoft platform §A3).
 *
 * Contract: returns 200 with {"status":"ok"} and MUST NOT touch auth, the
 * database, or any external service — it only proves the Node process is
 * up and serving HTTP. Dependency health is intentionally out of scope so
 * a transient DB blip can't flap the container.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({ status: "ok" }, { status: 200 });
}
