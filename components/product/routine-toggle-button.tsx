"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { addToRoutine, removeFromRoutine } from "@/lib/routine/actions";

/**
 * Toggle for the customer's saved "Min rutin"-list (renames the legacy
 * wishlist surface — see lib/routine/actions.ts for the reframing
 * rationale). When the viewer is logged-out, clicking redirects to
 * /logga-in with a return URL so the action completes after sign-in
 * (TODO — for v1, we just show "Logga in för att spara").
 */
export function RoutineToggleButton({
  productId,
  productSlug,
  initiallySaved,
  loggedIn,
  size = "lg",
}: {
  productId: string;
  productSlug: string;
  initiallySaved: boolean;
  loggedIn: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const [saved, setSaved] = useState(initiallySaved);
  const [pending, start] = useTransition();
  const router = useRouter();

  function toggle() {
    if (!loggedIn) {
      router.push(
        `/logga-in?next=${encodeURIComponent(`/produkter/${productSlug}`)}`
      );
      return;
    }
    // Optimistic — flip first, revert on failure.
    const next = !saved;
    setSaved(next);
    start(async () => {
      const result = next
        ? await addToRoutine(productId)
        : await removeFromRoutine(productId);
      if (!result.ok) {
        setSaved(!next);
        console.error(result.error);
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      onClick={toggle}
      disabled={pending}
      aria-pressed={saved}
    >
      {saved ? "✓ I min rutin" : "Spara i min rutin"}
    </Button>
  );
}
