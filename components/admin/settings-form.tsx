"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  updateShippingRules,
  updateLowStockDefault,
} from "@/lib/admin/settings-actions";

export function SettingsForm({
  initialFlatSek,
  initialFreeThresholdSek,
  initialLowStockDefault,
}: {
  initialFlatSek: number;
  initialFreeThresholdSek: number | null;
  initialLowStockDefault: number;
}) {
  const router = useRouter();
  const [flatSek, setFlatSek] = useState(String(initialFlatSek));
  const [freeThreshold, setFreeThreshold] = useState(
    initialFreeThresholdSek === null ? "" : String(initialFreeThresholdSek)
  );
  const [lowStock, setLowStock] = useState(String(initialLowStockDefault));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pendingShipping, startShipping] = useTransition();
  const [pendingStock, startStock] = useTransition();

  function saveShipping() {
    setError(null);
    setSaved(null);
    const flat = parseInt(flatSek, 10);
    const threshold = freeThreshold === "" ? null : parseInt(freeThreshold, 10);
    if (!Number.isFinite(flat) || flat < 0) {
      setError("Ogiltig fraktavgift.");
      return;
    }
    if (threshold !== null && (!Number.isFinite(threshold) || threshold < 0)) {
      setError("Ogiltig fri-frakt-tröskel.");
      return;
    }
    startShipping(async () => {
      const result = await updateShippingRules({
        flatSek: flat,
        freeThresholdSek: threshold,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved("Frakt sparad");
      setTimeout(() => setSaved(null), 2000);
      router.refresh();
    });
  }

  function saveStock() {
    setError(null);
    setSaved(null);
    const n = parseInt(lowStock, 10);
    if (!Number.isFinite(n) || n < 0) {
      setError("Ogiltigt värde.");
      return;
    }
    startStock(async () => {
      const result = await updateLowStockDefault(n);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved("Lagertröskel sparad");
      setTimeout(() => setSaved(null), 2000);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section className="bg-surface-alt border border-border rounded-2xl p-6 md:p-8">
        <h2 className="font-display text-xl font-medium tracking-tight text-primary-deep mb-1">
          Frakt
        </h2>
        <p className="font-sans text-[13px] text-ink-mute leading-relaxed mb-5">
          Standard fraktavgift och eventuell fri-frakt-tröskel. Lämna
          tröskeln tom för att aldrig erbjuda fri frakt.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Fraktavgift (SEK)"
            type="number"
            min="0"
            value={flatSek}
            onChange={(e) =>
              setFlatSek(e.target.value.replace(/[^0-9]/g, ""))
            }
            disabled={pendingShipping}
          />
          <Input
            label="Fri frakt över (SEK)"
            type="number"
            min="0"
            value={freeThreshold}
            onChange={(e) =>
              setFreeThreshold(e.target.value.replace(/[^0-9]/g, ""))
            }
            disabled={pendingShipping}
            hint="Tom = aldrig fri frakt."
          />
        </div>
        <div className="mt-5">
          <Button
            type="button"
            size="sm"
            onClick={saveShipping}
            disabled={pendingShipping}
          >
            {pendingShipping ? "Sparar…" : "Spara frakt"}
          </Button>
        </div>
      </section>

      <section className="bg-surface-alt border border-border rounded-2xl p-6 md:p-8">
        <h2 className="font-display text-xl font-medium tracking-tight text-primary-deep mb-1">
          Lager
        </h2>
        <p className="font-sans text-[13px] text-ink-mute leading-relaxed mb-5">
          Standard-tröskel för &quot;Få kvar&quot;-markeringen i admin när en
          enskild produkt inte har egen tröskel.
        </p>
        <div className="max-w-[260px]">
          <Input
            label="Standard-tröskel"
            type="number"
            min="0"
            value={lowStock}
            onChange={(e) =>
              setLowStock(e.target.value.replace(/[^0-9]/g, ""))
            }
            disabled={pendingStock}
          />
        </div>
        <div className="mt-5">
          <Button
            type="button"
            size="sm"
            onClick={saveStock}
            disabled={pendingStock}
          >
            {pendingStock ? "Sparar…" : "Spara lagertröskel"}
          </Button>
        </div>
      </section>

      {error && (
        <p
          role="alert"
          className="font-sans text-[12.5px] text-[#B5523B] bg-[#B5523B]/10 px-3 py-2 rounded-md"
        >
          {error}
        </p>
      )}
      {saved && (
        <p
          role="status"
          className="font-sans text-[12.5px] text-accent-deep font-semibold"
        >
          ✓ {saved}
        </p>
      )}
    </div>
  );
}
