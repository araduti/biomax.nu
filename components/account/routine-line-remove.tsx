"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeFromRoutine } from "@/lib/routine/actions";

export function RoutineLineRemove({ productId }: { productId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        setError(null);
        start(async () => {
          const r = await removeFromRoutine(productId);
          if (!r.ok) {
            setError(r.error);
            return;
          }
          router.refresh();
        });
      }}
      disabled={pending}
      className="mt-2 font-sans text-caption text-ink-soft hover:text-status-error transition-colors"
    >
      {pending ? "Tar bort…" : error ? error : "Ta bort"}
    </button>
  );
}
