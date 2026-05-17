"use client";

import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const result = await authClient.requestPasswordReset({
      email: email.trim().toLowerCase(),
      redirectTo: "/aterstall-losenord",
    });
    setPending(false);
    if (result.error) {
      setError(result.error.message ?? "Kunde inte skicka återställningslänk.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="text-center">
        <p className="font-display italic text-xl text-primary-deep mb-3">
          Brevet är skickat.
        </p>
        <p className="font-sans text-[14px] text-ink-mute leading-relaxed">
          Vi har skickat en länk till <strong>{email}</strong> där du kan välja ett
          nytt lösenord. Kolla även skräpkorgen om brevet inte syns inom några minuter.
        </p>
      </div>
    );
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
        hint="Vi skickar en länk där du kan välja nytt lösenord."
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
        {pending ? "Skickar…" : "Skicka återställningslänk"}
      </Button>
    </form>
  );
}
