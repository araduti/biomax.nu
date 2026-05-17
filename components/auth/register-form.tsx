"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [accountExists, setAccountExists] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setAccountExists(false);
    if (password.length < 10) {
      setError("Lösenordet behöver vara minst 10 tecken.");
      return;
    }
    setPending(true);
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const result = await signUp.email({
      email: email.trim().toLowerCase(),
      password,
      name: fullName || email,
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
    });
    setPending(false);
    if (result.error) {
      const msg = result.error.message?.toLowerCase() ?? "";
      if (msg.includes("exist")) {
        setAccountExists(true);
        return;
      }
      setError(result.error.message ?? "Något gick fel. Försök igen.");
      return;
    }
    router.push("/konto");
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
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Förnamn"
          name="firstName"
          type="text"
          autoComplete="given-name"
          required
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        <Input
          label="Efternamn"
          name="lastName"
          type="text"
          autoComplete="family-name"
          required
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
      </div>
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
        autoComplete="new-password"
        required
        minLength={10}
        hint="Minst 10 tecken."
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {accountExists && (
        <div
          role="alert"
          className="font-sans text-[13px] text-primary-deep bg-surface-warm border border-border px-4 py-3 rounded-md leading-relaxed"
        >
          <strong className="font-semibold">Ett konto finns redan.</strong>{" "}
          Är detta ditt gamla Biomax-konto? Sätt ett nytt lösenord via{" "}
          <Link
            href={`/glomt-losenord?email=${encodeURIComponent(email)}`}
            className="underline font-semibold text-primary hover:text-primary-deep"
          >
            Glömt lösenord
          </Link>{" "}
          eller{" "}
          <Link
            href={`/logga-in?email=${encodeURIComponent(email)}`}
            className="underline font-semibold text-primary hover:text-primary-deep"
          >
            logga in
          </Link>{" "}
          om du redan vet ditt lösenord.
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="font-sans text-[13px] text-status-error bg-status-error/10 px-3 py-2 rounded-md"
        >
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="mt-2 w-full">
        {pending ? "Skapar konto…" : "Skapa konto"}
      </Button>
      <p className="text-center font-sans text-[12px] text-ink-soft mt-1 leading-relaxed">
        Genom att skapa ett konto godkänner du våra{" "}
        <a href="/villkor" className="underline hover:text-primary">
          köpvillkor
        </a>{" "}
        och{" "}
        <a href="/integritet" className="underline hover:text-primary">
          integritetspolicy
        </a>
        .
      </p>
    </form>
  );
}
