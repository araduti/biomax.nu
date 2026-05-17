"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/konto";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const result = await signIn.email({
      email: email.trim().toLowerCase(),
      password,
      callbackURL: redirect,
    });
    setPending(false);
    if (result.error) {
      setError(swedishAuthError(result.error.message));
      return;
    }
    router.push(redirect);
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      method="post"
      action="#"
      className="flex flex-col gap-4"
      noValidate
    >
      <Input
        label="E-post"
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        label="Lösenord"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && (
        <p
          role="alert"
          className="font-sans text-[13px] text-status-error bg-status-error/10 px-3 py-2 rounded-md"
        >
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="mt-2 w-full">
        {pending ? "Loggar in…" : "Logga in"}
      </Button>
      <Link
        href="/glomt-losenord"
        className="text-center font-sans text-[13px] text-primary hover:text-primary-deep transition-colors"
      >
        Glömt lösenord?
      </Link>
    </form>
  );
}

function swedishAuthError(msg: string | undefined): string {
  if (!msg) return "Något gick fel. Försök igen.";
  const lower = msg.toLowerCase();
  if (lower.includes("invalid") || lower.includes("incorrect"))
    return "Fel e-post eller lösenord.";
  if (lower.includes("exist")) return "Ett konto med den e-posten finns redan.";
  if (lower.includes("verify")) return "Verifiera din e-post först.";
  return msg;
}
