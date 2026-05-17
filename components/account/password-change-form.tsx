"use client";

import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PasswordChangeForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (next.length < 10) {
      setError("Nytt lösenord behöver vara minst 10 tecken.");
      return;
    }
    if (next !== confirm) {
      setError("Lösenorden matchar inte.");
      return;
    }
    setPending(true);
    const result = await authClient.changePassword({
      currentPassword: current,
      newPassword: next,
      revokeOtherSessions: true,
    });
    setPending(false);
    if (result.error) {
      const msg = result.error.message?.toLowerCase() ?? "";
      if (msg.includes("invalid") || msg.includes("incorrect"))
        setError("Nuvarande lösenord stämmer inte.");
      else setError(result.error.message ?? "Kunde inte uppdatera lösenord.");
      return;
    }
    setCurrent("");
    setNext("");
    setConfirm("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <form
      onSubmit={onSubmit}
      method="post"
      action="#"
      noValidate
      className="bg-surface-alt border border-border rounded-2xl p-6 md:p-8 max-w-[640px]"
    >
      <div className="flex flex-col gap-4">
        <Input
          label="Nuvarande lösenord"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <Input
          label="Nytt lösenord"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          hint="Minst 10 tecken."
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
        <Input
          label="Bekräfta nytt lösenord"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="mt-5 font-sans text-[13px] text-status-error bg-status-error/10 px-3 py-2 rounded-md"
        >
          {error}
        </p>
      )}
      {saved && (
        <p
          role="status"
          className="mt-5 font-sans text-[13px] text-accent-deep bg-accent/15 px-3 py-2 rounded-md"
        >
          Lösenord uppdaterat ✓ Andra sessioner är utloggade.
        </p>
      )}

      <div className="mt-6">
        <Button type="submit" disabled={pending} size="md">
          {pending ? "Uppdaterar…" : "Spara nytt lösenord"}
        </Button>
      </div>
    </form>
  );
}
