/**
 * Web Vitals beacon endpoint. The browser-side reporter posts here whenever
 * a metric finishes (LCP at first interaction, INP at first interaction or
 * page hidden, CLS at page hidden, FCP/TTFB at navigation).
 *
 * The body is small + fixed-shape; we accept a single sample per request.
 * Browsers prefer `navigator.sendBeacon` for these (text/plain content-type,
 * fire-and-forget on unload), so we read the request body manually and parse
 * defensively.
 */
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Disable static optimisation — sendBeacon fires on unload and never wants caching.
export const dynamic = "force-dynamic";

const KNOWN_METRICS = new Set(["LCP", "INP", "CLS", "FCP", "TTFB"]);

type Sample = {
  metric: string;
  value: number;
  sampleId: string;
  route: string;
  navigationType?: string | null;
  connection?: string | null;
  device?: string | null;
};

function isSample(x: unknown): x is Sample {
  if (!x || typeof x !== "object") return false;
  const s = x as Record<string, unknown>;
  return (
    typeof s.metric === "string" &&
    typeof s.value === "number" &&
    Number.isFinite(s.value) &&
    typeof s.sampleId === "string" &&
    typeof s.route === "string"
  );
}

export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    // sendBeacon submits as text/plain; fetch() submits as JSON. Handle both.
    const text = await req.text();
    payload = JSON.parse(text);
  } catch {
    return NextResponse.json({ ok: false, error: "bad-json" }, { status: 400 });
  }
  if (!isSample(payload)) {
    return NextResponse.json({ ok: false, error: "bad-shape" }, { status: 400 });
  }
  if (!KNOWN_METRICS.has(payload.metric)) {
    return NextResponse.json({ ok: false, error: "unknown-metric" }, { status: 400 });
  }

  // Defensive truncation — these are user-agent-controlled strings.
  const route = payload.route.slice(0, 200);
  const navigationType = payload.navigationType?.slice(0, 32) ?? null;
  const connection = payload.connection?.slice(0, 32) ?? null;
  const device = payload.device?.slice(0, 16) ?? null;

  try {
    await prisma.webVital.upsert({
      where: { sampleId: payload.sampleId },
      // Same id from a duplicate beacon → no-op; keeps the table clean
      // without making the client retry-aware.
      update: {},
      create: {
        metric: payload.metric,
        value: payload.value,
        sampleId: payload.sampleId,
        route,
        navigationType,
        connection,
        device,
      },
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    // Don't leak DB error shape to the client — just record it.
    console.error("[web-vitals] persist failed:", err);
    return NextResponse.json({ ok: false, error: "persist-failed" }, { status: 500 });
  }
}
