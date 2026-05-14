"use client";

import { createContext, useContext } from "react";

/**
 * Client-side access to the active shipping rules.
 *
 * Server components read directly via `getShippingRules()` (the DB call).
 * Client components — cart drawer, cart page, checkout flow — can't be
 * async, so the layout fetches once and pipes the values down through
 * this context.
 *
 * Defaults match the static fallback in `lib/site/settings.ts` so SSR
 * before hydration doesn't flash a different number.
 */
export type ShippingConfig = {
  flatSek: number;
  freeThresholdSek: number | null;
};

const DEFAULT_CONFIG: ShippingConfig = {
  flatSek: 49,
  freeThresholdSek: 499,
};

const ShippingConfigContext = createContext<ShippingConfig>(DEFAULT_CONFIG);

export function useShippingConfig(): ShippingConfig {
  return useContext(ShippingConfigContext);
}

export function ShippingConfigProvider({
  value,
  children,
}: {
  value: ShippingConfig;
  children: React.ReactNode;
}) {
  return (
    <ShippingConfigContext.Provider value={value}>
      {children}
    </ShippingConfigContext.Provider>
  );
}
