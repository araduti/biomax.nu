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

const KLARNA_API_URL =
  process.env.KLARNA_API_URL ?? "https://api.playground.klarna.com";

export function isKlarnaConfigured(): boolean {
  return Boolean(process.env.KLARNA_USERNAME && process.env.KLARNA_PASSWORD);
}

function authHeader(): string {
  const u = process.env.KLARNA_USERNAME ?? "";
  const p = process.env.KLARNA_PASSWORD ?? "";
  return `Basic ${Buffer.from(`${u}:${p}`).toString("base64")}`;
}

/**
 * Create a Klarna order. Returns the order with `html_snippet` to render
 * in our checkout page.
 */
export async function createKlarnaOrder(
  payload: KlarnaCreateOrderPayload
): Promise<KlarnaOrder> {
  if (!isKlarnaConfigured()) return createStubOrder(payload);

  const res = await fetch(`${KLARNA_API_URL}/checkout/v3/orders`, {
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
    `${KLARNA_API_URL}/checkout/v3/orders/${encodeURIComponent(orderId)}`,
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
    `${KLARNA_API_URL}/ordermanagement/v1/orders/${encodeURIComponent(orderId)}/acknowledge`,
    { method: "POST", headers: { Authorization: authHeader() } }
  );
  if (!res.ok && res.status !== 204) {
    const body = await res.text();
    throw new Error(`Klarna acknowledge failed: ${res.status} ${body}`);
  }
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
