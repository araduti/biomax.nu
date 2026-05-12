"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateProfile } from "@/lib/account/profile-actions";

export function ProfileForm({
  initial,
  email,
}: {
  initial: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  email: string;
}) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [phone, setPhone] = useState(initial.phone);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setPending(true);
    const result = await updateProfile({
      firstName,
      lastName,
      phone,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Förnamn"
          name="firstName"
          autoComplete="given-name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        <Input
          label="Efternamn"
          name="lastName"
          autoComplete="family-name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
        <Input
          label="E-post"
          name="email"
          type="email"
          value={email}
          disabled
          hint="E-post kan inte ändras här. Kontakta kontakt@biomax.nu om den behöver uppdateras."
          className="md:col-span-2"
        />
        <Input
          label="Telefon"
          name="phone"
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="md:col-span-2"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="mt-5 font-sans text-[13px] text-[#B5523B] bg-[#B5523B]/10 px-3 py-2 rounded-md"
        >
          {error}
        </p>
      )}
      {saved && (
        <p
          role="status"
          className="mt-5 font-sans text-[13px] text-accent-deep bg-accent/15 px-3 py-2 rounded-md"
        >
          Sparat ✓
        </p>
      )}

      <div className="mt-6">
        <Button type="submit" disabled={pending} size="md">
          {pending ? "Sparar…" : "Spara ändringar"}
        </Button>
      </div>
    </form>
  );
}
