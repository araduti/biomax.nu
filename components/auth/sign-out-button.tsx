"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function SignOutButton({
  variant = "outline",
  className,
}: {
  variant?: "primary" | "outline" | "ghost";
  className?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant={variant}
      size="sm"
      className={className}
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await signOut();
        router.push("/");
        router.refresh();
      }}
    >
      {pending ? "Loggar ut…" : "Logga ut"}
    </Button>
  );
}
