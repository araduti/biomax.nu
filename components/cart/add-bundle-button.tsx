"use client";

import { useState } from "react";
import { useCart, type AddBundleInput } from "@/lib/cart-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  bundle: AddBundleInput;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Show "Tillagd ✓" briefly after adding. Default true. */
  showFeedback?: boolean;
  label?: string;
};

/**
 * Adds every product in a bundle to the cart in one click, each tagged
 * with the bundle's id + discount %. The cart subtotal applies the
 * discount across the group; the server re-validates at order time.
 */
export function AddBundleButton({
  bundle,
  size = "md",
  className,
  showFeedback = true,
  label = "Lägg paket i varukorgen",
}: Props) {
  const addBundle = useCart((s) => s.addBundle);
  const [justAdded, setJustAdded] = useState(false);

  function handleClick() {
    addBundle(bundle);
    if (showFeedback) {
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1500);
    }
  }

  return (
    <Button
      type="button"
      size={size}
      onClick={handleClick}
      className={cn("min-w-[220px]", className)}
    >
      {justAdded ? "Tillagd ✓" : label}
    </Button>
  );
}
