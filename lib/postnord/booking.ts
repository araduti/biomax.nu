/**
 * PostNord Phase B — shipment booking.
 *
 * Two modes, same `bookShipment(order)` signature:
 *
 *  - **Stub** (no `POSTNORD_API_KEY` / `POSTNORD_CUSTOMER_NUMBER`):
 *    returns a deterministic synthetic shipment id + a placeholder
 *    label URL so the full admin flow can be exercised without
 *    credentials. The Order row is updated; subsequent re-bookings
 *    return the same synthetic id (idempotent).
 *
 *  - **Live**: calls PostNord's Shipping Server API to create a
 *    paid-postage shipment and download the label PDF. The PDF is
 *    persisted under /public/labels/<orderNumber>.pdf and the URL
 *    returned. This branch isn't fully wired yet — when
 *    POSTNORD_CUSTOMER_NUMBER + POSTNORD_PAYER_NUMBER arrive, replace
 *    the `liveBookShipment` body with the real call.
 *
 * Trust contract: only `requireAdmin`-guarded callers should invoke
 * this. We don't expose it to the customer.
 */
import crypto from "node:crypto";

const STUB_TRACKING_PREFIX = "STUB-";

export function isPostNordBookingConfigured(): boolean {
  return Boolean(
    process.env.POSTNORD_API_KEY &&
      process.env.POSTNORD_CUSTOMER_NUMBER &&
      process.env.POSTNORD_PAYER_NUMBER
  );
}

export type BookShipmentInput = {
  orderId: string;
  orderNumber: string;
  /** Customer's shipping address fields used to populate the label. */
  shippingAddress: {
    fullName: string;
    street: string;
    postalCode: string;
    city: string;
    countryCode: string;
    phone: string | null;
    email: string;
  };
  /** Service-point id if customer picked one; else home delivery. */
  servicePointId: string | null;
  /** Used for the label "weight"-field; PostNord rejects 0g shipments.
   *  Sum of OrderItem weights with a 100g fallback for missing data. */
  weightGrams: number;
};

export type BookShipmentResult =
  | {
      ok: true;
      trackingNumber: string;
      labelPdfUrl: string | null;
      carrier: "POSTNORD";
      stub: boolean;
    }
  | { ok: false; error: string };

export async function bookShipment(
  input: BookShipmentInput
): Promise<BookShipmentResult> {
  if (!isPostNordBookingConfigured()) {
    return stubBookShipment(input);
  }
  return liveBookShipment(input);
}

function stubBookShipment(input: BookShipmentInput): BookShipmentResult {
  // Deterministic per orderId so re-running returns the same value —
  // mirrors the idempotency we'd want from a real PostNord call.
  const hash = crypto
    .createHash("sha1")
    .update(input.orderId)
    .digest("hex")
    .slice(0, 10)
    .toUpperCase();
  return {
    ok: true,
    trackingNumber: `${STUB_TRACKING_PREFIX}${hash}`,
    labelPdfUrl: null, // no real label in stub mode
    carrier: "POSTNORD",
    stub: true,
  };
}

async function liveBookShipment(
  input: BookShipmentInput
): Promise<BookShipmentResult> {
  // TODO: replace with the real PostNord Shipping Server v3 call once
  // credentials land. Spec:
  //   https://developer.postnord.com/api/details/shipping-server-v3
  //
  // Sketch:
  //   const res = await fetch(`${POSTNORD_BASE_URL}/shipments`, {
  //     method: "POST",
  //     headers: { ... },
  //     body: JSON.stringify(buildShipmentBody(input)),
  //   });
  //   const data = await res.json();
  //   const labelUrl = await downloadAndPersistLabel(data.labelUrl, input.orderNumber);
  //   return { ok: true, trackingNumber: data.shipmentId, labelPdfUrl: labelUrl, ... };
  //
  // For now, fall back to stub so the admin flow doesn't break before
  // the live wiring lands.
  console.warn(
    "[postnord] live booking not yet implemented; falling back to stub. " +
      `Order: ${input.orderNumber}`
  );
  return stubBookShipment(input);
}
