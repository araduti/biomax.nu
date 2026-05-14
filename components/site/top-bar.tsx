import { getShippingRules } from "@/lib/site/settings";
import { formatPriceSEK } from "@/lib/format";

/**
 * Utility bar — thin band above the main header.
 * Shipping signal · payment signal · account.
 *
 * Server component — reads the live `getShippingRules()` so the threshold
 * shown here can't drift from the cart / checkout / settings panel.
 */
export async function TopBar() {
  const { freeThresholdSek } = await getShippingRules();

  return (
    <div className="bg-primary-deep text-surface/80 text-xs">
      <div className="max-w-[1240px] mx-auto px-6 md:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 md:gap-6 tracking-wide">
          {freeThresholdSek !== null && (
            <>
              <span>Fri frakt över {formatPriceSEK(freeThresholdSek)}</span>
              <span aria-hidden className="opacity-40">
                ·
              </span>
            </>
          )}
          <span>Klarna · Faktura 30 dagar</span>
          <span aria-hidden className="hidden md:inline opacity-40">
            ·
          </span>
          <span className="hidden md:inline">Snabb leverans i hela Sverige</span>
        </div>
        <div className="flex items-center gap-5">
          <a href="/konto" className="hover:text-surface transition-colors">
            Mitt konto
          </a>
        </div>
      </div>
    </div>
  );
}
