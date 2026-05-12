"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  product: {
    id: string;
    slug: string;
    name: string;
    imageUrl: string;
    price: string;
  };
  quantity?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Show "Tillagd ✓" briefly after adding. Default true. */
  showFeedback?: boolean;
  /** Optional label override. Default "Lägg i varukorg". */
  label?: string;
};

export function AddToCartButton({
  product,
  quantity = 1,
  size = "md",
  className,
  showFeedback = true,
  label = "Lägg i varukorg",
}: Props) {
  const add = useCart((s) => s.add);
  const [justAdded, setJustAdded] = useState(false);

  function handleClick() {
    add(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        imageUrl: product.imageUrl,
        price: product.price,
      },
      quantity
    );
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
      className={cn("min-w-[180px]", className)}
    >
      {justAdded ? "Tillagd ✓" : label}
    </Button>
  );
}
