/**
 * Service-points lookup. Keeps the PostNord API key server-side; the
 * browser only sees normalised JSON. Used by `<ServicePointPicker>` in
 * checkout, but also safe to call from anywhere — there's no auth
 * required because the underlying data is public.
 */
import { NextResponse } from "next/server";
import { findServicePoints } from "@/lib/postnord/service-points";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const postalCode = url.searchParams.get("postalCode") ?? "";
  const limit = Number(url.searchParams.get("limit") ?? "5");

  const result = await findServicePoints({ postalCode, limit });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }
  return NextResponse.json(result, {
    headers: {
      // Match the upstream cache window. Identical postcodes return the
      // same five ombud for the same day; no point hammering PostNord.
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=60",
    },
  });
}
