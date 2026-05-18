"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  exportMyData,
  deleteMyAccount,
} from "@/lib/account/gdpr-self-service";

/**
 * Customer self-service GDPR panel for /konto/dataskydd (ADR 0025).
 *
 *   - Article 15 + 20: download all my data as JSON.
 *   - Article 17: delete my account. Typed-confirm; irreversible. The
 *     server anonymises (orders kept under bokföringslagen) and kills
 *     the session; we then sign out + redirect home.
 *
 * Neither action sends an id — the server derives the user from the
 * session, so a customer can only ever act on their own account.
 */
export function DataProtectionPanel() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const router = useRouter();

  function doExport() {
    setError(null);
    start(async () => {
      const result = await exportMyData();
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

  function doDelete() {
    setError(null);
    start(async () => {
      const result = await deleteMyAccount({ confirmation: confirmText });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Session is already invalidated server-side; clear the client
      // cookie and leave the account area.
      await signOut().catch(() => {});
      router.push("/?konto=raderat");
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-surface-alt border border-border rounded-xl p-5">
        <p className="font-display text-base font-medium text-primary-deep mb-1">
          Ladda ner mina uppgifter
        </p>
        <p className="font-sans text-caption text-ink-mute mb-4 leading-relaxed">
          En JSON-fil med ditt konto, dina beställningar, recensioner,
          prenumerationer, adresser och samtycken. Detta är ditt
          registerutdrag (artikel 15) i ett maskinläsbart format
          (artikel 20).
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

      <div className="bg-surface-alt border border-border rounded-xl p-5">
        <p className="font-display text-base font-medium text-primary-deep mb-1">
          Radera mitt konto
        </p>
        <p className="font-sans text-caption text-ink-mute mb-4 leading-relaxed">
          Tar bort dina personuppgifter och loggar ut dig. Genomförda
          beställningar sparas i sju år enligt bokföringslagen men knyts
          inte längre till dig. Detta går inte att ångra.
        </p>
        {!confirming ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setConfirming(true)}
          >
            Radera konto
          </Button>
        ) : (
          <div>
            <p className="font-sans text-caption text-ink-body mb-2">
              Skriv <strong>RADERA</strong> för att bekräfta:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-3 py-2 mb-3 bg-surface border border-border rounded-md font-sans text-body text-ink-body focus:outline-none focus:border-accent"
              autoFocus
              disabled={pending}
              aria-label='Skriv "RADERA" för att bekräfta'
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={doDelete}
                disabled={pending || confirmText !== "RADERA"}
                className="px-3 py-1.5 rounded-md bg-status-error text-surface hover:bg-[#9F4630] disabled:opacity-40 disabled:cursor-not-allowed font-sans text-small font-semibold transition-colors"
              >
                {pending ? "Raderar…" : "Radera permanent"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirming(false);
                  setConfirmText("");
                  setError(null);
                }}
                disabled={pending}
                className="font-sans text-small text-ink-soft hover:text-ink-body"
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
          className="md:col-span-2 font-sans text-caption text-status-error"
        >
          {error}
        </p>
      )}
    </div>
  );
}
