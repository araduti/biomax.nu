import type {
  KlarnaCreateOrderPayload,
  KlarnaOrder,
} from "./types";

/**
 * Klarna Checkout v3 API client.
 *
 * Two modes:
 *  - **Real**: when `KLARNA_USERNAME` + `KLARNA_PASSWORD` are set in env.
 *    Hits the configured `KLARNA_API_URL` (defaults to playground).
 *  - **Stub**: when creds are missing. Returns a fake order with a marker
 *    HTML snippet so the checkout flow works end-to-end during scaffolding
 *    (Phase 3C). Flip to real by setting the env vars in `.env.local`.
 *
 * The boundary between modes is a single function — `isKlarnaConfigured()`.
 * Call sites don't need to know which mode they're in.
 */

// ADR 0020: prefer the Kustom test-ground creds; fall back to the
// legacy Klarna Checkout v3 vars so pre-Kustom setups keep working.
// The boundary stays a single function (`isKlarnaConfigured()`) — call
// sites don't care which credential set is in play.
/**
 * Resolve the API base URL.
 *
 * Footgun guard (ADR 0020): the legacy Klarna host (`api.klarna.com`)
 * does NOT run the Kustom Shipping Assistant. If Kustom creds are set
 * we must talk to a Kustom host — never silently fall back to a Klarna
 * host, which produces a working checkout with NO PostNord/KSA options
 * and a "still using Klarna endpoints" warning in the portal. So when
 * Kustom creds are present, KUSTOM_API_URL is required and must be a
 * kustom.co host; we fail loudly instead of degrading silently.
 */
function resolveBaseUrl(): string {
  const usingKustom = Boolean(process.env.KUSTOM_API_KEY_ID);
  if (usingKustom) {
    const url = process.env.KUSTOM_API_URL;
    if (!url) {
      throw new Error(
        "KUSTOM_API_KEY_ID is set but KUSTOM_API_URL is not. Set it to " +
          "the Kustom host (playground: https://api.playground.kustom.co, " +
          "production: https://api.kustom.co) — the Klarna host does not " +
          "run Kustom Shipping Assistant."
      );
    }
    if (/klarna\.com/i.test(url)) {
      throw new Error(
        `KUSTOM_API_URL points at a Klarna host (${url}). Kustom ` +
          "Shipping Assistant only runs on api(.playground).kustom.co."
      );
    }
    return url;
  }
  return (
    process.env.KLARNA_API_URL ?? "https://api.playground.klarna.com"
  );
}

function credentials(): { user: string; pass: string } {
  const user = process.env.KUSTOM_API_KEY_ID ?? process.env.KLARNA_USERNAME;
  const pass = process.env.KUSTOM_API_PASSWORD ?? process.env.KLARNA_PASSWORD;
  return { user: user ?? "", pass: pass ?? "" };
}

export function isKlarnaConfigured(): boolean {
  const { user, pass } = credentials();
  return Boolean(user && pass);
}

function authHeader(): string {
  const { user, pass } = credentials();
  return `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
}

/**
 * Create a Klarna order. Returns the order with `html_snippet` to render
 * in our checkout page.
 */
export async function createKlarnaOrder(
  payload: KlarnaCreateOrderPayload
): Promise<KlarnaOrder> {
  if (!isKlarnaConfigured()) return createStubOrder(payload);

  const res = await fetch(`${resolveBaseUrl()}/checkout/v3/orders`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Klarna createOrder failed: ${res.status} ${body}`);
  }
  return (await res.json()) as KlarnaOrder;
}

/**
 * Update an existing, still-incomplete Kustom order in place (the
 * suspend → update → resume flow). POST /checkout/v3/orders/{id} with
 * the recomputed payload; Kustom recomputes totals and the snippet
 * refreshes on resume. Stub mode → no-op. Only valid while the order
 * is checkout_incomplete (Kustom 4xx's otherwise — surfaced to the
 * caller, which resumes the iframe regardless).
 */
export async function updateKustomOrder(
  orderId: string,
  payload: KlarnaCreateOrderPayload
): Promise<void> {
  if (!isKlarnaConfigured()) return;
  const res = await fetch(
    `${resolveBaseUrl()}/checkout/v3/orders/${encodeURIComponent(orderId)}`,
    {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    }
  );
  if (!res.ok && res.status !== 204) {
    const body = await res.text();
    throw new Error(`Kustom updateOrder failed: ${res.status} ${body}`);
  }
}

/**
 * Fetch a Klarna order by ID. Used by the confirmation page after the
 * customer is redirected back from Klarna with the order_id in the URL.
 */
export async function getKlarnaOrder(orderId: string): Promise<KlarnaOrder> {
  if (!isKlarnaConfigured()) {
    throw new Error(
      "getKlarnaOrder called in stub mode — confirmation flow uses our own DB."
    );
  }
  const res = await fetch(
    `${resolveBaseUrl()}/checkout/v3/orders/${encodeURIComponent(orderId)}`,
    { headers: { Authorization: authHeader(), Accept: "application/json" } }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Klarna getOrder failed: ${res.status} ${body}`);
  }
  return (await res.json()) as KlarnaOrder;
}

/**
 * Acknowledge an order — tells Klarna we've successfully recorded it.
 * Called after we've created our internal Order record.
 */
export async function acknowledgeKlarnaOrder(orderId: string): Promise<void> {
  if (!isKlarnaConfigured()) return;
  const res = await fetch(
    `${resolveBaseUrl()}/ordermanagement/v1/orders/${encodeURIComponent(orderId)}/acknowledge`,
    { method: "POST", headers: { Authorization: authHeader() } }
  );
  if (!res.ok && res.status !== 204) {
    const body = await res.text();
    throw new Error(`Klarna acknowledge failed: ${res.status} ${body}`);
  }
}

/**
 * Read the order from the Order Management API (distinct from the
 * checkout read used by getKlarnaOrder). Returns the capture state so
 * callers can make capture idempotent. Casing varies across Klarna /
 * Kustom — read defensively and normalise status to upper-case.
 */
export type KustomOmOrder = {
  status: string; // AUTHORIZED | CAPTURED | PART_CAPTURED | CANCELLED | EXPIRED …
  order_amount: number; // öre
  captured_amount: number; // öre
  remaining_authorized_amount: number; // öre
};

export async function getKustomOmOrder(
  orderId: string
): Promise<KustomOmOrder> {
  const res = await fetch(
    `${resolveBaseUrl()}/ordermanagement/v1/orders/${encodeURIComponent(orderId)}`,
    { headers: { Authorization: authHeader(), Accept: "application/json" } }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Kustom OM read failed: ${res.status} ${body}`);
  }
  const j = (await res.json()) as Record<string, unknown>;
  return {
    status: String(j.status ?? "").toUpperCase(),
    order_amount: Number(j.order_amount ?? 0),
    captured_amount: Number(j.captured_amount ?? 0),
    remaining_authorized_amount: Number(
      j.remaining_authorized_amount ?? 0
    ),
  };
}

/**
 * Capture (charge) an authorised order — ADR: capture-at-ship.
 *
 * Idempotent: first reads the OM order; if it's already fully captured
 * (or cancelled/expired) we DON'T issue a second capture (Klarna
 * captures are not idempotent — a duplicate POST double-charges). The
 * caller still treats a no-op as success so the ship step proceeds.
 *
 * Returns `{ ok, alreadyCaptured }` or throws on a hard API failure so
 * the caller can refuse to mark the order shipped.
 */
export async function captureKlarnaOrder(
  orderId: string,
  capturedAmountOre: number
): Promise<{ ok: true; alreadyCaptured: boolean }> {
  if (!isKlarnaConfigured()) {
    // Stub mode: nothing to charge. Treat as a successful no-op.
    return { ok: true, alreadyCaptured: true };
  }

  const om = await getKustomOmOrder(orderId);
  if (om.status === "CANCELLED" || om.status === "EXPIRED") {
    const sv = om.status === "CANCELLED" ? "annullerad" : "utgången";
    throw new Error(
      `Kan inte debitera betalningen: Kustom-ordern är ${sv}.`
    );
  }
  if (
    om.status === "CAPTURED" ||
    (om.captured_amount > 0 &&
      om.captured_amount >= capturedAmountOre)
  ) {
    return { ok: true, alreadyCaptured: true };
  }

  const res = await fetch(
    `${resolveBaseUrl()}/ordermanagement/v1/orders/${encodeURIComponent(orderId)}/captures`,
    {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ captured_amount: capturedAmountOre }),
      cache: "no-store",
    }
  );
  if (!res.ok && res.status !== 201 && res.status !== 204) {
    const body = await res.text();
    throw new Error(`Kustom capture failed: ${res.status} ${body}`);
  }
  return { ok: true, alreadyCaptured: false };
}

/**
 * Cancel (release) an authorised-but-not-captured order. Valid only
 * pre-capture — releases the customer's reserved funds, no money moved.
 * Idempotent: already CANCELLED → no-op; if anything is captured we
 * throw so the caller refunds instead of silently doing nothing.
 */
export async function cancelKlarnaOrder(
  orderId: string
): Promise<{ ok: true; noop: boolean }> {
  if (!isKlarnaConfigured()) return { ok: true, noop: true };

  const om = await getKustomOmOrder(orderId);
  if (om.status === "CANCELLED" || om.status === "EXPIRED") {
    return { ok: true, noop: true };
  }
  if (om.captured_amount > 0) {
    throw new Error(
      "Ordern är redan debiterad — använd återbetalning i stället för att annullera."
    );
  }
  const res = await fetch(
    `${resolveBaseUrl()}/ordermanagement/v1/orders/${encodeURIComponent(orderId)}/cancel`,
    {
      method: "POST",
      headers: { Authorization: authHeader() },
      cache: "no-store",
    }
  );
  if (!res.ok && res.status !== 204) {
    const body = await res.text();
    throw new Error(`Kustom cancel failed: ${res.status} ${body}`);
  }
  return { ok: true, noop: false };
}

/**
 * Refund a captured order. Only valid post-capture. Refunds up to the
 * captured amount. Callers gate this behind the terminal REFUNDED
 * status transition so it can't be triggered twice for one order.
 */
export async function refundKlarnaOrder(
  orderId: string,
  refundAmountOre: number
): Promise<{ ok: true; noop: boolean }> {
  if (!isKlarnaConfigured()) return { ok: true, noop: true };

  const om = await getKustomOmOrder(orderId);
  if (om.captured_amount <= 0) {
    throw new Error(
      "Inget belopp är debiterat — annullera ordern i stället för att återbetala."
    );
  }
  const amount = Math.min(refundAmountOre, om.captured_amount);
  const res = await fetch(
    `${resolveBaseUrl()}/ordermanagement/v1/orders/${encodeURIComponent(orderId)}/refunds`,
    {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refunded_amount: amount }),
      cache: "no-store",
    }
  );
  if (!res.ok && res.status !== 201 && res.status !== 204) {
    const body = await res.text();
    throw new Error(`Kustom refund failed: ${res.status} ${body}`);
  }
  return { ok: true, noop: false };
}

// ─────────────────────────────────────────── stub mode ───
function createStubOrder(payload: KlarnaCreateOrderPayload): KlarnaOrder {
  const order_id = `stub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    ...payload,
    order_id,
    status: "checkout_incomplete",
    html_snippet: STUB_HTML_SNIPPET,
  };
}

const STUB_HTML_SNIPPET = `
<div data-klarna-stub="true" style="
  border: 2px dashed #7A8B6F;
  border-radius: 12px;
  padding: 24px;
  background: #F4F0E8;
  font-family: ui-sans-serif, system-ui, sans-serif;
">
  <p style="margin: 0 0 8px; font-weight: 600; color: #1E3A5F; letter-spacing: 0.18em; text-transform: uppercase; font-size: 11px;">
    Klarna sandbox — ej konfigurerad
  </p>
  <p style="margin: 0; color: #525860; font-size: 14px; line-height: 1.6;">
    När KLARNA_USERNAME och KLARNA_PASSWORD är satta i .env.local renderas
    Klarnas riktiga checkout-iframe här istället. Använd "Slutför testorder"
    nedan för att skapa en stub-order under utvecklingen.
  </p>
</div>
`;
