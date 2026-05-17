/**
 * PostNord Phase B — shipment booking.
 *
 * Two modes, same `bookShipment(order)` signature:
 *
 *  - **Stub** (booking creds absent): returns a deterministic synthetic
 *    shipment id + no label so the full admin flow can be exercised
 *    without credentials. Idempotent per orderId.
 *
 *  - **Live**: calls PostNord's REST Shipment v3 API to create a
 *    paid-postage parcel and pull the label PDF. The PDF is persisted
 *    under `public/labels/<orderNumber>.pdf` and that public path is
 *    returned for the admin "Skriv ut etikett" button.
 *
 * Auth + gateway: the same `api2.postnord.com` gateway and `?apikey=`
 * query-param auth as the Business Location (service-point) API we
 * already use — one developer key, two products. Booking additionally
 * needs the shipping-agreement numbers (`POSTNORD_CUSTOMER_NUMBER`,
 * `POSTNORD_PAYER_NUMBER`) because creating a parcel is a billable act
 * tied to a real PostNord contract.
 *
 * ⚠️ Agreement-specific knobs: PostNord parcel `serviceCode`s and
 * `additionalServices` vary per customer contract. The constants in
 * SERVICE are PostNord's standard B2C codes (MyPack Collect / MyPack
 * Home) but MUST be confirmed against your onboarding packet during the
 * test-environment dry run before taking real orders. Everything else
 * (envelope, auth, parsing, label persistence) is contract-independent.
 *
 * Spec: https://developer.postnord.com/api/details/shipping-server-v3
 *
 * Trust contract: only `requireAdmin`-guarded callers invoke this.
 */
import crypto from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const STUB_TRACKING_PREFIX = "STUB-";

/**
 * Shipment v3 endpoint. Production default; override with the test
 * gateway during the dry-run (`atapi2.postnord.com` — same path, no
 * real postage charged, agreement-linked test creds required).
 */
const SHIPMENT_BASE_URL =
  process.env.POSTNORD_SHIPMENT_BASE_URL ??
  "https://api2.postnord.com/rest/shipment/v3/edi";

/**
 * PostNord standard B2C parcel service codes. AGREEMENT-DEPENDENT —
 * verify against your PostNord onboarding before live traffic.
 *   - 19  MyPack Collect  → delivery to a service point (ombud)
 *   - 18  MyPack Home Small → delivery to the recipient's address
 * `agentService` is the additional-service code that carries the
 * chosen service-point id on a Collect shipment.
 */
const SERVICE = {
  servicePoint: "19",
  home: "18",
  agentService: "A7", // "Utlämningsställe" — pairs with the agent id
} as const;

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

/* ─────────────────────────────────────────── live mode ───── */

/** Sender block — our warehouse. Address sourced from verified Biomax
 *  contact info (Eken Hälsobutik / Kållered). Kept in code rather than
 *  env because it never changes per-deploy and a wrong sender address
 *  on a label is a silent fulfilment failure we'd rather catch in
 *  review than in prod config. */
const CONSIGNOR = {
  name: "Biomax HB",
  street: "Ekenleden 15A",
  postalCode: "42836",
  city: "Kållered",
  countryCode: "SE",
  email: "kontakt@biomax.nu",
} as const;

type PostNordParcel = { id?: string; itemId?: string };
type PostNordShipmentResponse = {
  // PostNord returns the booked shipment with parcels carrying the
  // trackable itemId, plus the label as base64. Field names follow
  // Shipment v3; we read defensively because the gateway has shipped
  // minor casing variants across versions.
  shipmentId?: string;
  id?: string;
  parcels?: PostNordParcel[];
  labelData?: string; // base64 PDF
  labelUrl?: string; // some agreements return a fetch URL instead
};

function buildShipmentRequest(input: BookShipmentInput) {
  const toServicePoint = Boolean(input.servicePointId);
  const a = input.shippingAddress;
  return {
    messageDate: new Date().toISOString(),
    messageFunction: "Instruction",
    customerNumber: process.env.POSTNORD_CUSTOMER_NUMBER,
    shipment: [
      {
        // Our order number doubles as the shipment reference so the
        // PostNord portal and our admin line up 1:1.
        shipmentIdentifier: { shipmentId: input.orderNumber },
        dateAndTimes: { loadingDate: new Date().toISOString().slice(0, 10) },
        service: {
          basicServiceCode: toServicePoint
            ? SERVICE.servicePoint
            : SERVICE.home,
          ...(toServicePoint
            ? {
                additionalServiceCode: [
                  {
                    serviceCode: SERVICE.agentService,
                    servicePoint: { servicePointId: input.servicePointId },
                  },
                ],
              }
            : {}),
        },
        payer: {
          // Billing party from the shipping agreement.
          partyIdentification: {
            partyId: process.env.POSTNORD_PAYER_NUMBER,
            partyIdType: "PNCUSTNO",
          },
        },
        consignor: {
          issuerName: CONSIGNOR.name,
          partyIdentification: {
            partyId: process.env.POSTNORD_CUSTOMER_NUMBER,
            partyIdType: "PNCUSTNO",
          },
          address: {
            name: CONSIGNOR.name,
            streetName: CONSIGNOR.street,
            postalCode: CONSIGNOR.postalCode,
            city: CONSIGNOR.city,
            countryCode: CONSIGNOR.countryCode,
          },
          contact: { email: CONSIGNOR.email },
        },
        consignee: {
          address: {
            name: a.fullName,
            streetName: a.street,
            postalCode: a.postalCode.replace(/\s+/g, ""),
            city: a.city,
            countryCode: a.countryCode || "SE",
          },
          contact: {
            email: a.email,
            ...(a.phone ? { phoneNo: a.phone } : {}),
          },
        },
        parcels: [
          {
            // PostNord rejects 0 g; the action layer already floors
            // this, but clamp again so a bad caller can't 400 us.
            weight: Math.max(input.weightGrams, 1),
            contents: "Kosttillskott",
          },
        ],
      },
    ],
  };
}

/**
 * Persist a base64 PDF (or a fetched label URL) under
 * `public/labels/<orderNumber>.pdf` and return the public path.
 *
 * Note: on ephemeral/serverless hosts the public dir isn't durable
 * across deploys. For Biomax's standalone Node deploy the dir persists;
 * if we move to serverless, swap this for object storage + a route
 * handler. The label is also always re-fetchable from PostNord by
 * shipment id, so a lost local copy is recoverable, not fatal.
 */
async function persistLabel(
  orderNumber: string,
  opts: { base64?: string; url?: string }
): Promise<string | null> {
  let bytes: Buffer | null = null;
  if (opts.base64) {
    bytes = Buffer.from(opts.base64, "base64");
  } else if (opts.url) {
    const res = await fetch(opts.url);
    if (!res.ok) return null;
    bytes = Buffer.from(await res.arrayBuffer());
  }
  if (!bytes || bytes.length === 0) return null;

  // Sanitise: order numbers are our own format (BMX-YYYYMMDD-NNNN) but
  // never trust an identifier in a filesystem path.
  const safe = orderNumber.replace(/[^A-Za-z0-9_-]/g, "_");
  const dir = path.join(process.cwd(), "public", "labels");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${safe}.pdf`), bytes);
  return `/labels/${safe}.pdf`;
}

async function liveBookShipment(
  input: BookShipmentInput
): Promise<BookShipmentResult> {
  const url = new URL(SHIPMENT_BASE_URL);
  url.searchParams.set("apikey", process.env.POSTNORD_API_KEY!);

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(buildShipmentRequest(input)),
      // Booking is a write — never serve a cached response.
      cache: "no-store",
    });
  } catch (err) {
    return {
      ok: false,
      error: `PostNord onåbar: ${err instanceof Error ? err.message : "nätverksfel"}`,
    };
  }

  const rawBody = await res.text();
  if (!res.ok) {
    // PostNord error bodies are usually JSON with a message; fall back
    // to the raw text + status so the admin sees something actionable.
    let detail = rawBody.slice(0, 300);
    try {
      const j = JSON.parse(rawBody);
      detail = j.message || j.error || j.faultMessage || detail;
    } catch {
      /* keep raw text */
    }
    return {
      ok: false,
      error: `PostNord avvisade bokningen (${res.status}): ${detail}`,
    };
  }

  let data: PostNordShipmentResponse;
  try {
    data = JSON.parse(rawBody) as PostNordShipmentResponse;
  } catch {
    return {
      ok: false,
      error: "PostNord svarade med oväntat format (kunde inte tolka JSON).",
    };
  }

  const trackingNumber =
    data.parcels?.find((p) => p.itemId || p.id)?.itemId ??
    data.parcels?.[0]?.id ??
    data.shipmentId ??
    data.id ??
    null;
  if (!trackingNumber) {
    return {
      ok: false,
      error:
        "PostNord skapade ingen spårbar försändelse (inget itemId i svaret).",
    };
  }

  // Label is best-effort: a missing PDF shouldn't fail the booking —
  // the parcel exists at PostNord and the label is re-fetchable. The
  // admin just won't get a one-click print until a re-book.
  let labelPdfUrl: string | null = null;
  try {
    labelPdfUrl = await persistLabel(input.orderNumber, {
      base64: data.labelData,
      url: data.labelUrl,
    });
  } catch (err) {
    console.error(
      `[postnord] label persist failed for ${input.orderNumber}:`,
      err
    );
  }

  return {
    ok: true,
    trackingNumber,
    labelPdfUrl,
    carrier: "POSTNORD",
    stub: false,
  };
}

/* ───────────────────────── Option C — fraktsedel ──────────────────
 * ADR 0020 TMS route: KSA/TMS already pre-books the shipment with
 * PostNord at checkout. We do NOT create a consignment (that would
 * double-book). We only fetch the *fraktsedel* PDF for the existing
 * item id (the KSA tracking number) via PostNord's label-by-ids
 * endpoint, and let PostNord host it (`storeLabel=true`).
 *
 * Auth: just the apikey — no customer/payer numbers needed for label
 * retrieval (those were for booking). Env-gated: no key → stub.
 *
 * Spec: POST /rest/shipment/v3/labels/ids/pdf (Booking APIs swagger).
 * ────────────────────────────────────────────────────────────────── */

const LABEL_BASE_URL =
  process.env.POSTNORD_LABEL_BASE_URL ??
  "https://api2.postnord.com/rest/shipment/v3/labels/ids/pdf";

export function isPostNordLabelConfigured(): boolean {
  return Boolean(process.env.POSTNORD_API_KEY);
}

export type FetchLabelResult =
  | { ok: true; labelPdfUrl: string | null; stub: boolean }
  | { ok: false; error: string };

type PostNordLabelPrintout = {
  printout?: {
    uriStoreLabel?: string;
    uriResource?: string;
    data?: string;
    dataValue?: string;
  };
};

export async function fetchOrderLabel(input: {
  orderNumber: string;
  /** The PostNord item id = the KSA tracking number on the order. */
  trackingNumber: string;
}): Promise<FetchLabelResult> {
  if (!isPostNordLabelConfigured()) {
    // Dev / not-yet-provisioned: no real label, mirrors booking stub.
    return { ok: true, labelPdfUrl: null, stub: true };
  }
  if (!input.trackingNumber || input.trackingNumber.startsWith(STUB_TRACKING_PREFIX)) {
    return {
      ok: false,
      error: "Saknar PostNord-id för försändelsen (ingen fraktsedel kan hämtas).",
    };
  }

  const url = new URL(LABEL_BASE_URL);
  url.searchParams.set("apikey", process.env.POSTNORD_API_KEY!);
  // PostNord hosts the PDF and returns a durable URL — no local file.
  url.searchParams.set("storeLabel", "true");
  url.searchParams.set("definePrintout", "onlyFraktsedel");

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify([
        { id: input.trackingNumber, labelType: "standard" },
      ]),
      cache: "no-store",
    });
  } catch (err) {
    return {
      ok: false,
      error: `PostNord onåbar: ${err instanceof Error ? err.message : "nätverksfel"}`,
    };
  }

  const rawBody = await res.text();
  if (!res.ok) {
    let detail = rawBody.slice(0, 300);
    try {
      const j = JSON.parse(rawBody);
      detail = j.message || j.error || j.faultMessage || detail;
    } catch {
      /* keep raw text */
    }
    return {
      ok: false,
      error: `PostNord avvisade fraktsedeln (${res.status}): ${detail}`,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return {
      ok: false,
      error: "PostNord svarade med oväntat format (kunde inte tolka JSON).",
    };
  }

  // Response is the labelPrintout array; some gateways wrap it in an
  // object. Read defensively (cf. the booking-response handling above).
  const arr: PostNordLabelPrintout[] = Array.isArray(parsed)
    ? (parsed as PostNordLabelPrintout[])
    : ((parsed as { labelPrintout?: PostNordLabelPrintout[] })
        .labelPrintout ?? []);
  const printout = arr.find((p) => p.printout)?.printout;
  if (!printout) {
    return {
      ok: false,
      error: "PostNord returnerade ingen fraktsedel för försändelsen.",
    };
  }

  // Prefer PostNord's hosted URL; fall back to persisting base64.
  if (printout.uriStoreLabel) {
    return { ok: true, labelPdfUrl: printout.uriStoreLabel, stub: false };
  }
  const labelPdfUrl = await persistLabel(input.orderNumber, {
    base64: printout.data ?? printout.dataValue,
    url: printout.uriResource,
  });
  if (!labelPdfUrl) {
    return {
      ok: false,
      error: "Fraktsedeln kunde inte sparas (tomt svar från PostNord).",
    };
  }
  return { ok: true, labelPdfUrl, stub: false };
}
