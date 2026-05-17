"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 10) {
      setError("Lösenordet behöver vara minst 10 tecken.");
      return;
    }
    if (password !== confirm) {
      setError("Lösenorden matchar inte.");
      return;
    }
    if (!token) {
      setError("Återställningslänken saknar token. Begär en ny.");
      return;
    }
    setPending(true);
    const result = await authClient.resetPassword({ newPassword: password, token });
    setPending(false);
    if (result.error) {
      setError(result.error.message ?? "Något gick fel. Försök igen.");
      return;
    }
    router.push("/logga-in");
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
        label="Nytt lösenord"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={10}
        hint="Minst 10 tecken."
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Input
        label="Bekräfta lösenord"
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
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
        {pending ? "Sparar…" : "Spara nytt lösenord"}
      </Button>
    </form>
  );
}
