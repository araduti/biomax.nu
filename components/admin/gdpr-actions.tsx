"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  exportCustomerData,
  anonymizeCustomer,
} from "@/lib/admin/gdpr-actions";

/**
 * GDPR self-service buttons for /admin/kunder/[id].
 *
 *   - Article 15 (export): generates a JSON blob server-side, returns
 *     it inline, and the browser saves via a temporary blob URL.
 *   - Article 17 (anonymisation): two-step confirm. Irreversible —
 *     orders are kept (Bokföringslagen) but stripped of identifiers.
 */
export function GdprActions({ userId }: { userId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const router = useRouter();

  function doExport() {
    setError(null);
    start(async () => {
      const result = await exportCustomerData({ userId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const blob = new Blob([result.payload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }

  function doAnonymize() {
    setError(null);
    start(async () => {
      const result = await anonymizeCustomer({ userId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      setConfirming(false);
      setConfirmText("");
    });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Article 15 — export */}
      <div className="bg-surface-alt border border-border rounded-xl p-5">
        <p className="font-display text-base font-medium text-primary-deep mb-1">
          Exportera all data
        </p>
        <p className="font-sans text-[12.5px] text-ink-mute mb-4 leading-relaxed">
          Skickar tillbaka en JSON-fil med konto, beställningar, recensioner,
          prenumerationer, adresser och samtycken. Uppfyller artikel 15.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={doExport}
          disabled={pending}
        >
          {pending ? "Förbereder…" : "Ladda ner JSON"}
        </Button>
      </div>

      {/* Article 17 — anonymisation */}
      <div className="bg-surface-alt border border-border rounded-xl p-5">
        <p className="font-display text-base font-medium text-primary-deep mb-1">
          Anonymisera kund
        </p>
        <p className="font-sans text-[12.5px] text-ink-mute mb-4 leading-relaxed">
          Tar bort all personlig data. Beställningar bevaras (bokföringslagen)
          men knyts till en anonym sentinel. Detta går inte att ångra.
        </p>
        {!confirming ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setConfirming(true)}
          >
            Påbörja anonymisering
          </Button>
        ) : (
          <div>
            <p className="font-sans text-[12.5px] text-ink-body mb-2">
              Skriv <strong>ANONYMISERA</strong> för att bekräfta:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-3 py-2 mb-3 bg-surface border border-border rounded-md font-sans text-[14px] text-ink-body focus:outline-none focus:border-accent"
              autoFocus
              disabled={pending}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={doAnonymize}
                disabled={pending || confirmText !== "ANONYMISERA"}
                className="px-3 py-1.5 rounded-md bg-status-error text-surface hover:bg-[#9F4630] disabled:opacity-40 disabled:cursor-not-allowed font-sans text-[13px] font-semibold transition-colors"
              >
                {pending ? "Anonymiserar…" : "Anonymisera"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirming(false);
                  setConfirmText("");
                  setError(null);
                }}
                disabled={pending}
                className="font-sans text-[13px] text-ink-soft hover:text-ink-body"
              >
                Avbryt
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="md:col-span-2 font-sans text-[12.5px] text-status-error"
        >
          {error}
        </p>
      )}
    </div>
  );
}
