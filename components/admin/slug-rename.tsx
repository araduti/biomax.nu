"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { renameProductSlug } from "@/lib/admin/slug-actions";

/**
 * Self-contained slug rename. Sits outside the main form's dirty-tracking
 * because it has its own confirm flow (renames are visible to search engines
 * and to anyone with the URL bookmarked — not the same kind of edit as a
 * description tweak).
 */
export function SlugRename({ currentSlug }: { currentSlug: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState(currentSlug);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    const trimmed = next.trim().toLowerCase();
    if (!trimmed || trimmed === currentSlug) {
      setOpen(false);
      return;
    }
    if (
      !confirm(
        `Byta slug från "${currentSlug}" till "${trimmed}"? En 301-omdirigering läggs till automatiskt.`
      )
    )
      return;
    start(async () => {
      const result = await renameProductSlug(currentSlug, trimmed);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace(`/admin/produkter/${result.slug}`);
    });
  }

  if (!open) {
    return (
      <div className="flex items-center gap-3">
        <code className="font-mono text-[12.5px] text-ink-soft bg-surface-warm px-2 py-1 rounded">
          /produkter/{currentSlug}
        </code>
        <button
          type="button"
          onClick={() => {
            setNext(currentSlug);
            setOpen(true);
          }}
          className="font-sans text-[12px] text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent"
        >
          Byt slug
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[12.5px] text-ink-soft">/produkter/</span>
        <Input
          value={next}
          onChange={(e) =>
            setNext(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
          }
          autoFocus
          disabled={pending}
          className="max-w-[320px]"
        />
        <Button
          type="button"
          size="sm"
          onClick={submit}
          disabled={pending || next.trim() === currentSlug}
        >
          {pending ? "Byter…" : "Byt"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          disabled={pending}
        >
          Avbryt
        </Button>
      </div>
      <p className="mt-2 font-sans text-[11.5px] text-ink-soft leading-snug">
        En 301-omdirigering läggs till så att den gamla URL:en fortsätter
        fungera. Använd bara a–z, 0–9 och bindestreck.
      </p>
      {error && (
        <p
          role="alert"
          className="mt-2 font-sans text-[12px] text-status-error bg-status-error/10 px-3 py-1.5 rounded-md"
        >
          {error}
        </p>
      )}
    </div>
  );
}
