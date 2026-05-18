"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { requestStockNotification } from "@/lib/stock-notifications/actions";

type Status =
  | { kind: "idle" }
  | { kind: "open" }
  | { kind: "success" }
  | { kind: "error"; message: string };

/**
 * Out-of-stock "notifiera mig"-affordance. Stays collapsed as a single
 * button until the user clicks; expands to an inline email form; on
 * success morphs into a confirmation pill so the customer can leave the
 * page without wondering whether it took.
 */
export function NotifyMeButton({
  productSlug,
  defaultEmail = "",
}: {
  productSlug: string;
  defaultEmail?: string;
}) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [email, setEmail] = useState(defaultEmail);
  const [pending, start] = useTransition();

  if (status.kind === "success") {
    return (
      <div
        role="status"
        className="rounded-xl border border-accent-deep/40 bg-accent/8 px-5 py-4 max-w-[440px]"
      >
        <p className="font-sans text-body text-primary-deep font-semibold">
          ✓ Vi hör av oss så fort den är tillbaka
        </p>
        <p className="mt-1 font-sans text-caption text-ink-mute">
          Vi får hem nya partier i omgångar. Lagret är begränsat — det säljer
          ofta slut snabbt.
        </p>
      </div>
    );
  }

  if (status.kind === "idle") {
    return (
      <Button
        type="button"
        size="lg"
        variant="outline"
        onClick={() => setStatus({ kind: "open" })}
        className="min-w-[220px]"
      >
        Notifiera mig när tillbaka
      </Button>
    );
  }

  function submit() {
    start(async () => {
      const result = await requestStockNotification({ productSlug, email });
      if (!result.ok) {
        setStatus({ kind: "error", message: result.error });
        return;
      }
      setStatus({ kind: "success" });
    });
  }

  return (
    <div className="max-w-[440px]">
      <label
        htmlFor="notify-me-email"
        className="block font-sans text-caption font-semibold text-ink-soft mb-1.5"
      >
        Din e-postadress
      </label>
      <div className="flex items-center gap-2">
        <Input
          id="notify-me-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="namn@exempel.se"
          disabled={pending}
          required
        />
        <Button
          type="button"
          size="md"
          onClick={submit}
          disabled={pending || !email}
        >
          {pending ? "Sparar…" : "Bevaka"}
        </Button>
      </div>
      <p className="mt-2 font-sans text-micro text-ink-soft leading-snug">
        Vi hör av oss en gång när produkten är tillbaka — inget mer.
        Adressen används inte till något annat.
      </p>
      {status.kind === "error" && (
        <p
          role="alert"
          className="mt-2 font-sans text-caption text-status-error bg-status-error/10 px-3 py-2 rounded-md"
        >
          {status.message}
        </p>
      )}
    </div>
  );
}
