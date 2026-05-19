import type {
  KlarnaCreateOrderPayload,
  KlarnaOrder,
} from "./types";
import {
  envCredentials,
  type ResolvedPaymentCredentials,
} from "./credentials";

/**
 * Kustom (formerly Klarna) Checkout v3 API client.
 *
 * Two modes:
 *  - **Real**: credentials present (per-tenant store, ADR 0034, or the
 *    env fallback for tenant zero). Hits the resolved API host.
 *  - **Stub**: creds missing → a fake order with a marker HTML snippet
 *    so the checkout flow works end-to-end during scaffolding. Flip to
 *    real by onboarding a tenant credential or setting the env vars.
 *
 * The mode boundary is a single predicate — `isKlarnaConfigured()` —
 * unchanged from the ADR 0009 contract; call sites don't care which
 * mode they're in.
 *
 * Per-tenant credentials (ADR 0034): every exported call takes an
 * optional resolved-credentials object. Omitted ⇒ `envCredentials()`
 * (single-tenant behaviour, byte-for-byte). Callers with a tenant
 * context (checkout, the push webhook) resolve per-tenant creds via
 * `lib/klarna/credentials.ts` and pass them in. The ADR 0020 footgun
 * guard now lives on the resolved `baseUrl` (env path) in that module.
 */

export function isKlarnaConfigured(
  creds: ResolvedPaymentCredentials = envCredentials()
): boolean {
  return creds.configured;
}

function authHeader(creds: ResolvedPaymentCredentials): string {
  return `Basic ${Buffer.from(
    `${creds.apiKeyId}:${creds.apiSecret}`
  ).toString("base64")}`;
}

/**
 * Create a Klarna order. Returns the order with `html_snippet` to render
 * in our checkout page.
 */
export async function createKlarnaOrder(
  payload: KlarnaCreateOrderPayload,
  creds: ResolvedPaymentCredentials = envCredentials()
): Promise<KlarnaOrder> {
  if (!isKlarnaConfigured(creds)) return createStubOrder(payload);

  const res = await fetch(`${creds.baseUrl}/checkout/v3/orders`, {
    method: "POST",
    headers: {
      Authorization: authHeader(creds),
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
  payload: KlarnaCreateOrderPayload,
  creds: ResolvedPaymentCredentials = envCredentials()
): Promise<void> {
  if (!isKlarnaConfigured(creds)) return;
  const res = await fetch(
    `${creds.baseUrl}/checkout/v3/orders/${encodeURIComponent(orderId)}`,
    {
      method: "POST",
      headers: {
        Authorization: authHeader(creds),
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
export async function getKlarnaOrder(
  orderId: string,
  creds: ResolvedPaymentCredentials = envCredentials()
): Promise<KlarnaOrder> {
  if (!isKlarnaConfigured(creds)) {
    throw new Error(
      "getKlarnaOrder called in stub mode — confirmation flow uses our own DB."
    );
  }
  const res = await fetch(
    `${creds.baseUrl}/checkout/v3/orders/${encodeURIComponent(orderId)}`,
    {
      headers: {
        Authorization: authHeader(creds),
        Accept: "application/json",
      },
    }
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
export async function acknowledgeKlarnaOrder(
  orderId: string,
  creds: ResolvedPaymentCredentials = envCredentials()
): Promise<void> {
  if (!isKlarnaConfigured(creds)) return;
  const res = await fetch(
    `${creds.baseUrl}/ordermanagement/v1/orders/${encodeURIComponent(orderId)}/acknowledge`,
    { method: "POST", headers: { Authorization: authHeader(creds) } }
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
  orderId: string,
  creds: ResolvedPaymentCredentials = envCredentials()
): Promise<KustomOmOrder> {
  const res = await fetch(
    `${creds.baseUrl}/ordermanagement/v1/orders/${encodeURIComponent(orderId)}`,
    {
      headers: {
        Authorization: authHeader(creds),
        Accept: "application/json",
      },
    }
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
  capturedAmountOre: number,
  creds: ResolvedPaymentCredentials = envCredentials()
): Promise<{ ok: true; alreadyCaptured: boolean }> {
  if (!isKlarnaConfigured(creds)) {
    // Stub mode: nothing to charge. Treat as a successful no-op.
    return { ok: true, alreadyCaptured: true };
  }

  const om = await getKustomOmOrder(orderId, creds);
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
    `${creds.baseUrl}/ordermanagement/v1/orders/${encodeURIComponent(orderId)}/captures`,
    {
      method: "POST",
      headers: {
        Authorization: authHeader(creds),
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
  orderId: string,
  creds: ResolvedPaymentCredentials = envCredentials()
): Promise<{ ok: true; noop: boolean }> {
  if (!isKlarnaConfigured(creds)) return { ok: true, noop: true };

  const om = await getKustomOmOrder(orderId, creds);
  if (om.status === "CANCELLED" || om.status === "EXPIRED") {
    return { ok: true, noop: true };
  }
  if (om.captured_amount > 0) {
    throw new Error(
      "Ordern är redan debiterad — använd återbetalning i stället för att annullera."
    );
  }
  const res = await fetch(
    `${creds.baseUrl}/ordermanagement/v1/orders/${encodeURIComponent(orderId)}/cancel`,
    {
      method: "POST",
      headers: { Authorization: authHeader(creds) },
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
  refundAmountOre: number,
  creds: ResolvedPaymentCredentials = envCredentials()
): Promise<{ ok: true; noop: boolean }> {
  if (!isKlarnaConfigured(creds)) return { ok: true, noop: true };

  const om = await getKustomOmOrder(orderId, creds);
  if (om.captured_amount <= 0) {
    throw new Error(
      "Inget belopp är debiterat — annullera ordern i stället för att återbetala."
    );
  }
  const amount = Math.min(refundAmountOre, om.captured_amount);
  const res = await fetch(
    `${creds.baseUrl}/ordermanagement/v1/orders/${encodeURIComponent(orderId)}/refunds`,
    {
      method: "POST",
      headers: {
        Authorization: authHeader(creds),
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
