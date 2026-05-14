"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  updateShippingRules,
  updateLowStockDefault,
  updateWarehouseAlertEmails,
  updateTrustpilotSummary,
} from "@/lib/admin/settings-actions";

export function SettingsForm({
  initialFlatSek,
  initialFreeThresholdSek,
  initialLowStockDefault,
  initialWarehouseEmails,
  initialTrustpilot,
}: {
  initialFlatSek: number;
  initialFreeThresholdSek: number | null;
  initialLowStockDefault: number;
  initialWarehouseEmails: string;
  initialTrustpilot: {
    rating: number | null;
    reviewCount: number | null;
    profileUrl: string;
  };
}) {
  const router = useRouter();
  const [flatSek, setFlatSek] = useState(String(initialFlatSek));
  const [freeThreshold, setFreeThreshold] = useState(
    initialFreeThresholdSek === null ? "" : String(initialFreeThresholdSek)
  );
  const [lowStock, setLowStock] = useState(String(initialLowStockDefault));
  const [warehouseEmails, setWarehouseEmails] = useState(
    initialWarehouseEmails
  );
  const [tpRating, setTpRating] = useState(
    initialTrustpilot.rating === null
      ? ""
      : initialTrustpilot.rating.toString().replace(".", ",")
  );
  const [tpReviewCount, setTpReviewCount] = useState(
    initialTrustpilot.reviewCount === null
      ? ""
      : String(initialTrustpilot.reviewCount)
  );
  const [tpProfileUrl, setTpProfileUrl] = useState(initialTrustpilot.profileUrl);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pendingShipping, startShipping] = useTransition();
  const [pendingStock, startStock] = useTransition();
  const [pendingWarehouse, startWarehouse] = useTransition();
  const [pendingTrustpilot, startTrustpilot] = useTransition();

  function flashSaved(label: string) {
    setSaved(label);
    setTimeout(() => setSaved(null), 2000);
  }

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
      flashSaved("Frakt sparad");
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
      flashSaved("Lagertröskel sparad");
      router.refresh();
    });
  }

  function saveWarehouse() {
    setError(null);
    setSaved(null);
    startWarehouse(async () => {
      const result = await updateWarehouseAlertEmails({
        emails: warehouseEmails,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      flashSaved("Lagerlarms-adresser sparade");
      router.refresh();
    });
  }

  function saveTrustpilot() {
    setError(null);
    setSaved(null);
    startTrustpilot(async () => {
      const result = await updateTrustpilotSummary({
        rating: tpRating,
        reviewCount: tpReviewCount,
        profileUrl: tpProfileUrl,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      flashSaved("Trustpilot sparad");
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

      <section className="bg-surface-alt border border-border rounded-2xl p-6 md:p-8">
        <h2 className="font-display text-xl font-medium tracking-tight text-primary-deep mb-1">
          Lagerlarm
        </h2>
        <p className="font-sans text-[13px] text-ink-mute leading-relaxed mb-5">
          E-postadresser som tar emot det dagliga lagerlarmet (07:30 UTC).
          Flera adresser separeras med komma. Lämna tomt för att stänga av
          larmet.
        </p>
        <Input
          label="E-postadresser"
          value={warehouseEmails}
          onChange={(e) => setWarehouseEmails(e.target.value)}
          disabled={pendingWarehouse}
          hint="t.ex. lager@biomax.nu, kontakt@biomax.nu"
        />
        <div className="mt-5">
          <Button
            type="button"
            size="sm"
            onClick={saveWarehouse}
            disabled={pendingWarehouse}
          >
            {pendingWarehouse ? "Sparar…" : "Spara lagerlarm"}
          </Button>
        </div>
      </section>

      <section className="bg-surface-alt border border-border rounded-2xl p-6 md:p-8">
        <h2 className="font-display text-xl font-medium tracking-tight text-primary-deep mb-1">
          Trustpilot
        </h2>
        <p className="font-sans text-[13px] text-ink-mute leading-relaxed mb-5">
          Klistra in aktuellt betyg och antal omdömen från Trustpilot-panelen.
          Lämna tomt så visar vi en &quot;Läs våra omdömen&quot;-CTA istället
          för en påhittad siffra. (Automatisk uppdatering via API följer när
          vi tecknat Trustpilots betalda nivå.)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Betyg (0–5)"
            value={tpRating}
            onChange={(e) => setTpRating(e.target.value)}
            disabled={pendingTrustpilot}
            placeholder="t.ex. 4,4"
            hint="Decimaler med komma eller punkt."
          />
          <Input
            label="Antal omdömen"
            type="number"
            min="0"
            value={tpReviewCount}
            onChange={(e) =>
              setTpReviewCount(e.target.value.replace(/[^0-9]/g, ""))
            }
            disabled={pendingTrustpilot}
            placeholder="t.ex. 53"
          />
        </div>
        <div className="mt-4">
          <Input
            label="Profil-URL"
            value={tpProfileUrl}
            onChange={(e) => setTpProfileUrl(e.target.value)}
            disabled={pendingTrustpilot}
            hint="Länken som hero-strippen och footern pekar på."
          />
        </div>
        <div className="mt-5">
          <Button
            type="button"
            size="sm"
            onClick={saveTrustpilot}
            disabled={pendingTrustpilot}
          >
            {pendingTrustpilot ? "Sparar…" : "Spara Trustpilot"}
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
