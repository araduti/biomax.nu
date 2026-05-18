"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { promoteToAdmin, demoteAdmin } from "@/lib/admin/team-actions";

type AdminRow = {
  id: string;
  email: string;
  name: string;
  twoFactorEnabled: boolean;
  isSelf: boolean;
};

export function TeamManager({ admins }: { admins: AdminRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onlyOneAdmin = admins.length <= 1;

  function run(fn: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        setEmail("");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-8">
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-status-error/40 bg-status-error/10 px-4 py-3 font-sans text-sm text-status-error"
        >
          {error}
        </p>
      )}
      {/* Current admins */}
      <section>
        <h2 className="font-display text-lg font-medium text-ink mb-3">
          Nuvarande admins ({admins.length})
        </h2>
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface-alt">
          {admins.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-sans text-sm font-semibold text-ink truncate">
                  {a.name}
                  {a.isSelf && (
                    <span className="ml-2 font-normal text-ink-mute">
                      (du)
                    </span>
                  )}
                </p>
                <p className="font-sans text-small text-ink-mute truncate">
                  {a.email}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {a.twoFactorEnabled ? (
                  <span className="font-sans text-caption font-semibold text-status-ok">
                    2FA på
                  </span>
                ) : (
                  <span
                    className="font-sans text-caption font-semibold text-status-warn-text"
                    title="Får inte åtkomst till panelen förrän 2FA är aktiverat"
                  >
                    2FA saknas
                  </span>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  disabled={pending || a.isSelf || onlyOneAdmin}
                  title={
                    a.isSelf
                      ? "Du kan inte ta bort din egen behörighet"
                      : onlyOneAdmin
                        ? "Det måste finnas minst en admin"
                        : undefined
                  }
                  onClick={() => {
                    if (
                      window.confirm(
                        `Ta bort adminbehörighet för ${a.email}?`
                      )
                    ) {
                      run(() => demoteAdmin(a.id));
                    }
                  }}
                >
                  Ta bort admin
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-2 font-sans text-caption text-ink-mute">
          &ldquo;2FA saknas&rdquo; betyder att personen blir ombedd att
          aktivera tvåfaktorsinloggning innan adminpanelen öppnas.
        </p>
      </section>

      {/* Promote */}
      <section>
        <h2 className="font-display text-lg font-medium text-ink mb-1">
          Gör en användare till admin
        </h2>
        <p className="font-sans text-small text-ink-mute mb-3">
          Personen måste redan ha ett konto. Hen behöver aktivera
          tvåfaktorsinloggning vid första inloggningen till panelen.
        </p>
        <form
          className="flex flex-col sm:flex-row gap-3 sm:items-center"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => promoteToAdmin(email));
          }}
        >
          <Input
            type="email"
            required
            placeholder="namn@biomax.nu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="sm:max-w-[320px]"
            autoComplete="off"
          />
          <Button type="submit" disabled={pending || !email.trim()}>
            {pending ? "Sparar…" : "Gör till admin"}
          </Button>
        </form>
      </section>
    </div>
  );
}
