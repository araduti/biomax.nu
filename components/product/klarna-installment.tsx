import { formatPriceSEK } from "@/lib/format";

/**
 * Klarna inline messaging under the price — the Swedish-ecom pattern
 * (Apotea, Bodystore, Svensk Kosttillskott) of leading with the monthly
 * amount in bold and offering both "Pay later in 30 days" and "Dela upp"
 * as alternatives.
 *
 * Two modes:
 *
 * 1. **Stub mode** (no `NEXT_PUBLIC_KLARNA_CLIENT_ID`): hand-rolled
 *    markup with our own monthly calc. Directionally accurate, no live
 *    plan-shopping. Pay-later is shown whenever the price clears 50 kr
 *    (Klarna's typical Swedish minimum); installments show when the
 *    price clears 100 kr.
 *
 * 2. **Live mode**: render a `<klarna-placement>` web component pointed
 *    at the credit-promotion-auto-size placement. Stub code path
 *    documented inline; wire when the prod script is loaded.
 *
 * Server component — no client JS for v1.
 */
export function KlarnaInstallment({ priceSek }: { priceSek: number }) {
  const showPayLater = priceSek >= 50;
  const showInstallments = priceSek >= 100;
  if (!showPayLater && !showInstallments) return null;

  // 3 räntefria — the most universally available Swedish plan. Round up
  // so "från X kr/mån" is never an under-quote.
  const perInstallment = Math.ceil(priceSek / 3);

  // Live Klarna messaging would go here (wire when KLARNA_CLIENT_ID is
  // set + the prod on-site-messaging script is loaded in layout.tsx):
  //
  //   if (process.env.NEXT_PUBLIC_KLARNA_CLIENT_ID) {
  //     return (
  //       <klarna-placement
  //         data-key="credit-promotion-auto-size"
  //         data-locale="sv-SE"
  //         data-purchase-amount={Math.round(priceSek * 100).toString()}
  //       />
  //     );
  //   }

  return (
    <div className="mt-3 flex items-start gap-2.5 text-ink-mute">
      <KlarnaMark />
      <div className="font-sans text-caption leading-snug">
        {showInstallments ? (
          <p className="text-ink-body">
            Eller från{" "}
            <strong className="text-primary-deep">
              {formatPriceSEK(perInstallment.toString())}/mån
            </strong>{" "}
            i 3 räntefria delbetalningar
          </p>
        ) : (
          <p className="text-ink-body">
            Betala om 30 dagar — räntefritt med Klarna
          </p>
        )}
        {showInstallments && (
          <p className="text-ink-soft mt-0.5">
            eller betala om 30 dagar
          </p>
        )}
      </div>
    </div>
  );
}

/** Klarna wordmark — small pink-on-dark pill, brand-correct sizing. */
function KlarnaMark() {
  return (
    <span
      aria-label="Klarna"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#FFB3C7",
        color: "#17120F",
        fontFamily: "Helvetica, Arial, sans-serif",
        fontWeight: 700,
        fontSize: "10px",
        letterSpacing: "0.01em",
        padding: "3px 7px",
        borderRadius: "4px",
        lineHeight: 1,
        flexShrink: 0,
        marginTop: "1px",
      }}
    >
      Klarna.
    </span>
  );
}
