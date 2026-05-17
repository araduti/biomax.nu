"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { promoteToAdmin, demoteAdmin } from "@/lib/admin/team-actions";

/**
 * Inline role control on the customer detail page. Thin wrapper over the
 * same guarded server actions as /admin/team (self-demote and
 * last-admin protection live server-side).
 */
export function CustomerRoleControl({
  userId,
  email,
  isAdmin,
  isSelf,
}: {
  userId: string;
  email: string;
  isAdmin: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function act(fn: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  return (
    <div className="mb-8 flex flex-wrap items-center gap-3">
      {isAdmin ? (
        <Button
          type="button"
          variant="ghost"
          disabled={pending || isSelf}
          title={
            isSelf ? "Du kan inte ta bort din egen behörighet" : undefined
          }
          onClick={() => {
            if (window.confirm(`Ta bort adminbehörighet för ${email}?`)) {
              act(() => demoteAdmin(userId));
            }
          }}
        >
          Ta bort adminbehörighet
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => {
            if (window.confirm(`Ge ${email} full adminbehörighet?`)) {
              act(() => promoteToAdmin(email));
            }
          }}
        >
          Gör till admin
        </Button>
      )}
      {error && (
        <span role="alert" className="font-sans text-[13px] text-status-error">
          {error}
        </span>
      )}
    </div>
  );
}
